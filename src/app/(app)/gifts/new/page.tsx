import { redirect } from "next/navigation";
import { BackLink, PageTitle } from "@/components/bits";
import { GiftForm } from "@/components/gift-form";
import { listGifts, listPeople } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { spentOn } from "@/lib/gifts";

export default async function NewGiftPage({ searchParams }: PageProps<"/gifts/new">) {
  const { person } = await searchParams;
  const [people, gifts] = await Promise.all([listPeople(), listGifts()]);
  if (people.length === 0) redirect("/people/new");
  const personId = typeof person === "string" && people.some((p) => p.id === person) ? person : undefined;
  const withLeft = people.map((p) => ({ ...p, left: p.budget - spentOn(gifts.filter((g) => g.person_id === p.id)) }));

  return (
    <>
      <BackLink href={personId ? `/people/${personId}` : "/"}>Back</BackLink>
      <PageTitle>Add gift</PageTitle>
      <GiftForm people={withLeft} defaultPersonId={personId} today={todayISO()} />
    </>
  );
}
