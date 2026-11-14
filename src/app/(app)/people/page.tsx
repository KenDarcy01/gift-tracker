"use client";

import Link from "next/link";
import { BudgetBar, BudgetNote, Initial, PageTitle } from "@/components/bits";
import { PlusIcon } from "@/components/icons";
import { useData } from "@/lib/store";
import { spentOn } from "@/lib/gifts";
import { money } from "@/lib/money";

export default function PeoplePage() {
  const { profile, people, gifts } = useData();
  const allocated = people.reduce((sum, p) => sum + p.budget, 0);

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <PageTitle
          sub={`${people.length} ${people.length === 1 ? "person" : "people"} · ${money(allocated)}${
            profile.overall_budget > 0 ? ` of ${money(profile.overall_budget)}` : ""
          } allocated`}
        >
          People
        </PageTitle>
        <Link href="/people/new" className="btn-secondary shrink-0 whitespace-nowrap pl-3">
          <PlusIcon size={18} />
          Add person
        </Link>
      </header>

      <p className="text-[12px] text-muted">
        Bars turn amber at {profile.warn_pct}% of a budget and red when it&apos;s gone over. Ideas don&apos;t count until bought.
      </p>

      {people.length === 0 ? (
        <p className="card p-4 text-[15px] text-muted">
          No one here yet. <Link href="/people/new" className="font-semibold text-pine">Add your first person</Link>.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {people.map((p, i) => {
            const theirs = gifts.filter((g) => g.person_id === p.id);
            const spent = spentOn(theirs);
            const ideas = theirs.filter((g) => g.status === "idea").length;
            const bought = theirs.length - ideas;
            const countText =
              bought === 0 && ideas > 0
                ? `${ideas} ${ideas === 1 ? "idea" : "ideas"}`
                : `${theirs.length} ${theirs.length === 1 ? "gift" : "gifts"}`;
            const over = spent > p.budget;
            return (
              <li key={p.id}>
                <Link
                  href={`/people/view?id=${p.id}`}
                  className={`card flex flex-col gap-2.5 px-4 py-3.5 ${over ? "border-berry-line" : ""}`}
                >
                  <span className="flex items-center gap-3">
                    <Initial name={p.name} index={i} />
                    <span className="flex flex-1 flex-col gap-px">
                      <span className="text-[16px] font-semibold">{p.name}</span>
                      <span className="text-[13px] text-muted">{[p.relation, countText].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="flex flex-col items-end gap-px">
                      <span className="text-[14px] font-semibold">
                        {money(spent)} / {money(p.budget)}
                      </span>
                      <BudgetNote spent={spent} budget={p.budget} warnPct={profile.warn_pct} />
                    </span>
                  </span>
                  <BudgetBar spent={spent} budget={p.budget} warnPct={profile.warn_pct} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
