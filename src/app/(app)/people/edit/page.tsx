"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackLink, FormError, PageTitle } from "@/components/bits";
import { ConfirmButton } from "@/components/confirm-button";
import { NotFound } from "@/components/not-found";
import { PersonForm } from "@/components/person-form";
import { deletePerson } from "@/lib/mutations";
import { useData } from "@/lib/store";

export default function EditPersonPage() {
  return (
    <Suspense>
      <EditPerson />
    </Suspense>
  );
}

function EditPerson() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { people, reload } = useData();
  const [error, setError] = useState<string>();
  const person = people.find((p) => p.id === id);
  if (!person) return <NotFound what="person" back="/people" />;

  return (
    <>
      <BackLink href={`/people/view?id=${person.id}`}>{person.name}</BackLink>
      <PageTitle>Edit {person.name}</PageTitle>
      <PersonForm person={person} />
      <FormError message={error} />
      <div className="flex justify-center">
        <ConfirmButton
          label={`Delete ${person.name} and their gifts`}
          confirmLabel="Tap again to delete"
          onConfirm={async () => {
            const { error } = await deletePerson(person.id);
            if (error) return setError(error);
            router.push("/people");
            await reload();
          }}
        />
      </div>
    </>
  );
}
