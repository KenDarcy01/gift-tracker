"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/data";
import { detectCarrier, getCarrier, normaliseTracking, trackingUrlFor } from "@/lib/carriers";
import { parseMoney } from "@/lib/money";
import { STATUSES, type GiftStatus } from "@/lib/types";
import { todayISO } from "@/lib/dates";

export type FormState = { error?: string; ok?: boolean };

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

function safeUrl(v: string | null): string | null {
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function refresh() {
  revalidatePath("/", "layout");
}

/* ---------- People ---------- */

export async function savePerson(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
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

  const supabase = await createClient();
  const result = id
    ? await supabase.from("gift_people").update(row).eq("id", id).select("id").single()
    : await supabase.from("gift_people").insert(row).select("id").single();
  if (result.error) return { error: result.error.message };

  refresh();
  redirect(`/people/${result.data.id}`);
}

export async function deletePerson(form: FormData) {
  await requireUserId();
  const id = text(form, "id", 64);
  if (!id) return;
  const supabase = await createClient();
  const { error } = await supabase.from("gift_people").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
  redirect("/people");
}

/* ---------- Gifts ---------- */

export async function saveGift(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
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
  if (tracking && (!carrier || carrier === "auto")) carrier = detectCarrier(tracking)?.id ?? null;
  if (carrier === "auto" || (carrier && !getCarrier(carrier))) carrier = null;

  const manualTrackingUrl = safeUrl(text(form, "tracking_url", 500));
  const trackingUrl = manualTrackingUrl ?? trackingUrlFor(carrier, tracking);

  const supabase = await createClient();
  let deliveredOn: string | null = null;
  if (status === "delivered" || status === "wrapped" || status === "given") {
    deliveredOn = text(form, "delivered_on", 10) ?? todayISO();
  }

  const row = {
    person_id: personId,
    name,
    url: safeUrl(text(form, "url", 1000)),
    store: text(form, "store", 80),
    cost,
    status,
    carrier,
    tracking_number: tracking,
    tracking_url: trackingUrl,
    expected_delivery: isoDate(form, "expected_delivery"),
    delivered_on: deliveredOn,
    notes: text(form, "notes", 2000),
  };

  const result = id
    ? await supabase.from("gifts").update(row).eq("id", id).select("person_id").single()
    : await supabase.from("gifts").insert(row).select("person_id").single();
  if (result.error) return { error: result.error.message };

  refresh();
  redirect(text(form, "return_to", 200) ?? `/people/${result.data.person_id}`);
}

export async function deleteGift(form: FormData) {
  await requireUserId();
  const id = text(form, "id", 64);
  const personId = text(form, "person_id", 64);
  if (!id) return;
  const supabase = await createClient();
  const { error } = await supabase.from("gifts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
  redirect(personId ? `/people/${personId}` : "/");
}

/* ---------- Settings ---------- */

export async function saveSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const overall = parseMoney(form.get("overall_budget"));
  const warn = Number(form.get("warn_pct"));
  if (Number.isNaN(overall)) return { error: "Budget should be an amount like 700." };
  if (!Number.isInteger(warn) || warn < 50 || warn > 100) return { error: "Warning level must be 50–100%." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("gift_profiles")
    .update({ overall_budget: overall, warn_pct: warn })
    .eq("id", userId);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

/* ---------- Auth ---------- */

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
