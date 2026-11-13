import type { Gift, GiftStatus } from "./types";

export const STATUS_LABEL: Record<GiftStatus, string> = {
  idea: "Idea",
  purchased: "Purchased",
  shipped: "Shipped",
  delivered: "Delivered",
  wrapped: "Wrapped",
  given: "Given",
};

/** Tailwind classes for each status chip (background + text). */
export const STATUS_CHIP: Record<GiftStatus, string> = {
  idea: "bg-st-idea-bg text-st-idea",
  purchased: "bg-st-purchased-bg text-st-purchased",
  shipped: "bg-st-shipped-bg text-st-shipped",
  delivered: "bg-st-delivered-bg text-st-delivered",
  wrapped: "bg-st-wrapped-bg text-st-wrapped",
  given: "bg-st-given-bg text-st-given",
};

export const STATUS_BAR: Record<GiftStatus, string> = {
  idea: "bg-st-idea",
  purchased: "bg-st-purchased",
  shipped: "bg-st-shipped",
  delivered: "bg-st-delivered",
  wrapped: "bg-st-wrapped",
  given: "bg-st-given",
};

/** Ideas aren't money spent yet; everything from Purchased on is. */
export function countsAsSpent(status: GiftStatus): boolean {
  return status !== "idea";
}

export function spentOn(gifts: Pick<Gift, "cost" | "status">[]): number {
  return round2(gifts.filter((g) => countsAsSpent(g.status)).reduce((sum, g) => sum + Number(g.cost), 0));
}

export function ideasTotal(gifts: Pick<Gift, "cost" | "status">[]): number {
  return round2(gifts.filter((g) => g.status === "idea").reduce((sum, g) => sum + Number(g.cost), 0));
}

export type BudgetLevel = "ok" | "near" | "over";

export function budgetLevel(spent: number, budget: number, warnPct: number): BudgetLevel {
  if (budget <= 0) return spent > 0 ? "over" : "ok";
  if (spent > budget + 0.004) return "over";
  if ((spent / budget) * 100 >= warnPct) return "near";
  return "ok";
}

export function budgetPct(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 100 : 0;
  return Math.min(100, Math.round((spent / budget) * 100));
}

/** A parcel is in transit while it's bought or shipped but not yet delivered. */
export function inTransit(status: GiftStatus): boolean {
  return status === "purchased" || status === "shipped";
}

export function isLate(gift: Pick<Gift, "status" | "expected_delivery">, today: string): boolean {
  return inTransit(gift.status) && !!gift.expected_delivery && gift.expected_delivery < today;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
