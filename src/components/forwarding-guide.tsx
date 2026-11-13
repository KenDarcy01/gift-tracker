"use client";

import { useState } from "react";

const SENDERS = ["amazon.co.uk", "argos.co.uk", "johnlewis.com", "boots.com", "royalmail.com", "evri.com", "dpd.co.uk"];

export function ForwardingGuide() {
  const [tab, setTab] = useState<"gmail" | "outlook">("gmail");
  const tabClass = (on: boolean) =>
    `min-h-10 rounded-[9px] text-[14px] font-semibold ${on ? "bg-card text-ink shadow-sm" : "text-muted"}`;
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Email provider" className="grid grid-cols-2 gap-1 rounded-xl bg-line-soft p-1">
        <button type="button" role="tab" aria-selected={tab === "gmail"} onClick={() => setTab("gmail")} className={tabClass(tab === "gmail")}>
          Gmail
        </button>
        <button type="button" role="tab" aria-selected={tab === "outlook"} onClick={() => setTab("outlook")} className={tabClass(tab === "outlook")}>
          Outlook
        </button>
      </div>
      {tab === "gmail" ? (
        <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-[14px] leading-normal">
          <li>
            On a computer, open Gmail › Settings › <strong>See all settings</strong> › <strong>Forwarding and POP/IMAP</strong>. Add
            your gift address. Gmail&apos;s confirmation email will appear in this app&apos;s Inbox with the code.
          </li>
          <li>
            In the Gmail search bar, open search options and paste this into <strong>From</strong>:
            <span className="mt-1.5 block rounded-lg bg-ground px-2.5 py-2 font-mono text-[12px] leading-normal break-words">
              {SENDERS.join(" OR ")}
            </span>
          </li>
          <li>
            Click <strong>Create filter</strong>, tick <strong>Forward it to</strong> and pick your gift address.
          </li>
        </ol>
      ) : (
        <>
          <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-[14px] leading-normal">
            <li>
              On outlook.com, open Settings › <strong>Mail</strong> › <strong>Rules</strong> › <strong>Add new rule</strong>.
            </li>
            <li>
              Condition: <strong>From</strong> contains {SENDERS.join(", ")}.
            </li>
            <li>
              Action: <strong>Forward to</strong> your gift address, then Save.
            </li>
          </ol>
          <p className="text-[12px] font-semibold text-amber-ink">Some work Outlook accounts block auto-forwarding. Forward by hand if so.</p>
        </>
      )}
    </div>
  );
}
