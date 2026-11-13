const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const gbpWhole = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

/** £44.99, or £80 when there are no pence. */
export function money(n: number): string {
  return Number.isInteger(Math.round(n * 100) / 100) ? gbpWhole.format(n) : gbp.format(n);
}

/** Always two decimals: £80.00 */
export function moneyExact(n: number): string {
  return gbp.format(n);
}

/** Parse "£1,234.50" or "44.99" into a number; NaN when it isn't money. */
export function parseMoney(input: FormDataEntryValue | null | undefined): number {
  if (typeof input !== "string") return NaN;
  const cleaned = input.replace(/[£,\s]/g, "");
  if (cleaned === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN;
  return Number(cleaned);
}
