/** The currency every amount is shown in. Set from the user's settings when their data loads. */
let currency = "EUR";
let exact: Intl.NumberFormat;
let whole: Intl.NumberFormat;

function build() {
  exact = new Intl.NumberFormat(undefined, { style: "currency", currency });
  whole = new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0, minimumFractionDigits: 0 });
}
build();

export const DEFAULT_CURRENCY = "EUR";

export function isCurrency(code: unknown): code is string {
  if (typeof code !== "string" || !/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}

export function setCurrency(code: string | null | undefined) {
  const next = isCurrency(code) ? code : DEFAULT_CURRENCY;
  if (next === currency) return;
  currency = next;
  build();
}

export function getCurrency(): string {
  return currency;
}

/** The symbol for the current currency, e.g. £, €, $ or CHF. */
export function currencySymbol(code: string = currency): string {
  const part = new Intl.NumberFormat(undefined, { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? code;
}

/** £44.99, or £80 when there are no pence. */
export function money(n: number): string {
  return Number.isInteger(Math.round(n * 100) / 100) ? whole.format(n) : exact.format(n);
}

/** Always the currency's usual decimals: £80.00 */
export function moneyExact(n: number): string {
  return exact.format(n);
}

/** Parse "£1,234.50", "44.99" or "12,50" into a number; NaN when it isn't money. */
export function parseMoney(input: FormDataEntryValue | null | undefined): number {
  if (typeof input !== "string") return NaN;
  let cleaned = input.replace(/[^\d.,]/g, "");
  if (cleaned === "") return input.trim() === "" ? 0 : NaN;
  // A single comma followed by one or two digits is a decimal comma (12,50).
  if (/^\d+,\d{1,2}$/.test(cleaned)) cleaned = cleaned.replace(",", ".");
  else cleaned = cleaned.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

/** Shown at the top of the currency picker. */
export const COMMON_CURRENCIES = ["EUR", "GBP", "USD"];

/** Every currency the browser knows, A to Z, with names like "Euro". */
export function currencyOptions(): { code: string; name: string }[] {
  const names = new Intl.DisplayNames(undefined, { type: "currency" });
  const all = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("currency") : COMMON_CURRENCIES;
  return all.filter(isCurrency).map((code) => ({ code, name: names.of(code) ?? code }));
}
