import Link from "next/link";
import { getCarrier } from "@/lib/carriers";
import { shortDate } from "@/lib/dates";
import { STATUS_BAR, inTransit } from "@/lib/gifts";
import { money, moneyExact } from "@/lib/money";
import { STATUSES, type Gift } from "@/lib/types";
import { StatusChip } from "./bits";
import { PeopleIcon, TruckIcon } from "./icons";

/** One gift as a tappable card: name, store, cost, status and delivery progress. */
export function GiftCard({
  gift: g,
  late,
  personName,
  wouldBeOverBy = 0,
}: {
  gift: Gift;
  late: boolean;
  /** Shown under the name in lists that mix people. */
  personName?: string;
  /** For ideas: how far over budget buying it would take the person. */
  wouldBeOverBy?: number;
}) {
  const step = STATUSES.indexOf(g.status);
  const idea = g.status === "idea";

  return (
    <Link
      href={`/gifts/edit?id=${g.id}`}
      className={`card flex flex-col gap-2.5 px-4 py-3.5 ${idea ? "border-dashed border-[#cfc6b6]" : ""} ${late ? "border-berry-line" : ""}`}
    >
      {personName && (
        <span className="flex items-center gap-1.5 self-start rounded-full bg-pine py-1 pr-3 pl-2 text-[13px] font-bold text-white">
          <PeopleIcon size={14} />
          For {personName}
        </span>
      )}
      <span className="flex justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{g.name}</span>
          {g.store && <span className="text-[13px] text-muted">{g.store}</span>}
        </span>
        <span className={`text-[15px] font-semibold whitespace-nowrap ${idea ? "text-muted" : ""}`}>
          {idea && g.cost > 0 ? "~" : ""}
          {moneyExact(g.cost)}
        </span>
      </span>
      <span className="flex items-center justify-between gap-2">
        <StatusChip status={g.status} />
        <GiftMeta gift={g} late={late} carrier={getCarrier(g.carrier)?.name} wouldBeOverBy={wouldBeOverBy} />
      </span>
      {!idea && (
        <span aria-label={`Progress: ${g.status}, step ${step + 1} of 6`} className="grid grid-cols-6 gap-1">
          {STATUSES.map((s, i) => (
            <span key={s} className={`h-1 rounded-sm ${i <= step ? STATUS_BAR[g.status] : "bg-line"}`} />
          ))}
        </span>
      )}
    </Link>
  );
}

function GiftMeta({ gift, late, carrier, wouldBeOverBy }: { gift: Gift; late: boolean; carrier?: string; wouldBeOverBy: number }) {
  if (gift.status === "idea") {
    return wouldBeOverBy > 0 ? (
      <span className="text-[13px] font-semibold text-berry">Would take them {money(wouldBeOverBy)} over</span>
    ) : (
      <span className="text-[13px] text-muted">Not bought yet</span>
    );
  }
  if (late) {
    return <span className="text-[13px] font-semibold text-berry">Late · was due {shortDate(gift.expected_delivery!)}</span>;
  }
  if (inTransit(gift.status) && (carrier || gift.expected_delivery)) {
    return (
      <span className="flex items-center gap-1.5 text-right text-[13px] text-muted">
        <TruckIcon size={16} className="shrink-0" />
        {[carrier, gift.expected_delivery ? `arriving ${shortDate(gift.expected_delivery)}` : null].filter(Boolean).join(" · ")}
      </span>
    );
  }
  if (gift.delivered_on && gift.status === "delivered") {
    return <span className="text-[13px] text-muted">Delivered {shortDate(gift.delivered_on)}</span>;
  }
  return null;
}
