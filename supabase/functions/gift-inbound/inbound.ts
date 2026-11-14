import type { SupabaseClient } from "@supabase/supabase-js";
import { carrierFromName, detectCarrier, normaliseTracking, trackingUrlFor } from "../_shared/carriers.ts";
import type { Extraction } from "./extract.ts";

export type ReceivedEmail = {
  providerId: string;
  householdId: string;
  from: string | null;
  subject: string | null;
  receivedAt: string;
  text: string;
};

type Extractor = (input: {
  subject: string | null;
  from: string | null;
  text: string;
  today: string;
  people: { name: string; relation: string | null; notes: string | null }[];
}) => Promise<Extraction | null>;

const STATUSES = ["idea", "purchased", "shipped", "delivered", "wrapped", "given"] as const;
type GiftStatus = (typeof STATUSES)[number];

type Gift = {
  id: string;
  status: GiftStatus;
  cost: number | string;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  expected_delivery: string | null;
  order_ref: string | null;
  delivered_on: string | null;
};

/** Today in the UK, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

/** Pull plain text out of an HTML email well enough for extraction. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d|table)>/gi, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&pound;/g, "£")
    .replace(/&#163;/g, "£")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
}

/** Gmail sends a confirmation code to a new forwarding address; surface it. */
export function gmailForwardingCode(from: string | null, subject: string | null, text: string): string | null {
  if (!from?.toLowerCase().includes("forwarding-noreply@google.com")) return null;
  const code = text.match(/Confirmation code:\s*(\d{6,})/i)?.[1];
  return code ?? (subject?.match(/#(\d{6,})/)?.[1] ?? null);
}

/** The inbox tokens in a list of recipient addresses at our domain. */
export function tokensFor(recipients: string[], domain: string): string[] {
  return recipients
    .map((r) => r.toLowerCase().match(/<?([^<>\s@]+)@([^<>\s]+?)>?$/))
    .filter((m): m is RegExpMatchArray => !!m && m[2] === domain.toLowerCase())
    .map((m) => m[1].split("+")[0]);
}

const RANK = Object.fromEntries(STATUSES.map((s, i) => [s, i])) as Record<GiftStatus, number>;

/** Move a status forward only, never backwards. */
function advance(current: GiftStatus, to: GiftStatus): GiftStatus {
  return RANK[to] > RANK[current] ? to : current;
}

export async function processEmail(db: SupabaseClient, email: ReceivedEmail, extract: Extractor | null): Promise<void> {
  const base = {
    household_id: email.householdId,
    provider_id: email.providerId,
    from_address: email.from,
    subject: email.subject,
    received_at: email.receivedAt,
  };

  const code = gmailForwardingCode(email.from, email.subject, email.text);
  if (code) {
    await save(db, {
      ...base,
      kind: "unknown",
      state: "unreadable",
      summary: `Gmail forwarding confirmation code: ${code}. Enter it in Gmail's forwarding settings to finish setup.`,
    });
    return;
  }

  if (!extract) {
    await save(db, { ...base, kind: "unknown", state: "unreadable", summary: "Email reading isn't switched on yet." });
    return;
  }

  const { data: people } = await db.from("gift_people").select("id, name, relation, notes").eq("household_id", email.householdId);

  const extracted = await extract({
    subject: email.subject,
    from: email.from,
    text: email.text,
    today: todayISO(),
    people: people ?? [],
  }).catch((err) => {
    console.error("extraction failed", err);
    return null;
  });

  if (!extracted || extracted.kind === "unknown") {
    await save(db, {
      ...base,
      kind: "unknown",
      state: "unreadable",
      extracted,
      summary: extracted ? "This doesn't look like an order or delivery email." : "Couldn't read this email.",
    });
    return;
  }

  const tracking = extracted.tracking_number ? normaliseTracking(extracted.tracking_number) : null;
  const carrier = carrierFromName(extracted.carrier) ?? (tracking ? detectCarrier(tracking) : undefined);
  const trackingUrl = safeHttpUrl(extracted.tracking_url) ?? trackingUrlFor(carrier?.id, tracking);

  // Is this about a gift we already have?
  const existing = await findExistingGift(db, email.householdId, tracking, extracted.order_ref);
  if (existing) {
    let status: GiftStatus = existing.status;
    if (tracking || extracted.delivery_status === "dispatched" || extracted.delivery_status === "out_for_delivery") {
      status = advance(status, "shipped");
    }
    if (extracted.delivery_status === "delivered") status = advance(status, "delivered");
    if (status === "idea") status = "purchased";

    const update: Partial<Gift> = {
      status,
      carrier: carrier?.id ?? existing.carrier,
      tracking_number: tracking ?? existing.tracking_number,
      tracking_url: trackingUrl ?? existing.tracking_url,
      expected_delivery: extracted.expected_delivery ?? existing.expected_delivery,
      order_ref: existing.order_ref ?? extracted.order_ref,
      delivered_on: status === "delivered" && !existing.delivered_on ? todayISO() : existing.delivered_on,
    };
    const { error } = await db.from("gifts").update(update).eq("id", existing.id).eq("household_id", email.householdId);
    if (error) throw new Error(error.message);

    await save(db, {
      ...base,
      kind: extracted.kind,
      state: "applied",
      extracted,
      gift_id: existing.id,
      previous_gift: snapshot(existing),
      summary: describeUpdate(existing, update),
    });
    return;
  }

  if (extracted.items.length === 0) {
    await save(db, { ...base, kind: extracted.kind, state: "unreadable", extracted, summary: "No products found in this email." });
    return;
  }

  const suggested = extracted.suggested_person
    ? (people ?? []).find((p) => p.name.toLowerCase() === extracted.suggested_person!.toLowerCase())
    : undefined;

  await save(db, {
    ...base,
    kind: extracted.kind,
    state: "needs_person",
    extracted: { ...extracted, tracking_number: tracking, carrier: carrier?.id ?? null, tracking_url: trackingUrl },
    suggested_person_id: suggested?.id ?? null,
    summary: suggested && extracted.suggestion_reason ? extracted.suggestion_reason : null,
  });
}

async function save(db: SupabaseClient, row: Record<string, unknown>) {
  const { error } = await db.from("gift_inbound_emails").upsert(row, { onConflict: "household_id,provider_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

async function findExistingGift(db: SupabaseClient, householdId: string, tracking: string | null, orderRef: string | null): Promise<Gift | null> {
  if (tracking) {
    const { data } = await db.from("gifts").select("*").eq("household_id", householdId).eq("tracking_number", tracking).limit(1);
    if (data?.[0]) return data[0] as Gift;
  }
  if (orderRef) {
    const { data } = await db.from("gifts").select("*").eq("household_id", householdId).eq("order_ref", orderRef).limit(1);
    if (data?.[0]) return data[0] as Gift;
  }
  return null;
}

function snapshot(g: Gift) {
  return {
    status: g.status,
    carrier: g.carrier,
    tracking_number: g.tracking_number,
    tracking_url: g.tracking_url,
    expected_delivery: g.expected_delivery,
    order_ref: g.order_ref,
    delivered_on: g.delivered_on,
  };
}

function describeUpdate(before: Gift, after: Partial<Gift>): string {
  const parts: string[] = [];
  if (after.status && after.status !== before.status) parts.push(`${cap(before.status)} to ${cap(after.status)}`);
  if (after.expected_delivery && after.expected_delivery !== before.expected_delivery) parts.push(`due ${shortDate(after.expected_delivery)}`);
  if (after.tracking_number && after.tracking_number !== before.tracking_number) parts.push(`tracking ${after.tracking_number} added`);
  return parts.length ? parts.join(" · ") : "Nothing new in this email";
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function safeHttpUrl(v: string | null): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
