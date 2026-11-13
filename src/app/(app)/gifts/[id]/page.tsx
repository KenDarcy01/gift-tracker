import { deleteGift } from "@/app/actions";
import { BackLink, PageTitle } from "@/components/bits";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { GiftForm } from "@/components/gift-form";
import { getGift, listGifts, listPeople } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { spentOn } from "@/lib/gifts";

export default async function EditGiftPage({ params }: PageProps<"/gifts/[id]">) {
  const { id } = await params;
  const [gift, people, gifts] = await Promise.all([getGift(id), listPeople(), listGifts()]);
  const person = people.find((p) => p.id === gift.person_id);
  const withLeft = people.map((p) => ({ ...p, left: p.budget - spentOn(gifts.filter((g) => g.person_id === p.id)) }));

  return (
    <>
      <BackLink href={`/people/${gift.person_id}`}>{person?.name ?? "Back"}</BackLink>
      <PageTitle>Edit gift</PageTitle>
      <GiftForm gift={gift} people={withLeft} today={todayISO()} />
      <form action={deleteGift} className="flex justify-center">
        <input type="hidden" name="id" value={gift.id} />
        <input type="hidden" name="person_id" value={gift.person_id} />
        <ConfirmSubmit label="Delete gift" confirmLabel="Tap again to delete" />
      </form>
    </>
  );
}
