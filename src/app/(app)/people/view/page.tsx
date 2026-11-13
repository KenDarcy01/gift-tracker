"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BackLink, BudgetBar, Initial } from "@/components/bits";
import { GiftCard } from "@/components/gift-card";
import { PlusIcon } from "@/components/icons";
import { useData } from "@/lib/store";
import { NotFound } from "@/components/not-found";
import { todayISO } from "@/lib/dates";
import { budgetLevel, ideasTotal, isLate, spentOn } from "@/lib/gifts";
import { money, moneyExact } from "@/lib/money";
import type { Gift } from "@/lib/types";

export default function PersonPage() {
  return (
    <Suspense>
      <Person />
    </Suspense>
  );
}

function Person() {
  const id = useSearchParams().get("id");
  const { profile, people, gifts: allGifts } = useData();
  const person = people.find((p) => p.id === id);
  if (!person) return <NotFound what="person" back="/people" />;
  const index = people.findIndex((p) => p.id === person.id);
  const today = todayISO();
  const order = (g: Gift) => (g.status === "idea" ? 1 : 0);
  const gifts = allGifts.filter((g) => g.person_id === person.id).sort((a, b) => order(a) - order(b));

  const spent = spentOn(gifts);
  const ideas = ideasTotal(gifts);
  const level = budgetLevel(spent, person.budget, profile.warn_pct);
  const left = person.budget - spent;

  return (
    <>
      <div className="flex items-center justify-between">
        <BackLink href="/people">People</BackLink>
        <Link href={`/people/edit?id=${person.id}`} className="flex min-h-11 items-center px-3 text-[15px] font-semibold text-pine">
          Edit
        </Link>
      </div>

      <header className="flex items-center gap-3.5">
        <Initial name={person.name} index={index} size="lg" />
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-[28px] leading-[1.1] font-bold">{person.name}</h1>
          <p className="text-[14px] text-muted">
            {[person.relation, `${gifts.length} ${gifts.length === 1 ? "gift" : "gifts"}`].filter(Boolean).join(" · ")}
          </p>
        </div>
      </header>

      <section aria-label="Budget" className={`card flex flex-col gap-2.5 p-4 ${level === "over" ? "border-berry-line" : ""}`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-semibold">
            {moneyExact(spent)} spent of {moneyExact(person.budget)}
          </span>
          <span
            className={`text-[13px] font-bold ${
              level === "over" ? "text-berry" : level === "near" ? "text-amber-ink" : "text-st-delivered"
            }`}
          >
            {level === "over" ? `${money(-left)} over` : `${money(left)} left`}
          </span>
        </div>
        <BudgetBar spent={spent} budget={person.budget} warnPct={profile.warn_pct} thick />
        {ideas > 0 && <p className="text-[13px] text-muted">Plus {moneyExact(ideas)} in ideas not bought yet.</p>}
      </section>

      {(person.sizes || person.notes) && (
        <section aria-labelledby="notes-h" className="card flex flex-col gap-2 p-4">
          <h2 id="notes-h" className="text-[13px] font-bold tracking-wide text-muted uppercase">Notes</h2>
          {person.sizes && (
            <div className="flex flex-wrap gap-1.5">
              {person.sizes.split(/[,;]/).map((s) => s.trim()).filter(Boolean).map((s) => (
                <span key={s} className="rounded-lg bg-ground px-2.5 py-1 text-[13px] font-semibold">{s}</span>
              ))}
            </div>
          )}
          {person.notes && <p className="text-[14px] leading-normal whitespace-pre-line">{person.notes}</p>}
        </section>
      )}

      <section aria-labelledby="gifts-h" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 id="gifts-h" className="text-[16px] font-bold">Gifts</h2>
          <Link href={`/gifts/new?person=${person.id}`} className="flex min-h-11 items-center gap-1 text-[14px] font-semibold text-pine">
            <PlusIcon size={18} />
            Add gift
          </Link>
        </div>

        {gifts.length === 0 && <p className="card p-4 text-[14px] text-muted">No gifts or ideas yet.</p>}

        {gifts.map((g) => {
          const wouldBeOver = g.status === "idea" && person.budget > 0 && spent + g.cost > person.budget;
          return (
            <GiftCard
              key={g.id}
              gift={g}
              late={isLate(g, today)}
              wouldBeOverBy={wouldBeOver ? spent + g.cost - person.budget : 0}
            />
          );
        })}
      </section>
    </>
  );
}
