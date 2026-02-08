import { describe, it, expect } from "vitest";
import { parseOptionalId, parseLimit, parseDays, parseIdParam } from "./queryHelpers.js";

describe("queryHelpers", () => {
  describe("parseOptionalId", () => {
    it("returns null for null or empty string", () => {
      expect(parseOptionalId(null)).toBe(null);
      expect(parseOptionalId("")).toBe(null);
    });

    it("returns number for numeric string", () => {
      expect(parseOptionalId("42")).toBe(42);
      expect(parseOptionalId(42)).toBe(42);
    });

    it("returns null for NaN", () => {
      expect(parseOptionalId("abc")).toBe(null);
      expect(parseOptionalId(undefined)).toBe(null);
    });
  });

  describe("parseLimit", () => {
    it("returns default when NaN", () => {
      expect(parseLimit("x", 10, 100)).toBe(10);
    });

    it("clamps to [0, max]", () => {
      expect(parseLimit(5, 10, 100)).toBe(5);
      expect(parseLimit(-1, 10, 100)).toBe(0);
      expect(parseLimit(200, 10, 100)).toBe(100);
    });

    it("uses default as fallback", () => {
      expect(parseLimit(NaN, 20, 50)).toBe(20);
    });
  });

  describe("parseDays", () => {
    it("behaves like parseLimit", () => {
      expect(parseDays("7", 30, 90)).toBe(7);
      expect(parseDays("x", 30, 90)).toBe(30);
      expect(parseDays("100", 30, 90)).toBe(90);
    });
  });

  describe("parseIdParam", () => {
    it("returns id from params when valid", () => {
      expect(parseIdParam({ id: "3" })).toBe(3);
    });

    it("returns null when id missing or invalid", () => {
      expect(parseIdParam({})).toBe(null);
      expect(parseIdParam({ id: "" })).toBe(null);
      expect(parseIdParam({ id: "nope" })).toBe(null);
    });
  });
});
