import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Gift, InboundEmail, Person, Profile } from "@/lib/types";

/** The signed-in user's id, or a redirect to /login. Verifies the JWT. */
export const requireUserId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) redirect("/login");
  return sub;
});

export const getProfile = cache(async (): Promise<Profile> => {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gift_profiles")
    .select("id, overall_budget, warn_pct, inbox_token")
    .eq("id", userId)
    .single();
  if (error || !data) throw new Error(`Could not load your settings: ${error?.message ?? "missing"}`);
  return { ...data, overall_budget: Number(data.overall_budget) };
});

const toPerson = (p: Person): Person => ({ ...p, budget: Number(p.budget) });
const toGift = (g: Gift): Gift => ({ ...g, cost: Number(g.cost) });

export const listPeople = cache(async (): Promise<Person[]> => {
  await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gift_people")
    .select("id, name, relation, budget, sizes, notes, created_at")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toPerson);
});

export const listGifts = cache(async (): Promise<Gift[]> => {
  await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.from("gifts").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toGift);
});

export async function getPerson(id: string): Promise<Person> {
  const person = (await listPeople()).find((p) => p.id === id);
  if (!person) notFound();
  return person;
}

export async function getGift(id: string): Promise<Gift> {
  const gift = (await listGifts()).find((g) => g.id === id);
  if (!gift) notFound();
  return gift;
}

export const listInbound = cache(async (): Promise<InboundEmail[]> => {
  await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gift_inbound_emails")
    .select(
      "id, provider_id, from_address, subject, received_at, kind, state, extracted, summary, suggested_person_id, gift_id",
    )
    .neq("state", "dismissed")
    .order("received_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as InboundEmail[];
});

export async function countNeedsPerson(): Promise<number> {
  return (await listInbound()).filter((e) => e.state === "needs_person").length;
}

export function inboxAddress(token: string): string | null {
  const domain = process.env.INBOUND_EMAIL_DOMAIN;
  return domain ? `${token}@${domain}` : null;
}
