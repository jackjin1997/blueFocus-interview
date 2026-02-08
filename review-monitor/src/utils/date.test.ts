import { describe, it, expect, vi, afterEach } from "vitest";
import { now, todayDateString, dateRangeForToday, parseDate } from "./date.js";

describe("date utils", () => {
  afterEach(() => vi.restoreAllMocks());

  describe("now", () => {
    it("returns ISO-like datetime string without T (19 chars)", () => {
      vi.useFakeTimers({ now: new Date("2024-06-15T12:30:45.123Z") });
      expect(now()).toBe("2024-06-15 12:30:45");
    });
  });

  describe("todayDateString", () => {
    it("returns YYYY-MM-DD", () => {
      vi.useFakeTimers({ now: new Date("2024-06-15T12:00:00Z") });
      expect(todayDateString()).toBe("2024-06-15");
    });
  });

  describe("dateRangeForToday", () => {
    it("returns 'date to date' for same day", () => {
      vi.useFakeTimers({ now: new Date("2024-06-15T00:00:00Z") });
      expect(dateRangeForToday()).toBe("2024-06-15 to 2024-06-15");
    });
  });

  describe("parseDate", () => {
    it("parses YYYY-MM-DD to Date", () => {
      const d = parseDate("2024-01-15");
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(15);
    });

    it("uses first 10 chars when given longer string", () => {
      const d = parseDate("2024-01-15T12:00:00");
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(15);
    });

    it("returns epoch for invalid string", () => {
      const d = parseDate("invalid");
      expect(d.getTime()).toBe(0);
    });

    it("returns epoch for empty string", () => {
      const d = parseDate("");
      expect(d.getTime()).toBe(0);
    });
  });
});
