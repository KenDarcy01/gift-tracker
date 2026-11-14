export const STATUSES = ["idea", "purchased", "shipped", "delivered", "wrapped", "given"] as const;
export type GiftStatus = (typeof STATUSES)[number];

/** A shared gift list: everyone in it sees the same people, gifts, budgets and inbox. */
export type Profile = {
  id: string; // household id
  overall_budget: number;
  warn_pct: number;
  currency: string;
  inbox_token: string;
};

/** Someone sharing the list, or invited to. */
export type SharePerson = { kind: "member" | "invite"; id: string; email: string; is_me: boolean; since: string };

export type Person = {
  id: string;
  name: string;
  relation: string | null;
  budget: number;
  sizes: string | null;
  notes: string | null;
  created_at: string;
};

export type Gift = {
  id: string;
  person_id: string;
  name: string;
  url: string | null;
  store: string | null;
  cost: number;
  status: GiftStatus;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  expected_delivery: string | null;
  delivered_on: string | null;
  order_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ExtractedEmail = {
  kind: "order" | "shipping" | "unknown";
  store: string | null;
  order_ref: string | null;
  items: { name: string; price: number | null }[];
  total: number | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  expected_delivery: string | null;
  delivery_status: "dispatched" | "out_for_delivery" | "delivered" | "delayed" | null;
};

export type InboundEmail = {
  id: string;
  provider_id: string;
  from_address: string | null;
  subject: string | null;
  received_at: string;
  kind: "order" | "shipping" | "unknown";
  state: "needs_person" | "added" | "applied" | "unreadable" | "dismissed";
  extracted: ExtractedEmail | null;
  summary: string | null;
  suggested_person_id: string | null;
  gift_id: string | null;
};
