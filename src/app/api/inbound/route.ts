import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";
import { htmlToText, processEmail } from "@/lib/inbound";

export const maxDuration = 60;

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

/**
 * Resend "email.received" webhook. Each user has a private address
 * <inbox_token>@INBOUND_EMAIL_DOMAIN; we find them by the token, fetch the
 * email body from Resend, read it with Claude and file it in their Inbox.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  const domain = process.env.INBOUND_EMAIL_DOMAIN?.toLowerCase();
  if (!secret || !apiKey || !domain) {
    return NextResponse.json({ error: "inbound email is not configured" }, { status: 503 });
  }

  const payload = await request.text();
  let event: ReceivedEvent;
  try {
    event = new Webhook(secret).verify(payload, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    }) as unknown as ReceivedEvent;
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (event.type !== "email.received") return NextResponse.json({ ignored: true });

  const recipients = [...(event.data.to ?? []), ...(event.data.received_for ?? [])];
  const tokens = recipients
    .map((r) => r.toLowerCase().match(/<?([^<>\s@]+)@([^<>\s]+?)>?$/))
    .filter((m): m is RegExpMatchArray => !!m && m[2] === domain)
    .map((m) => m[1].split("+")[0]);
  if (tokens.length === 0) return NextResponse.json({ ignored: "no matching address" });

  const db = createAdminClient();
  const { data: profile } = await db.from("gift_profiles").select("id").in("inbox_token", tokens).limit(1).maybeSingle();
  if (!profile) return NextResponse.json({ ignored: "unknown address" });

  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(event.data.email_id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    // Let Resend retry later.
    return NextResponse.json({ error: `could not fetch email (${res.status})` }, { status: 502 });
  }
  const email = (await res.json()) as { text?: string | null; html?: string | null; subject?: string; from?: string; created_at?: string };
  const text = email.text?.trim() || (email.html ? htmlToText(email.html) : "");

  try {
    await processEmail(db, {
      providerId: event.data.email_id,
      userId: profile.id,
      from: email.from ?? event.data.from ?? null,
      subject: email.subject ?? event.data.subject ?? null,
      receivedAt: email.created_at ?? event.data.created_at ?? event.created_at,
      text,
    });
  } catch (err) {
    console.error("inbound processing failed", err);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
