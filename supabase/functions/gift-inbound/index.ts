// Resend "email.received" webhook. Each user has a private address
// <inbox_token>@INBOUND_EMAIL_DOMAIN; we find them by the token, fetch the
// email body from Resend, read it with Claude and file it in their Inbox.
//
// Deploy with JWT verification off (Resend signs requests instead):
//   supabase functions deploy gift-inbound --no-verify-jwt
// Secrets: RESEND_API_KEY, RESEND_WEBHOOK_SECRET, INBOUND_EMAIL_DOMAIN, ANTHROPIC_API_KEY

import { createClient } from "@supabase/supabase-js";
import { Webhook } from "svix";
import { extractEmail } from "./extract.ts";
import { htmlToText, processEmail, tokensFor } from "./inbound.ts";

type ReceivedEvent = {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    created_at?: string;
    from?: string;
    to?: string[];
    received_for?: string[];
    subject?: string;
  };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const domain = Deno.env.get("INBOUND_EMAIL_DOMAIN")?.toLowerCase();
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!secret || !apiKey || !domain) return json({ error: "inbound email is not configured" }, 503);

  const payload = await request.text();
  try {
    // Throws when the signature is wrong; svix 2.x returns nothing, so parse the body ourselves.
    new Webhook(secret).verify(payload, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    });
  } catch {
    return json({ error: "invalid signature" }, 401);
  }

  let event: ReceivedEvent;
  try {
    event = JSON.parse(payload) as ReceivedEvent;
  } catch {
    return json({ ignored: "not JSON" });
  }
  if (event?.type !== "email.received" || !event.data?.email_id) return json({ ignored: true });

  const asList = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v] : []).filter((x): x is string => typeof x === "string");

  const tokens = tokensFor([...asList(event.data.to), ...asList(event.data.received_for)], domain);
  if (tokens.length === 0) return json({ ignored: "no matching address" });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: household } = await db.from("gift_households").select("id").in("inbox_token", tokens).limit(1).maybeSingle();
  if (!household) return json({ ignored: "unknown address" });

  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(event.data.email_id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    // Resend's error body says why (e.g. a key with "Sending access" only can't read received emails).
    const detail = (await res.text()).slice(0, 300);
    console.error(`Resend refused to return email ${event.data.email_id}: ${res.status} ${detail}`);
    return json({ error: `could not fetch email (${res.status})`, detail }, 502); // Resend retries later.
  }

  const email = (await res.json()) as { text?: string | null; html?: string | null; subject?: string; from?: string; created_at?: string };
  const text = email.text?.trim() || (email.html ? htmlToText(email.html) : "");

  try {
    await processEmail(
      db,
      {
        providerId: event.data.email_id,
        householdId: household.id,
        from: email.from ?? event.data.from ?? null,
        subject: email.subject ?? event.data.subject ?? null,
        receivedAt: email.created_at ?? event.data.created_at ?? event.created_at,
        text,
      },
      anthropicKey ? (input) => extractEmail(anthropicKey, input) : null,
    );
  } catch (err) {
    console.error("inbound processing failed", err);
    return json({ error: "processing failed" }, 500);
  }
  return json({ ok: true });
});
