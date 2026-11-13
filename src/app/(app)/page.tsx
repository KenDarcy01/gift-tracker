import Link from "next/link";
import { AlertIcon, ChevronIcon, MailIcon, PlusIcon } from "@/components/icons";
import { StatusChip } from "@/components/bits";
import { countNeedsPerson, getProfile, listGifts, listPeople } from "@/lib/data";
import { addDays, christmasYear, dayParts, daysBetween, daysToChristmas, longDate, shortDate, todayISO } from "@/lib/dates";
import { inTransit, isLate, spentOn } from "@/lib/gifts";
import { moneyExact } from "@/lib/money";
import { STATUSES } from "@/lib/types";

export default async function DashboardPage() {
  const [profile, people, gifts, needsPerson] = await Promise.all([getProfile(), listPeople(), listGifts(), countNeedsPerson()]);
  const today = todayISO();
  const personName = new Map(people.map((p) => [p.id, p.name]));

  const spent = spentOn(gifts);
  const budget = profile.overall_budget;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const late = gifts.filter((g) => isLate(g, today)).sort((a, b) => a.expected_delivery!.localeCompare(b.expected_delivery!));
  const weekEnd = addDays(today, 6);
  const arriving = gifts
    .filter((g) => inTransit(g.status) && g.expected_delivery && g.expected_delivery >= today && g.expected_delivery <= weekEnd)
    .sort((a, b) => a.expected_delivery!.localeCompare(b.expected_delivery!));
  const days = daysToChristmas(today);

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-medium text-muted">{longDate(today)}</p>
          <h1 className="font-display text-[30px] leading-[1.1] font-bold">Christmas {christmasYear(today)}</h1>
        </div>
        <p className="mt-1 rounded-full border border-line bg-card px-3 py-2 text-[13px] font-semibold whitespace-nowrap text-pine">
          {days === 0 ? "It's Christmas!" : `${days} ${days === 1 ? "day" : "days"} to go`}
        </p>
      </header>

      <section aria-label="Budget" className="flex flex-col gap-3.5 rounded-[20px] bg-pine p-5 text-white">
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] font-medium text-pine-soft">Spent so far</p>
          <p className="font-display text-[40px] leading-[1.1] font-bold">{moneyExact(spent)}</p>
          <p className="text-[14px] text-pine-soft">
            {budget > 0 ? `of your ${moneyExact(budget)} budget` : <Link href="/settings" className="text-white underline">Set an overall budget</Link>}
          </p>
        </div>
        {budget > 0 && (
          <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-white/20">
            <div className={`h-full rounded-full ${spent > budget ? "bg-berry-line" : "bg-gold"}`} style={{ width: `${pct}%` }} />
          </div>
        )}
        <div className="flex justify-between text-[13px] font-medium">
          <span>{budget > 0 ? (spent > budget ? `${moneyExact(spent - budget)} over` : `${moneyExact(budget - spent)} left`) : ""}</span>
          <span>
            {gifts.length} {gifts.length === 1 ? "gift" : "gifts"} · {people.length} {people.length === 1 ? "person" : "people"}
          </span>
        </div>
      </section>

      {people.length === 0 && (
        <Link href="/people/new" className="card flex items-center gap-3 p-4">
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">Add the first person on your list</span>
            <span className="block text-[13px] text-muted">Then add gift ideas for them.</span>
          </span>
          <ChevronIcon size={18} className="text-muted" />
        </Link>
      )}

      {late.length > 0 && (
        <section aria-label="Late deliveries" className="flex flex-col gap-2.5 rounded-2xl border border-berry-line bg-berry-soft p-4">
          <div className="flex items-center gap-2 text-berry-dark">
            <AlertIcon size={20} />
            <h2 className="text-[15px] font-bold">
              {late.length} late {late.length === 1 ? "delivery" : "deliveries"}
            </h2>
          </div>
          {late.map((g) => {
            const overdue = daysBetween(g.expected_delivery!, today);
            return (
              <Link key={g.id} href={`/gifts/${g.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-card px-3.5 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{g.name}</span>
                  <span className="text-[13px] text-muted">
                    For {personName.get(g.person_id)}
                    {g.store ? ` · ${g.store}` : ""}
                  </span>
                  <span className="text-[13px] font-semibold text-berry-dark">
                    Due {shortDate(g.expected_delivery!)} · {overdue} {overdue === 1 ? "day" : "days"} late
                  </span>
                </span>
                <span className="text-[13px] font-semibold whitespace-nowrap text-pine">{g.tracking_url ? "Track" : "Open"}</span>
              </Link>
            );
          })}
        </section>
      )}

      <section aria-labelledby="status-h" className="flex flex-col gap-2.5">
        <h2 id="status-h" className="text-[16px] font-bold">Gifts by status</h2>
        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <div key={s} className="card flex flex-col gap-1.5 rounded-[14px] p-3">
              <span className="font-display text-[26px] font-bold">{gifts.filter((g) => g.status === s).length}</span>
              <StatusChip status={s} className="self-start" />
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="arriving-h" className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 id="arriving-h" className="text-[16px] font-bold">Arriving this week</h2>
          <span className="text-[13px] text-muted">
            {arriving.length} {arriving.length === 1 ? "parcel" : "parcels"}
          </span>
        </div>
        {arriving.length === 0 ? (
          <p className="card px-4 py-3.5 text-[14px] text-muted">Nothing due in the next 7 days.</p>
        ) : (
          <ul className="card divide-y divide-line-soft">
            {arriving.map((g) => {
              const { weekday, day } = dayParts(g.expected_delivery!);
              return (
                <li key={g.id}>
                  <Link href={`/gifts/${g.id}`} className="flex items-center gap-3.5 px-4 py-3.5">
                    <span className="flex w-[46px] shrink-0 flex-col items-center rounded-[10px] bg-ground py-1.5">
                      <span className="text-[11px] font-bold text-muted">{weekday}</span>
                      <span className="text-[18px] font-bold">{day}</span>
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">{g.name}</span>
                      <span className="text-[13px] text-muted">
                        For {personName.get(g.person_id)}
                        {g.store ? ` · ${g.store}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {needsPerson > 0 && (
        <Link href="/inbox" className="card flex min-h-11 items-center gap-3 px-4 py-3.5">
          <MailIcon className="text-pine" />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">
              {needsPerson} new {needsPerson === 1 ? "order needs" : "orders need"} a person
            </span>
            <span className="text-[13px] text-muted">From forwarded emails</span>
          </span>
          <ChevronIcon size={18} className="text-muted" />
        </Link>
      )}

      {people.length > 0 && (
        <Link
          href="/gifts/new"
          aria-label="Add gift"
          className="fixed right-5 bottom-[calc(max(env(safe-area-inset-bottom),10px)+84px)] z-10 flex h-14 w-14 items-center justify-center rounded-[18px] bg-berry text-white shadow-[0_6px_16px_rgba(28,27,25,0.22)] min-[440px]:right-[calc(50%-200px)]"
        >
          <PlusIcon size={26} />
        </Link>
      )}
    </>
  );
}
