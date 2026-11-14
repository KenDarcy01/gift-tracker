"use client";

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { setCurrency } from "@/lib/money";
import type { Gift, InboundEmail, Person, Profile, SharePerson } from "@/lib/types";

export type AppData = {
  userId: string;
  profile: Profile;
  people: Person[];
  gifts: Gift[];
  inbound: InboundEmail[];
  sharing: SharePerson[];
};

type Ctx = AppData & { reload: () => Promise<void> };

const DataContext = createContext<Ctx | null>(null);

async function loadAll(userId: string): Promise<AppData> {
  const db = supabase();
  // Joins the household you were invited to, or sets up your own the first time.
  const joined = await db.rpc("gift_join_household");
  if (joined.error) throw new Error(joined.error.message);
  const householdId = joined.data as string;
  const profileRes = await db
    .from("gift_households")
    .select("id, overall_budget, warn_pct, currency, inbox_token")
    .eq("id", householdId)
    .single();
  const [peopleRes, giftsRes, inboundRes, sharingRes] = await Promise.all([
    db.from("gift_people").select("id, name, relation, budget, sizes, notes, created_at").order("created_at"),
    db.from("gifts").select("*").order("created_at"),
    db
      .from("gift_inbound_emails")
      .select("id, provider_id, from_address, subject, received_at, kind, state, extracted, summary, suggested_person_id, gift_id")
      .neq("state", "dismissed")
      .order("received_at", { ascending: false })
      .limit(50),
    db.rpc("gift_household_people"),
  ]);
  const error = profileRes.error ?? peopleRes.error ?? giftsRes.error ?? inboundRes.error ?? sharingRes.error;
  if (error || !profileRes.data) throw new Error(error?.message ?? "Couldn't load your settings");

  return {
    userId,
    profile: { ...profileRes.data, overall_budget: Number(profileRes.data.overall_budget) },
    people: (peopleRes.data ?? []).map((p) => ({ ...p, budget: Number(p.budget) })) as Person[],
    gifts: (giftsRes.data ?? []).map((g) => ({ ...g, cost: Number(g.cost) })) as Gift[],
    inbound: (inboundRes.data ?? []) as InboundEmail[],
    sharing: (sharingRes.data ?? []) as SharePerson[],
  };
}

/** Signs the visitor in (or sends them to /login) and loads their gift data. */
export function DataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data: auth } = await supabase().auth.getUser();
    if (!auth.user || auth.user.is_anonymous) {
      router.replace("/login/");
      return;
    }
    try {
      const loaded = await loadAll(auth.user.id);
      // Shared by everyone on the list.
      setCurrency(loaded.profile.currency);
      setData(loaded);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from Supabase
    void reload();
    const { data: sub } = supabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login/");
    });
    return () => sub.subscription.unsubscribe();
  }, [reload, router]);

  if (error) {
    return (
      <div role="alert" className="card flex flex-col gap-3 p-4">
        <p className="text-[15px] font-semibold">Couldn&apos;t load your gifts.</p>
        <p className="text-[13px] text-muted">{error}</p>
        <button type="button" onClick={() => void reload()} className="btn-secondary self-start">Try again</button>
      </div>
    );
  }
  if (!data) {
    return <p className="py-16 text-center text-[14px] text-muted">Loading…</p>;
  }
  return <DataContext value={{ ...data, reload }}>{children}</DataContext>;
}

export function useData(): Ctx {
  const ctx = use(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
