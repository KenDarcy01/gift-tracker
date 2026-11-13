"use client";

import { useTransition } from "react";
import { dismissInbound, undoInbound } from "@/app/inbox-actions";

export function UndoButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => undoInbound(id))} className="min-h-9 px-1 text-[13px] font-semibold text-pine">
      {pending ? "Undoing…" : "Undo"}
    </button>
  );
}

export function DismissButton({ id, label = "Dismiss" }: { id: string; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => dismissInbound(id))}
      className="min-h-9 px-1 text-[13px] font-semibold text-muted"
    >
      {label}
    </button>
  );
}
