"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackLink, FormError, PageTitle } from "@/components/bits";
import { ConfirmButton } from "@/components/confirm-button";
import { GiftForm } from "@/components/gift-form";
import { NotFound } from "@/components/not-found";
import { todayISO } from "@/lib/dates";
import { spentOn } from "@/lib/gifts";
import { deleteGift } from "@/lib/mutations";
import { useData } from "@/lib/store";

export default function EditGiftPage() {
  return (
    <Suspense>
      <EditGift />
    </Suspense>
  );
}

function EditGift() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { people, gifts, reload } = useData();
  const [error, setError] = useState<string>();
  const gift = gifts.find((g) => g.id === id);
  if (!gift) return <NotFound what="gift" back="/" />;
  const person = people.find((p) => p.id === gift.person_id);
  const withLeft = people.map((p) => ({ ...p, left: p.budget - spentOn(gifts.filter((g) => g.person_id === p.id)) }));

  return (
    <>
      <BackLink href={`/people/view?id=${gift.person_id}`}>{person?.name ?? "Back"}</BackLink>
      <PageTitle>Edit gift</PageTitle>
      <GiftForm key={gift.id} gift={gift} people={withLeft} today={todayISO()} />
      <FormError message={error} />
      <div className="flex justify-center">
        <ConfirmButton
          label="Delete gift"
          confirmLabel="Tap again to delete"
          onConfirm={async () => {
            const result = await deleteGift(gift.id);
            if (result.error) return setError(result.error);
            router.push(`/people/view?id=${gift.person_id}`);
            await reload();
          }}
        />
      </div>
    </>
  );
}
