"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/data";
import type { ExtractedEmail, GiftStatus } from "@/lib/types";

async function load(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gift_inbound_emails")
    .select("id, state, extracted, gift_id, previous_gift")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Email not found");
  return { supabase, email: data as { id: string; state: string; extracted: ExtractedEmail | null; gift_id: string | null; previous_gift: Record<string, unknown> | null } };
}

/** Turn an order email into gifts for the chosen person. */
export async function assignInbound(id: string, personId: string) {
  await requireUserId();
  const { supabase, email } = await load(id);
  if (email.state !== "needs_person" || !email.extracted) return;
  const x = email.extracted;
  const status: GiftStatus = x.delivery_status === "delivered" ? "delivered" : x.tracking_number ? "shipped" : "purchased";
  const items = x.items.length ? x.items : [{ name: "Order", price: x.total }];
  const onlyOne = items.length === 1;

  const rows = items.map((item) => ({
    person_id: personId,
    name: item.name.slice(0, 200),
    store: x.store,
    cost: item.price ?? (onlyOne ? x.total ?? 0 : 0),
    status,
    order_ref: x.order_ref,
    carrier: x.carrier,
    tracking_number: x.tracking_number,
    tracking_url: x.tracking_url,
    expected_delivery: x.expected_delivery,
  }));
  const { data, error } = await supabase.from("gifts").insert(rows).select("id");
  if (error) throw new Error(error.message);

  const ids = (data ?? []).map((g) => g.id as string);
  await supabase
    .from("gift_inbound_emails")
    .update({ state: "added", gift_id: ids[0] ?? null, previous_gift: { created: ids } })
    .eq("id", id);
  revalidatePath("/", "layout");
}

/** Undo an add (deletes the new gifts) or an automatic update (restores the gift). */
export async function undoInbound(id: string) {
  await requireUserId();
  const { supabase, email } = await load(id);
  const prev = email.previous_gift ?? {};

  if (email.state === "added") {
    const created = Array.isArray(prev.created) ? (prev.created as string[]) : [];
    if (created.length) await supabase.from("gifts").delete().in("id", created);
    await supabase.from("gift_inbound_emails").update({ state: "needs_person", gift_id: null, previous_gift: null }).eq("id", id);
  } else if (email.state === "applied" && email.gift_id) {
    await supabase.from("gifts").update(prev).eq("id", email.gift_id);
    await supabase.from("gift_inbound_emails").update({ state: "dismissed" }).eq("id", id);
  }
  revalidatePath("/", "layout");
}

export async function dismissInbound(id: string) {
  await requireUserId();
  const supabase = await createClient();
  await supabase.from("gift_inbound_emails").update({ state: "dismissed" }).eq("id", id);
  revalidatePath("/", "layout");
}
