"use client";

import { useTransition } from "react";
import { dismissInbound, undoInbound, type Result } from "@/lib/mutations";
import { useData } from "@/lib/store";

function useRun() {
  const { reload } = useData();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      await fn();
      await reload();
    });
  return [pending, run] as const;
}

export function UndoButton({ id }: { id: string }) {
  const [pending, run] = useRun();
  return (
    <button type="button" disabled={pending} onClick={() => run(() => undoInbound(id))} className="min-h-9 px-1 text-[13px] font-semibold text-pine">
      {pending ? "Undoing…" : "Undo"}
    </button>
  );
}

export function DismissButton({ id, label = "Dismiss" }: { id: string; label?: string }) {
  const [pending, run] = useRun();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => dismissInbound(id))}
      className="min-h-9 px-1 text-[13px] font-semibold text-muted"
    >
      {label}
    </button>
  );
}
