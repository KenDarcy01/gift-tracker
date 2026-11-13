import { deletePerson } from "@/app/actions";
import { BackLink, PageTitle } from "@/components/bits";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PersonForm } from "@/components/person-form";
import { getPerson } from "@/lib/data";

export default async function EditPersonPage({ params }: PageProps<"/people/[id]/edit">) {
  const { id } = await params;
  const person = await getPerson(id);
  return (
    <>
      <BackLink href={`/people/${person.id}`}>{person.name}</BackLink>
      <PageTitle>Edit {person.name}</PageTitle>
      <PersonForm person={person} />
      <form action={deletePerson} className="flex justify-center">
        <input type="hidden" name="id" value={person.id} />
        <ConfirmSubmit label={`Delete ${person.name} and their gifts`} confirmLabel="Tap again to delete" />
      </form>
    </>
  );
}
