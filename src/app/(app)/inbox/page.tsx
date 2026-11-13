import Link from "next/link";
import { PageTitle } from "@/components/bits";
import { InboxOrderCard } from "@/components/inbox-order-card";
import { DismissButton, UndoButton } from "@/components/undo-button";
import { getProfile, inboxAddress, listGifts, listInbound, listPeople } from "@/lib/data";
import { receivedLabel } from "@/lib/dates";
import { spentOn } from "@/lib/gifts";

export default async function InboxPage() {
  const [emails, people, gifts, profile] = await Promise.all([listInbound(), listPeople(), listGifts(), getProfile()]);
  const address = inboxAddress(profile.inbox_token);
  const personName = new Map(people.map((p) => [p.id, p.name]));
  const giftById = new Map(gifts.map((g) => [g.id, g]));
  const options = people.map((p) => ({
    id: p.id,
    name: p.name,
    budget: p.budget,
    left: p.budget - spentOn(gifts.filter((g) => g.person_id === p.id)),
  }));

  const needs = emails.filter((e) => e.state === "needs_person" && e.extracted);
  const done = emails.filter((e) => e.state === "applied" || e.state === "added");
  const unreadable = emails.filter((e) => e.state === "unreadable");

  return (
    <>
      <PageTitle sub="Order and shipping emails you forward land here. We read the store, items, price and tracking for you.">
        Inbox
      </PageTitle>

      {emails.length === 0 && (
        <div className="card flex flex-col gap-2 p-4 text-[14px] leading-normal">
          <p className="font-semibold">Nothing here yet.</p>
          {address ? (
            <p className="text-muted">
              Forward a shop email to <span className="font-mono font-semibold text-ink break-all">{address}</span>, or{" "}
              <Link href="/settings" className="font-semibold text-pine">set up auto-forwarding</Link>.
            </p>
          ) : (
            <p className="text-muted">Email forwarding isn&apos;t switched on for this app yet.</p>
          )}
        </div>
      )}

      {needs.length > 0 && (
        <section aria-labelledby="needs-h" className="flex flex-col gap-2.5">
          <h2 id="needs-h" className="text-[16px] font-bold">Needs a person ({needs.length})</h2>
          {needs.map((e) => (
            <InboxOrderCard
              key={e.id}
              id={e.id}
              received={receivedLabel(e.received_at)}
              extracted={e.extracted!}
              people={options}
              suggestedId={e.suggested_person_id}
              reason={e.summary}
            />
          ))}
        </section>
      )}

      {done.length > 0 && (
        <section aria-labelledby="done-h" className="flex flex-col gap-2.5">
          <h2 id="done-h" className="text-[16px] font-bold">Recently filed</h2>
          <ul className="card divide-y divide-line-soft">
            {done.slice(0, 20).map((e) => {
              const gift = e.gift_id ? giftById.get(e.gift_id) : undefined;
              const who = gift ? personName.get(gift.person_id) : undefined;
              return (
                <li key={e.id} className="flex flex-col gap-1 px-4 py-3.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-[12px] font-bold tracking-wide text-muted uppercase">
                      {e.extracted?.store ?? e.from_address ?? "Email"} · {receivedLabel(e.received_at)}
                    </span>
                    <UndoButton id={e.id} />
                  </div>
                  {gift ? (
                    <Link href={`/gifts/${gift.id}`} className="text-[15px] font-semibold">
                      {gift.name}
                      {who ? ` for ${who}` : ""}
                    </Link>
                  ) : (
                    <span className="text-[15px] font-semibold">{e.subject}</span>
                  )}
                  <span className="text-[13px] text-muted">
                    {e.state === "added" ? "Added to their gifts" : `Updated automatically: ${e.summary ?? ""}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {unreadable.length > 0 && (
        <section aria-labelledby="unread-h" className="flex flex-col gap-2.5">
          <h2 id="unread-h" className="text-[16px] font-bold">Couldn&apos;t read ({unreadable.length})</h2>
          {unreadable.map((e) => (
            <div key={e.id} className="card flex items-center gap-3 border-dashed border-[#cfc6b6] px-4 py-3.5">
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">&ldquo;{e.subject ?? "No subject"}&rdquo;</span>
                <span className="text-[13px] text-muted">{e.summary ?? "Add the details yourself."}</span>
              </span>
              <span className="flex flex-col items-end">
                <Link href="/gifts/new" className="flex min-h-9 items-center text-[14px] font-semibold text-pine">Add gift</Link>
                <DismissButton id={e.id} />
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
