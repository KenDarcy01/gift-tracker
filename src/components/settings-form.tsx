"use client";

import { useState, type FormEvent } from "react";
import { saveSettings } from "@/lib/mutations";
import { useData } from "@/lib/store";
import { FormError } from "./bits";

export function SettingsForm({ overall, warn, allocated, peopleCount }: { overall: number; warn: number; allocated: number; peopleCount: number }) {
  const { userId, reload } = useData();
  const [state, setState] = useState<{ error?: string; ok?: boolean }>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const result = await saveSettings(userId, new FormData(e.currentTarget));
    if (!result.error) await reload();
    setState(result.error ? { error: result.error } : { ok: true });
    setPending(false);
  }
  const [warnPct, setWarnPct] = useState(warn);
  const unallocated = overall - allocated;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
      <FormError message={state.error} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="overall_budget" className="label">Overall Christmas budget (£)</label>
        <input id="overall_budget" name="overall_budget" inputMode="decimal" defaultValue={overall.toFixed(2)} className="field" />
        <p className="text-[12px] text-muted">
          £{allocated.toFixed(2)} is shared out between {peopleCount} {peopleCount === 1 ? "person" : "people"}
          {overall > 0 ? (unallocated >= 0 ? `, £${unallocated.toFixed(2)} unallocated.` : `, £${(-unallocated).toFixed(2)} more than the overall budget.`) : "."}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="warn_pct" className="label">Warn me (amber) at {warnPct}% of a budget</label>
        <input
          id="warn_pct"
          name="warn_pct"
          type="range"
          min={50}
          max={100}
          step={5}
          value={warnPct}
          onChange={(e) => setWarnPct(Number(e.target.value))}
          className="accent-amber"
        />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save budgets"}
        </button>
        {state.ok && !pending && <span role="status" className="text-[13px] font-semibold text-st-delivered">Saved</span>}
      </div>
    </form>
  );
}
