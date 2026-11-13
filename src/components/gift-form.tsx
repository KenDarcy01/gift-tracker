"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveGift } from "@/lib/mutations";
import { useData } from "@/lib/store";
import { CARRIERS, detectCarrier, getCarrier, trackingUrlFor } from "@/lib/carriers";
import { STATUS_CHIP, STATUS_LABEL } from "@/lib/gifts";
import { STATUSES, type Gift, type GiftStatus, type Person } from "@/lib/types";
import { AlertIcon, CheckIcon, ExternalIcon, TruckIcon } from "./icons";
import { FormError } from "./bits";

type Props = {
  gift?: Gift;
  people: (Person & { left: number })[];
  defaultPersonId?: string;
  today: string;
  returnTo?: string;
};

export function GiftForm({ gift, people, defaultPersonId, today, returnTo }: Props) {
  const router = useRouter();
  const { reload } = useData();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<GiftStatus>(gift?.status ?? "idea");
  const [tracking, setTracking] = useState(gift?.tracking_number ?? "");
  const [carrierChoice, setCarrierChoice] = useState<string>(gift?.carrier ?? "auto");
  const [expected, setExpected] = useState(gift?.expected_delivery ?? "");
  const [url, setUrl] = useState(gift?.url ?? "");

  const detected = useMemo(() => detectCarrier(tracking), [tracking]);
  const carrierId = carrierChoice === "auto" ? detected?.id ?? "" : carrierChoice;
  const carrier = getCarrier(carrierId);
  const builtTrackingUrl = trackingUrlFor(carrierId, tracking);
  const showDelivery = status !== "idea" || Boolean(tracking);
  const late = (status === "purchased" || status === "shipped") && expected !== "" && expected < today;
  const daysLate = late ? Math.round((Date.parse(today) - Date.parse(expected)) / 86_400_000) : 0;
  const safeProductUrl = /^https?:\/\//i.test(url) ? url : url ? `https://${url}` : "";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const result = await saveGift(new FormData(e.currentTarget));
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    await reload();
    router.push(returnTo ?? `/people/view?id=${result.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {gift && <input type="hidden" name="id" value={gift.id} />}
      <input type="hidden" name="carrier" value={carrierId} />
      <FormError message={error} />

      <section aria-label="Gift" className="card flex flex-col gap-3.5 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="person_id" className="label">For</label>
          <select id="person_id" name="person_id" required defaultValue={gift?.person_id ?? defaultPersonId ?? ""} className="field">
            <option value="" disabled>Choose a person</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.budget > 0 ? ` (${p.left < 0 ? `£${(-p.left).toFixed(2)} over` : `£${p.left.toFixed(2)} left`})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="label">Gift</label>
          <input id="name" name="name" required maxLength={200} defaultValue={gift?.name} className="field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="url" className="label">Product link</label>
          <div className="flex gap-2">
            <input
              id="url"
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="field min-w-0 flex-1 text-[14px]"
            />
            {safeProductUrl && (
              <a
                href={safeProductUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open product page"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-field text-pine"
              >
                <ExternalIcon size={18} />
              </a>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="store" className="label">Store</label>
            <input id="store" name="store" list="stores" maxLength={80} defaultValue={gift?.store ?? ""} className="field" />
            <datalist id="stores">
              {["Amazon", "Argos", "John Lewis", "Boots", "M&S", "Next", "Currys", "Etsy", "The White Company", "Lakeland"].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cost" className="label">Cost (£)</label>
            <input id="cost" name="cost" inputMode="decimal" placeholder="0.00" defaultValue={gift ? gift.cost.toFixed(2) : ""} className="field" />
          </div>
        </div>
      </section>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-[15px] font-bold">Status</legend>
        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((s) => {
            const on = status === s;
            return (
              <label
                key={s}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl text-[14px] font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine ${
                  on ? `${STATUS_CHIP[s]} border-2 border-current` : "border border-field bg-card text-muted"
                }`}
              >
                <input type="radio" name="status" value={s} checked={on} onChange={() => setStatus(s)} className="sr-only" />
                {STATUS_LABEL[s]}
              </label>
            );
          })}
        </div>
      </fieldset>

      {showDelivery && (
        <section aria-labelledby="delivery-h" className="card flex flex-col gap-3.5 p-4">
          <h2 id="delivery-h" className="text-[15px] font-bold">Delivery</h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tracking_number" className="label">Tracking number</label>
            <input
              id="tracking_number"
              name="tracking_number"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              className="field font-mono tracking-wide"
            />
            {tracking && carrierChoice === "auto" && detected && (
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-st-delivered">
                <CheckIcon size={16} />
                Looks like {detected.name}, carrier set automatically
              </p>
            )}
            {tracking && carrierChoice === "auto" && !detected && (
              <p className="text-[13px] font-semibold text-amber-ink">Couldn&apos;t recognise this number. Pick the carrier below.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="carrier_choice" className="label">Carrier</label>
            <select id="carrier_choice" value={carrierChoice} onChange={(e) => setCarrierChoice(e.target.value)} className="field">
              <option value="auto">{detected ? `Auto-detect (${detected.name})` : "Auto-detect from tracking number"}</option>
              {CARRIERS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expected_delivery" className="label">Expected delivery</label>
            <input
              id="expected_delivery"
              name="expected_delivery"
              type="date"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              className={`field ${late ? "border-berry-line" : ""}`}
            />
            {late && (
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-berry">
                <AlertIcon size={16} />
                {daysLate} {daysLate === 1 ? "day" : "days"} late.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tracking_url" className="label">Tracking page</label>
            {builtTrackingUrl ? (
              <a href={builtTrackingUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <TruckIcon size={18} />
                Track on {carrier?.name}
              </a>
            ) : null}
            <input
              id="tracking_url"
              name="tracking_url"
              type="url"
              inputMode="url"
              placeholder={builtTrackingUrl ? "Or paste a different tracking link" : "Paste the tracking link from the email"}
              defaultValue={gift?.tracking_url && gift.tracking_url !== trackingUrlFor(gift.carrier, gift.tracking_number) ? gift.tracking_url : ""}
              className="field text-[14px]"
            />
          </div>
        </section>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="label">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={gift?.notes ?? ""} className="field resize-none py-2.5 leading-relaxed" />
      </div>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : gift ? "Save gift" : "Add gift"}
      </button>
    </form>
  );
}
