#!/usr/bin/env bash
# Applies new SQL files in supabase/migrations to the database, oldest first,
# through the Supabase Management API using SUPABASE_ACCESS_TOKEN (no database
# password needed). Each file runs in one transaction together with its record
# in supabase_migrations.schema_migrations, so a failed file changes nothing and
# an applied file is never run twice. Files before CUTOFF were applied by hand.
set -euo pipefail
: "${SUPABASE_ACCESS_TOKEN:?Set the SUPABASE_ACCESS_TOKEN secret}"
: "${PROJECT_REF:?Set PROJECT_REF}"
CUTOFF=20261114000000

run_sql() { # $1 = SQL; prints the JSON result, fails on an HTTP error
  local body status
  body=$(jq -n --arg q "$1" '{query: $q}')
  status=$(curl -sS -o /tmp/sql_out.json -w '%{http_code}' -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
    --data "$body")
  if [[ "$status" != 2* ]]; then
    echo "::error::Database query failed ($status): $(cat /tmp/sql_out.json)" >&2
    return 1
  fi
  cat /tmp/sql_out.json
}

shopt -s nullglob
for file in supabase/migrations/*.sql; do
  base=$(basename "$file" .sql)
  version=${base%%_*}
  name=${base#*_}
  [[ "$version" =~ ^[0-9]{14}$ ]] || { echo "Skipping $file: name must start with a 14-digit timestamp"; continue; }
  (( version < CUTOFF )) && continue
  done=$(run_sql "select count(*)::int as n from supabase_migrations.schema_migrations where version = '$version'" | jq -r '.[0].n')
  if [[ "$done" == "1" ]]; then
    echo "Already applied: $base"
    continue
  fi
  echo "Applying: $base"
  run_sql "begin;
$(cat "$file")
;
insert into supabase_migrations.schema_migrations (version, name, created_by) values ('$version', 'gift_tracker_$name', 'github-actions');
commit;" > /dev/null
  echo "Applied: $base"
done
echo "Database is up to date."
