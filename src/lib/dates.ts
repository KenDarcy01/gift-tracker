const TZ = "Europe/London";

/** Today's date in the UK as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T12:00:00Z`);
  const b = Date.parse(`${toISO}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** "Tue 10 Nov" */
export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

/** "Friday 13 November" */
export function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

export function dayParts(iso: string): { weekday: string; day: string } {
  const d = new Date(`${iso}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(d).toUpperCase(),
    day: String(d.getUTCDate()),
  };
}

/** Days until the next Christmas Day (0 on the day itself). */
export function daysToChristmas(today: string): number {
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-12-25`;
  const target = today <= thisYear ? thisYear : `${year + 1}-12-25`;
  return daysBetween(today, target);
}

export function christmasYear(today: string): number {
  const year = Number(today.slice(0, 4));
  return today <= `${year}-12-25` ? year : year + 1;
}

/** "Today 07:12", "Yesterday 21:40" or "Tue 10 Nov" for a timestamp. */
export function receivedLabel(timestamp: string, now: Date = new Date()): string {
  const d = new Date(timestamp);
  const day = todayISO(d);
  const today = todayISO(now);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(d);
  if (day === today) return `Today ${time}`;
  if (day === addDays(today, -1)) return `Yesterday ${time}`;
  return shortDate(day);
}
