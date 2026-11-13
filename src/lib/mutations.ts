import { supabase } from "@/lib/supabase/client";
import { detectCarrier, getCarrier, normaliseTracking, trackingUrlFor } from "@/lib/carriers";
import { parseMoney } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { STATUSES, type ExtractedEmail, type GiftStatus } from "@/lib/types";

/** Result of a save: an error message to show, or the id to go to next. */
export type Result = { error?: string; id?: string };

function text(form: FormData, key: string, max = 2000): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t === "" ? null : t;
}

function isoDate(form: FormData, key: string): string | null {
  const v = text(form, key, 10);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function safeUrl(v: string | null): string | null {
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/* ---------- People ---------- */

export async function savePerson(form: FormData): Promise<Result> {
  const id = text(form, "id", 64);
  const name = text(form, "name", 80);
  const budget = parseMoney(form.get("budget"));
  if (!name) return { error: "Give them a name." };
  if (Number.isNaN(budget)) return { error: "Budget should be an amount like 50 or 49.99." };

  const row = {
    name,
    relation: text(form, "relation", 80),
    budget,
    sizes: text(form, "sizes", 300),
    notes: text(form, "notes", 2000),
  };
  const db = supabase();
  const result = id
    ? await db.from("gift_people").update(row).eq("id", id).select("id").single()
    : await db.from("gift_people").insert(row).select("id").single();
  if (result.error) return { error: result.error.message };
  return { id: result.data.id };
}

export async function deletePerson(id: string): Promise<Result> {
  const { error } = await supabase().from("gift_people").delete().eq("id", id);
  return error ? { error: error.message } : {};
}

/* ---------- Gifts ---------- */

export async function saveGift(form: FormData): Promise<Result> {
  const id = text(form, "id", 64);
  const personId = text(form, "person_id", 64);
  const name = text(form, "name", 200);
  const cost = parseMoney(form.get("cost"));
  const status = text(form, "status", 20) as GiftStatus | null;

  if (!personId) return { error: "Choose who the gift is for." };
  if (!name) return { error: "What's the gift? Give it a name." };
  if (Number.isNaN(cost)) return { error: "Cost should be an amount like 44.99." };
  if (!status || !STATUSES.includes(status)) return { error: "Pick a status." };

  const rawTracking = text(form, "tracking_number", 60);
  const tracking = rawTracking ? normaliseTracking(rawTracking) : null;
  let carrier = text(form, "carrier", 30);
  if (tracking && !carrier) carrier = detectCarrier(tracking)?.id ?? null;
  if (carrier && !getCarrier(carrier)) carrier = null;

  const manualTrackingUrl = safeUrl(text(form, "tracking_url", 500));
  const delivered = status === "delivered" || status === "wrapped" || status === "given";

  const row = {
    person_id: personId,
    name,
    url: safeUrl(text(form, "url", 1000)),
    store: text(form, "store", 80),
    cost,
    status,
    carrier,
    tracking_number: tracking,
    tracking_url: manualTrackingUrl ?? trackingUrlFor(carrier, tracking),
    expected_delivery: isoDate(form, "expected_delivery"),
    delivered_on: delivered ? (isoDate(form, "delivered_on") ?? todayISO()) : null,
    notes: text(form, "notes", 2000),
  };

  const db = supabase();
  const result = id
    ? await db.from("gifts").update(row).eq("id", id).select("person_id").single()
    : await db.from("gifts").insert(row).select("person_id").single();
  if (result.error) return { error: result.error.message };
  return { id: result.data.person_id };
}

export async function deleteGift(id: string): Promise<Result> {
  const { error } = await supabase().from("gifts").delete().eq("id", id);
  return error ? { error: error.message } : {};
}

/* ---------- Settings ---------- */

export async function saveSettings(userId: string, form: FormData): Promise<Result> {
  const overall = parseMoney(form.get("overall_budget"));
  const warn = Number(form.get("warn_pct"));
  if (Number.isNaN(overall)) return { error: "Budget should be an amount like 700." };
  if (!Number.isInteger(warn) || warn < 50 || warn > 100) return { error: "Warning level must be 50–100%." };
  const { error } = await supabase()
    .from("gift_profiles")
    .update({ overall_budget: overall, warn_pct: warn })
    .eq("id", userId);
  return error ? { error: error.message } : {};
}

/* ---------- Inbox ---------- */

/** Turn an order email into gifts for the chosen person. */
export async function assignInbound(id: string, extracted: ExtractedEmail, personId: string): Promise<Result> {
  const db = supabase();
  const x = extracted;
  const status: GiftStatus = x.delivery_status === "delivered" ? "delivered" : x.tracking_number ? "shipped" : "purchased";
  const items = x.items.length ? x.items : [{ name: "Order", price: x.total }];
  const onlyOne = items.length === 1;

  const rows = items.map((item) => ({
    person_id: personId,
    name: item.name.slice(0, 200),
    store: x.store,
    cost: item.price ?? (onlyOne ? (x.total ?? 0) : 0),
    status,
    order_ref: x.order_ref,
    carrier: x.carrier,
    tracking_number: x.tracking_number,
    tracking_url: x.tracking_url,
    expected_delivery: x.expected_delivery,
    delivered_on: status === "delivered" ? todayISO() : null,
  }));
  const { data, error } = await db.from("gifts").insert(rows).select("id");
  if (error) return { error: error.message };

  const ids = (data ?? []).map((g) => g.id as string);
  const upd = await db
    .from("gift_inbound_emails")
    .update({ state: "added", gift_id: ids[0] ?? null, previous_gift: { created: ids } })
    .eq("id", id);
  return upd.error ? { error: upd.error.message } : {};
}

/** Undo an add (deletes the new gifts) or an automatic update (restores the gift). */
export async function undoInbound(id: string): Promise<Result> {
  const db = supabase();
  const { data: email, error } = await db
    .from("gift_inbound_emails")
    .select("state, gift_id, previous_gift")
    .eq("id", id)
    .single();
  if (error || !email) return { error: error?.message ?? "Email not found" };
  const prev = (email.previous_gift ?? {}) as Record<string, unknown>;

  if (email.state === "added") {
    const created = Array.isArray(prev.created) ? (prev.created as string[]) : [];
    if (created.length) await db.from("gifts").delete().in("id", created);
    await db.from("gift_inbound_emails").update({ state: "needs_person", gift_id: null, previous_gift: null }).eq("id", id);
  } else if (email.state === "applied" && email.gift_id) {
    const allowed = ["status", "carrier", "tracking_number", "tracking_url", "expected_delivery", "order_ref", "delivered_on"];
    const restore = Object.fromEntries(Object.entries(prev).filter(([k]) => allowed.includes(k)));
    await db.from("gifts").update(restore).eq("id", email.gift_id);
    await db.from("gift_inbound_emails").update({ state: "dismissed" }).eq("id", id);
  }
  return {};
}

export async function dismissInbound(id: string): Promise<Result> {
  const { error } = await supabase().from("gift_inbound_emails").update({ state: "dismissed" }).eq("id", id);
  return error ? { error: error.message } : {};
}
