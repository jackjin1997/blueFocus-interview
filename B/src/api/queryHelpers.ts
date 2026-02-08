export function parseOptionalId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function parseLimit(value: unknown, defaultVal: number, max: number): number {
  const n = Number(value);
  const v = Number.isNaN(n) ? defaultVal : n;
  return Math.min(Math.max(0, v), max);
}

export function parseDays(value: unknown, defaultVal: number, max: number): number {
  return parseLimit(value, defaultVal, max);
}

export function parseIdParam(params: { id?: string }): number | null {
  return parseOptionalId(params.id);
}
