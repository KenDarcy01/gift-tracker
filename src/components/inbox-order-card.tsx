"use client";

import { useState, useTransition } from "react";
import { assignInbound, dismissInbound, type Result } from "@/lib/mutations";
import { useData } from "@/lib/store";
import { getCarrier } from "@/lib/carriers";
import { money, moneyExact } from "@/lib/money";
import { shortDate } from "@/lib/dates";
import type { ExtractedEmail } from "@/lib/types";
import { TruckIcon } from "./icons";

type PersonOption = { id: string; name: string; left: number; budget: number };

export function InboxOrderCard({
  id,
  received,
  extracted,
  people,
  suggestedId,
  reason,
}: {
  id: string;
  received: string;
  extracted: ExtractedEmail;
  people: PersonOption[];
  suggestedId: string | null;
  reason: string | null;
}) {
  const [personId, setPersonId] = useState<string | null>(suggestedId);
  const { reload } = useData();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      setError(result.error ?? null);
      await reload();
    });
  const person = people.find((p) => p.id === personId);
  const price = extracted.total ?? extracted.items.reduce((s, i) => s + (i.price ?? 0), 0);
  const remain = person ? person.left - price : 0;
  const carrier = getCarrier(extracted.carrier)?.name ?? extracted.carrier;

  const chips = suggestedId ? [...people].sort((a, b) => (a.id === suggestedId ? -1 : b.id === suggestedId ? 1 : 0)) : people;

  return (
    <article className="card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-bold tracking-wide text-muted uppercase">
            New order{extracted.store ? ` · ${extracted.store}` : ""}
          </span>
          <span className="text-[12px] text-muted">
            {received}
            {extracted.order_ref ? ` · Order ${extracted.order_ref}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => run(() => dismissInbound(id))}
          className="min-h-9 px-1 text-[13px] font-semibold whitespace-nowrap text-muted"
        >
          Not a gift
        </button>
      </div>
      <ul className="flex flex-col gap-1.5 rounded-xl bg-ground p-3">
        {extracted.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-[15px] font-semibold">{item.name}</span>
            {item.price != null && <span className="text-[15px] font-bold whitespace-nowrap">{moneyExact(item.price)}</span>}
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 text-[13px] text-muted">
        <TruckIcon size={16} />
        {extracted.tracking_number
          ? [carrier, extracted.expected_delivery ? `arriving ${shortDate(extracted.expected_delivery)}` : null, extracted.tracking_number]
              .filter(Boolean)
              .join(" · ")
          : "Not shipped yet. It'll update when the dispatch email arrives."}
      </p>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">
          Who&apos;s it for?{" "}
          {suggestedId && reason && (
            <span className="font-normal text-muted">
              Suggested: {people.find((p) => p.id === suggestedId)?.name} ({reason})
            </span>
          )}
        </span>
        {people.length === 0 ? (
          <p className="text-[13px] text-muted">Add someone on the People tab first.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((p) => {
              const on = p.id === personId;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPersonId(p.id)}
                  className={`min-h-10 rounded-full px-3.5 text-[14px] font-semibold ${
                    on ? "border border-pine bg-pine text-white" : "border border-field bg-card text-ink"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        )}
        {person && person.budget > 0 && (
          <p className={`text-[13px] font-semibold ${remain < 0 ? "text-berry" : "text-st-delivered"}`}>
            {remain < 0
              ? `This takes ${person.name} ${money(-remain)} over budget.`
              : `Leaves ${money(remain)} of ${person.name}'s budget.`}
          </p>
        )}
      </div>
      {error && <p role="alert" className="text-[13px] font-semibold text-berry">{error}</p>}
      <button
        type="button"
        disabled={!person || pending}
        onClick={() => person && run(() => assignInbound(id, extracted, person.id))}
        className="btn-primary min-h-12"
      >
        {pending ? "Adding…" : person ? `Add to ${person.name}'s gifts` : "Choose a person"}
      </button>
    </article>
  );
}
