"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/bits";
import { GiftCard } from "@/components/gift-card";
import { PlusIcon } from "@/components/icons";
import { todayISO } from "@/lib/dates";
import { SORTS, STATUS_FILTERS, filterGifts, isSort, isStatusFilter, sortGifts, storesOf } from "@/lib/gift-list";
import { isLate, spentOn } from "@/lib/gifts";
import { moneyExact } from "@/lib/money";
import { useData } from "@/lib/store";

export default function GiftsPage() {
  return (
    <Suspense>
      <AllGifts />
    </Suspense>
  );
}

function AllGifts() {
  const { people, gifts } = useData();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const today = todayISO();

  const personId = people.some((p) => p.id === params.get("person")) ? params.get("person") : null;
  const statusParam = params.get("status");
  const status = isStatusFilter(statusParam) ? statusParam : "all";
  const sortParam = params.get("sort");
  const sort = isSort(sortParam) ? sortParam : "added";
  const store = params.get("store");
  const q = params.get("q") ?? "";

  const names = new Map(people.map((p) => [p.id, p.name]));
  const personName = (id: string) => names.get(id) ?? "";
  const stores = storesOf(gifts);
  const shown = sortGifts(filterGifts(gifts, { person: personId, status, store, q }, today), sort, personName);
  const filtered = Boolean(personId || status !== "all" || store || q);

  // Several changes can land before the address updates, so build on the latest one we asked for.
  const latest = useRef(params.toString());
  useEffect(() => {
    latest.current = params.toString();
  }, [params]);

  /** Keep filters in the address so Back and shared links keep them. */
  function set(key: string, value: string | null) {
    const next = new URLSearchParams(latest.current);
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    latest.current = qs;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const total = shown.reduce((sum, g) => sum + g.cost, 0);
  const bought = spentOn(shown);

  return (
    <>
      <PageTitle
        sub={
          gifts.length === 0
            ? "Nothing yet."
            : `${shown.length} of ${gifts.length} ${gifts.length === 1 ? "gift" : "gifts"} · ${moneyExact(bought)} bought${
                total > bought ? `, ${moneyExact(total - bought)} in ideas` : ""
              }`
        }
      >
        All gifts
      </PageTitle>

      <section aria-label="Filter and sort" className="card flex flex-col gap-3 p-4">
        <input
          type="search"
          aria-label="Search gifts"
          placeholder="Search name, store, notes, tracking…"
          defaultValue={q}
          onChange={(e) => set("q", e.target.value || null)}
          className="field"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <Picker label="Person" value={personId ?? ""} onChange={(v) => set("person", v || null)}>
            <option value="">Everyone</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Picker>
          <Picker label="Status" value={status} onChange={(v) => set("status", v === "all" ? null : v)}>
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </Picker>
          <Picker label="Store" value={stores.find((s) => s.toLowerCase() === store?.toLowerCase()) ?? ""} onChange={(v) => set("store", v || null)}>
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Picker>
          <Picker label="Sort by" value={sort} onChange={(v) => set("sort", v === "added" ? null : v)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Picker>
        </div>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              latest.current = sort === "added" ? "" : `sort=${sort}`;
              router.replace(sort === "added" ? pathname : `${pathname}?sort=${sort}`, { scroll: false });
            }}
            className="min-h-9 self-start text-[14px] font-semibold text-pine"
          >
            Clear filters
          </button>
        )}
      </section>

      {shown.length === 0 ? (
        <p className="card p-4 text-[14px] text-muted">
          {gifts.length === 0 ? "No gifts or ideas yet. Add someone on the People tab, then their gifts." : "No gifts match these filters."}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shown.map((g) => (
            <GiftCard key={g.id} gift={g} late={isLate(g, today)} personName={personId ? undefined : personName(g.person_id)} />
          ))}
        </div>
      )}

      {people.length > 0 && (
        <Link
          href={personId ? `/gifts/new?person=${personId}` : "/gifts/new"}
          aria-label="Add gift"
          className="fixed right-5 bottom-[calc(max(env(safe-area-inset-bottom),10px)+84px)] z-10 flex h-14 w-14 items-center justify-center rounded-[18px] bg-berry text-white shadow-[0_6px_16px_rgba(28,27,25,0.22)] min-[440px]:right-[calc(50%-200px)]"
        >
          <PlusIcon size={26} />
        </Link>
      )}
    </>
  );
}

function Picker({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field min-w-0 pr-7 text-[14px]">
        {children}
      </select>
    </div>
  );
}
