/** ISO date-time string for storage (no T, 19 chars). */
export function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/** ISO date only (YYYY-MM-DD). */
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "YYYY-MM-DD to YYYY-MM-DD" for crawler API. */
export function dateRangeForToday(): string {
  const s = todayDateString();
  return `${s} to ${s}`;
}

/** Parse date string (first 10 chars) to Date; invalid => epoch. */
export function parseDate(dateStr: string): Date {
  const d = new Date(dateStr.slice(0, 10));
  return isNaN(d.getTime()) ? new Date(0) : d;
}
