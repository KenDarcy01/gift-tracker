import { BackLink, PageTitle } from "@/components/bits";
import { PersonForm } from "@/components/person-form";

export default function NewPersonPage() {
  return (
    <>
      <BackLink href="/people">People</BackLink>
      <PageTitle>Add person</PageTitle>
      <PersonForm />
    </>
  );
}
