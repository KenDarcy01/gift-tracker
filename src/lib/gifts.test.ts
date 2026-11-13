import { describe, expect, it } from "vitest";
import { budgetLevel, budgetPct, isLate, spentOn } from "./gifts";
import { addDays, daysToChristmas, shortDate, todayISO } from "./dates";
import { currencyOptions, currencySymbol, money, parseMoney, setCurrency } from "./money";

describe("budgets", () => {
  it("only counts bought gifts as spent", () => {
    expect(
      spentOn([
        { cost: 55, status: "delivered" },
        { cost: 35, status: "shipped" },
        { cost: 18, status: "idea" },
      ]),
    ).toBe(90);
  });

  it("is amber from the warning threshold and red when over", () => {
    expect(budgetLevel(124, 150, 85)).toBe("ok");
    expect(budgetLevel(184, 200, 85)).toBe("near");
    expect(budgetLevel(80, 80, 85)).toBe("near");
    expect(budgetLevel(90, 80, 85)).toBe("over");
    expect(budgetLevel(0, 0, 85)).toBe("ok");
    expect(budgetPct(90, 80)).toBe(100);
  });
});

describe("late deliveries", () => {
  it("flags parcels past their expected date that haven't arrived", () => {
    expect(isLate({ status: "shipped", expected_delivery: "2026-11-10" }, "2026-11-13")).toBe(true);
    expect(isLate({ status: "delivered", expected_delivery: "2026-11-10" }, "2026-11-13")).toBe(false);
    expect(isLate({ status: "shipped", expected_delivery: "2026-11-13" }, "2026-11-13")).toBe(false);
    expect(isLate({ status: "shipped", expected_delivery: null }, "2026-11-13")).toBe(false);
  });
});

describe("dates", () => {
  it("uses UK dates", () => {
    expect(todayISO(new Date("2026-11-13T23:30:00Z"))).toBe("2026-11-13");
    expect(todayISO(new Date("2026-07-13T23:30:00Z"))).toBe("2026-07-14");
    expect(addDays("2026-11-13", 6)).toBe("2026-11-19");
    expect(shortDate("2026-11-10")).toBe("Tue 10 Nov");
    expect(daysToChristmas("2026-11-13")).toBe(42);
    expect(daysToChristmas("2026-12-26")).toBe(364);
  });
});

describe("money", () => {
  it("defaults to euros", () => {
    expect(money(80)).toBe("€80");
  });
  it("formats and parses pounds", () => {
    setCurrency("GBP");
    expect(money(80)).toBe("£80");
    expect(money(44.99)).toBe("£44.99");
    expect(parseMoney("£1,234.50")).toBe(1234.5);
    expect(parseMoney("")).toBe(0);
    expect(Number.isNaN(parseMoney("abc"))).toBe(true);
  });
});

describe("currency", () => {
  it("formats amounts in the chosen currency", () => {
    setCurrency("EUR");
    expect(money(80)).toContain("€");
    expect(currencySymbol()).toBe("€");
    setCurrency("JPY");
    expect(money(1200)).toContain("1,200");
    setCurrency("nonsense");
    expect(money(80)).toBe("€80");
  });
  it("reads a decimal comma", () => {
    expect(parseMoney("12,50")).toBe(12.5);
    expect(parseMoney("€1,250")).toBe(1250);
  });
  it("lists many currencies", () => {
    const codes = currencyOptions().map((o) => o.code);
    expect(codes.length).toBeGreaterThan(100);
    expect(codes).toEqual(expect.arrayContaining(["EUR", "GBP", "USD"]));
  });
});
