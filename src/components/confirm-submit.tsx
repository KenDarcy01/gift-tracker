"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/** A destructive submit button that needs a second tap to confirm. */
export function ConfirmSubmit({ label, confirmLabel }: { label: string; confirmLabel: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  return (
    <button
      type={armed ? "submit" : "button"}
      disabled={pending}
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      className={`min-h-11 rounded-xl px-4 text-[15px] font-semibold ${armed ? "bg-berry text-white" : "text-berry"}`}
    >
      {pending ? "Deleting…" : armed ? confirmLabel : label}
    </button>
  );
}
