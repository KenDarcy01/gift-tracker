"use client";

import { useState, type FormEvent } from "react";
import { cancelInvite, invitePartner, leaveHousehold } from "@/lib/mutations";
import { useData } from "@/lib/store";
import { basePath } from "@/lib/supabase/client";
import { ConfirmButton } from "./confirm-button";
import { FormError } from "./bits";
import { PeopleIcon } from "./icons";

/** Who shares this gift list, and inviting someone new. */
export function SharingCard() {
  const { sharing, reload } = useData();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string>();
  const members = sharing.filter((p) => p.kind === "member");
  const invites = sharing.filter((p) => p.kind === "invite");
  const appUrl = typeof window === "undefined" ? "" : `${window.location.origin}${basePath}/`;

  async function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    if (!email) return;
    setPending(true);
    const result = await invitePartner(email);
    setPending(false);
    setError(result.error);
    if (!result.error) {
      setSent(email.toLowerCase());
      form.reset();
      await reload();
    }
  }

  async function run(fn: () => Promise<{ error?: string }>) {
    const result = await fn();
    setError(result.error);
    await reload();
  }

  return (
    <section aria-labelledby="share-h" className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <PeopleIcon size={20} className="text-pine" />
        <h2 id="share-h" className="text-[16px] font-bold">Shared with</h2>
      </div>
      <p className="text-[13px] leading-normal text-muted">
        Everyone here sees and changes the same people, gifts and budgets, and can forward emails to the inbox address.
      </p>

      <ul className="flex flex-col divide-y divide-line-soft rounded-xl border border-line">
        {members.map((m) => (
          <li key={m.id} className="flex min-h-12 items-center justify-between gap-2 px-3 py-2">
            <span className="min-w-0 truncate text-[14px] font-semibold">{m.email}</span>
            <span className="text-[12px] text-muted">{m.is_me ? "You" : "Sharing"}</span>
          </li>
        ))}
        {invites.map((i) => (
          <li key={i.id} className="flex min-h-12 items-center justify-between gap-2 px-3 py-2">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[14px] font-semibold">{i.email}</span>
              <span className="text-[12px] text-muted">Invited · joins when they sign in</span>
            </span>
            <button type="button" onClick={() => run(() => cancelInvite(i.id))} className="min-h-9 px-1 text-[13px] font-semibold text-muted">
              Cancel
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={onInvite} className="flex flex-col gap-2">
        <label htmlFor="invite-email" className="label">Invite someone by email</label>
        <div className="flex gap-2">
          <input id="invite-email" name="email" type="email" autoComplete="off" placeholder="name@example.com" className="field min-w-0 flex-1" />
          <button type="submit" disabled={pending} className="btn-primary shrink-0">
            {pending ? "Inviting…" : "Invite"}
          </button>
        </div>
        <FormError message={error} />
        {sent && !error && (
          <p role="status" className="rounded-[10px] bg-ground px-3 py-2.5 text-[13px] leading-normal">
            Invited. Send <strong>{sent}</strong> this link and ask them to sign in with that email:{" "}
            <span className="font-mono break-all">{appUrl}</span>
          </p>
        )}
      </form>

      {members.length > 1 && (
        <div className="border-t border-line-soft pt-2">
          <ConfirmButton
            label="Leave this shared list"
            confirmLabel="Tap again to leave (gifts stay with the others)"
            onConfirm={() => run(leaveHousehold)}
          />
        </div>
      )}
    </section>
  );
}
