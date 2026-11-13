"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackLink, PageTitle } from "@/components/bits";
import { GiftForm } from "@/components/gift-form";
import { todayISO } from "@/lib/dates";
import { spentOn } from "@/lib/gifts";
import { useData } from "@/lib/store";

export default function NewGiftPage() {
  return (
    <Suspense>
      <NewGift />
    </Suspense>
  );
}

function NewGift() {
  const person = useSearchParams().get("person");
  const router = useRouter();
  const { people, gifts } = useData();
  const noPeople = people.length === 0;
  useEffect(() => {
    if (noPeople) router.replace("/people/new");
  }, [noPeople, router]);
  if (noPeople) return null;

  const personId = person && people.some((p) => p.id === person) ? person : undefined;
  const withLeft = people.map((p) => ({ ...p, left: p.budget - spentOn(gifts.filter((g) => g.person_id === p.id)) }));

  return (
    <>
      <BackLink href={personId ? `/people/view?id=${personId}` : "/"}>Back</BackLink>
      <PageTitle>Add gift</PageTitle>
      <GiftForm people={withLeft} defaultPersonId={personId} today={todayISO()} />
    </>
  );
}
