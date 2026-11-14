import type { SupabaseClient } from "@supabase/supabase-js";
import { gmailForwardingCode, htmlToText, processEmail, tokensFor } from "./inbound.ts";
import type { Extraction } from "./extract.ts";

function assertEquals(actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`expected ${e}\n     got ${a}`);
}

/** A tiny stand-in for the Supabase client: records writes, answers reads from fixed tables. */
function fakeDb(tables: Record<string, Record<string, unknown>[]>) {
  const writes: { table: string; op: string; row: unknown }[] = [];
  const db = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let op = "select";
      let row: unknown;
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        limit: () => q,
        update: (r: unknown) => ((op = "update"), (row = r), q),
        upsert: (r: unknown) => ((op = "upsert"), (row = r), q),
        then(resolve: (v: unknown) => void) {
          if (op !== "select") {
            writes.push({ table, op, row });
            return resolve({ error: null });
          }
          const data = (tables[table] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v));
          resolve({ data, error: null });
        },
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, writes };
}

const email = { providerId: "e1", householdId: "h1", from: "orders@argos.co.uk", subject: "Your order", receivedAt: "2026-11-13T09:00:00Z", text: "..." };
const base: Extraction = {
  kind: "order", store: "Argos", order_ref: "A123", items: [{ name: "Lego set", price: 44.99 }], total: 44.99,
  carrier: null, tracking_number: null, tracking_url: null, expected_delivery: null, delivery_status: null,
  suggested_person: "jack", suggestion_reason: "likes Lego",
};

Deno.test("finds inbox tokens for our domain only", () => {
  assertEquals(tokensFor(["Ken <ab12cd34ef@in.example.com>", "x@other.com", "zz99+tag@IN.example.com"], "in.example.com"), ["ab12cd34ef", "zz99"]);
});

Deno.test("turns HTML into readable text", () => {
  assertEquals(htmlToText('<p>Total&nbsp;&pound;44.99</p><a href="https://t.example/1">Track</a>'), "Total £44.99\nTrack (https://t.example/1)");
});

Deno.test("spots Gmail forwarding codes", () => {
  assertEquals(gmailForwardingCode("forwarding-noreply@google.com", "(#123456789) Gmail Forwarding Confirmation", ""), "123456789");
  assertEquals(gmailForwardingCode("shop@example.com", "#123456789", ""), null);
});

Deno.test("a new order waits for a person, with a suggestion", async () => {
  const { db, writes } = fakeDb({ gift_people: [{ id: "p1", name: "Jack", household_id: "h1" }], gifts: [] });
  await processEmail(db, email, () => Promise.resolve(base));
  assertEquals(writes.length, 1);
  const row = writes[0].row as Record<string, unknown>;
  assertEquals([row.state, row.suggested_person_id, row.summary], ["needs_person", "p1", "likes Lego"]);
});

Deno.test("a dispatch email updates the matching gift and can be undone", async () => {
  const gift = { id: "g1", household_id: "h1", status: "purchased", cost: "44.99", carrier: null, tracking_number: null, tracking_url: null, expected_delivery: null, order_ref: "A123", delivered_on: null };
  const { db, writes } = fakeDb({ gift_people: [], gifts: [gift] });
  await processEmail(db, email, () =>
    Promise.resolve({ ...base, kind: "shipping", tracking_number: "AB 123456789 GB", expected_delivery: "2026-11-17", delivery_status: "dispatched" }),
  );
  const update = writes.find((w) => w.table === "gifts")!.row as Record<string, unknown>;
  assertEquals([update.status, update.carrier, update.tracking_number, update.expected_delivery], ["shipped", "royal-mail", "AB123456789GB", "2026-11-17"]);
  const saved = writes.find((w) => w.table === "gift_inbound_emails")!.row as Record<string, unknown>;
  assertEquals([saved.state, saved.gift_id, (saved.previous_gift as Record<string, unknown>).status], ["applied", "g1", "purchased"]);
  assertEquals(saved.summary, "Purchased to Shipped · due Tue 17 Nov · tracking AB123456789GB added");
});

Deno.test("without an API key the email is kept but not read", async () => {
  const { db, writes } = fakeDb({});
  await processEmail(db, email, null);
  assertEquals((writes[0].row as Record<string, unknown>).state, "unreadable");
});
