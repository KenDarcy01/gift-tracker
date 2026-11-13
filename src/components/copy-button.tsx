"use client";

import { useState } from "react";
import { CopyIcon } from "./icons";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
      className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-[10px] bg-pine px-3.5 text-[14px] font-semibold text-white"
    >
      <CopyIcon size={16} />
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
