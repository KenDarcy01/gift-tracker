import { STATUS_LABEL, countsAsSpent, inTransit, isLate } from "./gifts";
import { STATUSES, type Gift, type GiftStatus } from "./types";

/** Status filter: one status, or a group. */
export type StatusFilter = "all" | GiftStatus | "bought" | "in-transit" | "late";
export type GiftSort = "added" | "delivery" | "cost-desc" | "cost-asc" | "person" | "name";

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "bought", label: "Bought (counts to budget)" },
  { value: "in-transit", label: "On the way" },
  { value: "late", label: "Late" },
  ...STATUSES.map((s) => ({ value: s as StatusFilter, label: STATUS_LABEL[s] })),
];

export const SORTS: { value: GiftSort; label: string }[] = [
  { value: "added", label: "Newest first" },
  { value: "delivery", label: "Delivery date" },
  { value: "cost-desc", label: "Cost, highest first" },
  { value: "cost-asc", label: "Cost, lowest first" },
  { value: "person", label: "Person" },
  { value: "name", label: "Gift name" },
];

export function isStatusFilter(v: string | null): v is StatusFilter {
  return !!v && STATUS_FILTERS.some((f) => f.value === v);
}
export function isSort(v: string | null): v is GiftSort {
  return !!v && SORTS.some((s) => s.value === v);
}

export type GiftFilters = { person?: string | null; status?: StatusFilter; store?: string | null; q?: string | null };

function matchesStatus(g: Gift, status: StatusFilter, today: string): boolean {
  switch (status) {
    case "all":
      return true;
    case "bought":
      return countsAsSpent(g.status);
    case "in-transit":
      return inTransit(g.status);
    case "late":
      return isLate(g, today);
    default:
      return g.status === status;
  }
}

export function filterGifts(gifts: Gift[], f: GiftFilters, today: string): Gift[] {
  const q = f.q?.trim().toLowerCase();
  const store = f.store?.toLowerCase();
  return gifts.filter(
    (g) =>
      (!f.person || g.person_id === f.person) &&
      matchesStatus(g, f.status ?? "all", today) &&
      (!store || (g.store ?? "").toLowerCase() === store) &&
      (!q || [g.name, g.store, g.notes, g.tracking_number, g.order_ref].some((v) => v?.toLowerCase().includes(q))),
  );
}

/** The date a gift arrives or arrived; undefined for ideas with no date. */
function deliveryDate(g: Gift): string | undefined {
  return g.delivered_on ?? g.expected_delivery ?? undefined;
}

export function sortGifts(gifts: Gift[], sort: GiftSort, personName: (id: string) => string): Gift[] {
  const byName = (a: Gift, b: Gift) => a.name.localeCompare(b.name);
  const cmp: Record<GiftSort, (a: Gift, b: Gift) => number> = {
    added: (a, b) => b.created_at.localeCompare(a.created_at),
    delivery: (a, b) => {
      const da = deliveryDate(a), db = deliveryDate(b);
      if (da && db) return da.localeCompare(db) || byName(a, b);
      return da ? -1 : db ? 1 : byName(a, b); // undated last
    },
    "cost-desc": (a, b) => b.cost - a.cost || byName(a, b),
    "cost-asc": (a, b) => a.cost - b.cost || byName(a, b),
    person: (a, b) => personName(a.person_id).localeCompare(personName(b.person_id)) || byName(a, b),
    name: byName,
  };
  return [...gifts].sort(cmp[sort]);
}

/** Distinct store names, A to Z, ignoring case differences. */
export function storesOf(gifts: Gift[]): string[] {
  const seen = new Map<string, string>();
  for (const g of gifts) if (g.store && !seen.has(g.store.toLowerCase())) seen.set(g.store.toLowerCase(), g.store);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
