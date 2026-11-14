#!/usr/bin/env bash
# Applies new SQL files in supabase/migrations to the database, oldest first.
# Each file runs in one transaction together with its record in
# supabase_migrations.schema_migrations, so a failed file changes nothing and
# an applied file is never run twice. Files before CUTOFF were applied by hand.
set -euo pipefail
: "${SUPABASE_DB_URL:?Set the SUPABASE_DB_URL secret}"
CUTOFF=20261114000000

shopt -s nullglob
for file in supabase/migrations/*.sql; do
  base=$(basename "$file" .sql)
  version=${base%%_*}
  name=${base#*_}
  [[ "$version" =~ ^[0-9]{14}$ ]] || { echo "Skipping $file: name must start with a 14-digit timestamp"; continue; }
  (( version < CUTOFF )) && continue
  done=$(psql "$SUPABASE_DB_URL" -tAX -c "select 1 from supabase_migrations.schema_migrations where version = '$version'")
  if [[ "$done" == "1" ]]; then
    echo "Already applied: $base"
    continue
  fi
  echo "Applying: $base"
  psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 --single-transaction \
    -f "$file" \
    -c "insert into supabase_migrations.schema_migrations (version, name, created_by) values ('$version', 'gift_tracker_$name', 'github-actions')"
done
echo "Database is up to date."
