"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/bits";
import { CopyButton } from "@/components/copy-button";
import { ForwardingGuide } from "@/components/forwarding-guide";
import { ChevronIcon, MailIcon } from "@/components/icons";
import { SettingsForm } from "@/components/settings-form";
import { useData } from "@/lib/store";
import { inboxAddress, supabase } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { profile, people } = useData();
  const router = useRouter();
  const address = inboxAddress(profile.inbox_token);
  const allocated = people.reduce((sum, p) => sum + p.budget, 0);

  return (
    <>
      <PageTitle>Settings</PageTitle>

      <section aria-labelledby="addr-h" className="card flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <MailIcon size={20} className="text-pine" />
          <h2 id="addr-h" className="text-[16px] font-bold">Your gift inbox address</h2>
        </div>
        {address ? (
          <>
            <p className="text-[13px] leading-normal text-muted">
              Forward order and shipping emails here and they show up in your Inbox. It&apos;s private to you.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-ground py-1.5 pr-1.5 pl-3">
              <span className="min-w-0 flex-1 font-mono text-[13.5px] font-semibold break-all">{address}</span>
              <CopyButton text={address} />
            </div>
            <p className="text-[12px] text-muted">Anyone who knows this address can add emails to your Inbox, so keep it to yourself.</p>
          </>
        ) : (
          <p className="text-[13px] leading-normal text-muted">Email forwarding isn&apos;t switched on for this app yet.</p>
        )}
      </section>

      {address && (
        <section aria-labelledby="fwd-h" className="card flex flex-col gap-3 p-4">
          <h2 id="fwd-h" className="text-[16px] font-bold">Set up auto-forwarding</h2>
          <p className="text-[13px] leading-normal text-muted">
            A one-off filter sends shop emails here automatically, so you never have to forward them by hand.
          </p>
          <ForwardingGuide />
          <p className="rounded-[10px] bg-amber-soft px-3 py-2.5 text-[13px] leading-normal text-[#5c3300]">
            <strong>Tip:</strong> filters only catch new emails. Forward any orders you&apos;ve already placed by hand, one at a time.
          </p>
        </section>
      )}

      <section aria-labelledby="budget-h" className="card flex flex-col gap-3.5 p-4">
        <h2 id="budget-h" className="text-[16px] font-bold">Budgets</h2>
        <SettingsForm overall={profile.overall_budget} warn={profile.warn_pct} allocated={allocated} peopleCount={people.length} />
        <Link href="/people" className="flex min-h-11 items-center justify-between border-t border-line-soft pt-1.5 text-[15px] font-semibold text-pine">
          Per-person budgets
          <ChevronIcon size={18} />
        </Link>
      </section>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={async () => {
            await supabase().auth.signOut();
            router.replace("/login/");
          }}
          className="min-h-11 text-[15px] font-semibold text-muted"
        >
          Sign out
        </button>
      </div>
    </>
  );
}
