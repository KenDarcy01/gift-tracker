"use client";

import { useState } from "react";

/** A destructive button that needs a second tap to confirm. */
export function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (!armed) return setArmed(true);
        setPending(true);
        await onConfirm();
        setPending(false);
        setArmed(false);
      }}
      onBlur={() => setArmed(false)}
      className={`min-h-11 rounded-xl px-4 text-[15px] font-semibold ${armed ? "bg-berry text-white" : "text-berry"}`}
    >
      {pending ? "Deleting…" : armed ? confirmLabel : label}
    </button>
  );
}
