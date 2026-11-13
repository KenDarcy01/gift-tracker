import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/** One Supabase client for the whole app. Row level security keeps each person's data private. */
export function supabase(): SupabaseClient {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function inboxAddress(token: string): string | null {
  const domain = process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN;
  return domain ? `${token}@${domain}` : null;
}
