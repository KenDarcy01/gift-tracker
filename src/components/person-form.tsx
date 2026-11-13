"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { savePerson } from "@/lib/mutations";
import { useData } from "@/lib/store";
import type { Person } from "@/lib/types";
import { FormError } from "./bits";
import { currencySymbol } from "@/lib/money";

export function PersonForm({ person }: { person?: Person }) {
  const router = useRouter();
  const { reload } = useData();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const result = await savePerson(new FormData(e.currentTarget));
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    await reload();
    router.push(`/people/view?id=${result.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {person && <input type="hidden" name="id" value={person.id} />}
      <FormError message={error} />
      <div className="card flex flex-col gap-3.5 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="label">Name</label>
          <input id="name" name="name" required maxLength={80} defaultValue={person?.name} className="field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="relation" className="label">Relation</label>
            <input id="relation" name="relation" placeholder="Sister" maxLength={80} defaultValue={person?.relation ?? ""} className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="budget" className="label">Budget ({currencySymbol()})</label>
            <input id="budget" name="budget" inputMode="decimal" placeholder="50" defaultValue={person ? String(person.budget) : ""} className="field" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sizes" className="label">Sizes</label>
          <input id="sizes" name="sizes" placeholder="Clothes 12, shoes UK 6" maxLength={300} defaultValue={person?.sizes ?? ""} className="field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="label">Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Interests, things they already have, hints they've dropped"
            defaultValue={person?.notes ?? ""}
            className="field resize-none py-2.5 leading-relaxed"
          />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : person ? "Save changes" : "Add person"}
      </button>
    </form>
  );
}
