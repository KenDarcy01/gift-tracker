import { describe, expect, it } from "vitest";
import { filterGifts, sortGifts, storesOf } from "./gift-list";
import type { Gift } from "./types";

let n = 0;
const G = (p: Partial<Gift>): Gift => ({
  id: `g${++n}`, person_id: "p1", name: "Gift", url: null, store: null, cost: 0, status: "idea", carrier: null,
  tracking_number: null, tracking_url: null, expected_delivery: null, delivered_on: null, order_ref: null, notes: null,
  created_at: `2026-11-0${n}`, updated_at: "", ...p,
});
const today = "2026-11-13";
const gifts = [
  G({ name: "Scarf", person_id: "mum", store: "John Lewis", cost: 79, status: "shipped", expected_delivery: "2026-11-16" }),
  G({ name: "Lego", person_id: "jack", store: "Argos", cost: 44.99, status: "shipped", expected_delivery: "2026-11-10" }),
  G({ name: "Book", person_id: "emma", store: "john lewis", cost: 27, status: "idea" }),
  G({ name: "Bracelet", person_id: "emma", store: "John Lewis", cost: 85, status: "delivered", delivered_on: "2026-11-04" }),
];
const names: Record<string, string> = { mum: "Mum", jack: "Jack", emma: "Emma" };

describe("filterGifts", () => {
  it("filters by person, status group, store and text", () => {
    expect(filterGifts(gifts, { person: "emma" }, today).map((g) => g.name)).toEqual(["Book", "Bracelet"]);
    expect(filterGifts(gifts, { status: "late" }, today).map((g) => g.name)).toEqual(["Lego"]);
    expect(filterGifts(gifts, { status: "bought" }, today)).toHaveLength(3);
    expect(filterGifts(gifts, { store: "John Lewis" }, today)).toHaveLength(3);
    expect(filterGifts(gifts, { q: "leg" }, today).map((g) => g.name)).toEqual(["Lego"]);
  });
});

describe("sortGifts", () => {
  it("sorts by cost, person and delivery date (undated last)", () => {
    expect(sortGifts(gifts, "cost-desc", (id) => names[id]).map((g) => g.name)).toEqual(["Bracelet", "Scarf", "Lego", "Book"]);
    expect(sortGifts(gifts, "person", (id) => names[id]).map((g) => g.name)).toEqual(["Book", "Bracelet", "Lego", "Scarf"]);
    expect(sortGifts(gifts, "delivery", (id) => names[id]).map((g) => g.name)).toEqual(["Bracelet", "Lego", "Scarf", "Book"]);
  });
});

it("lists stores once each", () => {
  expect(storesOf(gifts)).toEqual(["Argos", "John Lewis"]);
});
