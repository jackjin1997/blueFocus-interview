import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const testDataDir = mkdtempSync(join(tmpdir(), "rm-schema-test-"));
process.env.DATA_DIR = testDataDir;

let schema: typeof import("./schema.js");

beforeAll(async () => {
  schema = await import("./schema.js");
});

describe("schema", () => {
  beforeEach(() => {
    schema.initStorage();
    writeFileSync(join(testDataDir, "products.json"), '{"nextId":1,"items":[]}');
    writeFileSync(join(testDataDir, "snapshots.json"), '{"nextId":1,"items":[]}');
    writeFileSync(join(testDataDir, "reports.json"), '{"nextId":1,"items":[]}');
  });

  describe("products", () => {
    it("listProducts returns empty initially", () => {
      expect(schema.listProducts()).toEqual([]);
    });

    it("addProduct adds and getProduct returns", () => {
      const id = schema.addProduct("https://example.com/p/1", "商品1");
      expect(id).toBe(1);
      const p = schema.getProduct(id);
      expect(p?.product_url).toBe("https://example.com/p/1");
      expect(p?.name).toBe("商品1");
    });

    it("addProduct throws when product_url exists", () => {
      schema.addProduct("https://example.com/p/1", null);
      expect(() => schema.addProduct("https://example.com/p/1", null)).toThrow("UNIQUE");
    });

    it("deleteProduct removes product", () => {
      const id = schema.addProduct("https://example.com/p/2", null);
      schema.deleteProduct(id);
      expect(schema.getProduct(id)).toBeUndefined();
    });
  });

  describe("snapshots and reports", () => {
    it("insertSnapshot and getSnapshot", () => {
      const id = schema.insertSnapshot(1, "2024-01-01", "2024-01-01", 10, { foo: 1 });
      expect(id).toBe(1);
      const row = schema.getSnapshot(id);
      expect(row?.product_id).toBe(1);
      expect(row?.comment_count).toBe(10);
    });

    it("insertReport and listReports", () => {
      schema.addProduct("https://example.com/p/1", "P1");
      const reportId = schema.insertReport(1, null, "2024-01-15", 2, "摘要", { 质量: 2 }, "content");
      expect(reportId).toBe(1);
      const rows = schema.listReports(null, 10);
      expect(rows).toHaveLength(1);
      expect(rows[0].negative_count).toBe(2);
      expect(rows[0].report_date).toBe("2024-01-15");
    });

    it("getReport returns report with parsed dimension_summary", () => {
      schema.addProduct("https://example.com/p/1", null);
      schema.insertReport(1, null, "2024-01-15", 1, "s", { 质量: 1, 服务: 0, 物流: 0, 价格: 0 }, null);
      const r = schema.getReport(1);
      expect(r?.negative_count).toBe(1);
      expect(r?.dimension_summary).toEqual({ 质量: 1, 服务: 0, 物流: 0, 价格: 0 });
    });

    it("getReport handles invalid dimension_summary JSON", () => {
      schema.addProduct("https://example.com/p/1", null);
      schema.insertReport(1, null, "2024-01-15", 0, null, "not-valid-json", null);
      const r = schema.getReport(1);
      expect(r).toBeDefined();
      expect(r?.negative_count).toBe(0);
    });

    it("getTrends aggregates by report_date", () => {
      schema.addProduct("https://example.com/p/1", null);
      const reportDate = new Date().toISOString().slice(0, 10);
      schema.insertReport(1, null, reportDate, 3, null, null, null);
      schema.insertReport(1, null, reportDate, 2, null, null, null);
      const trends = schema.getTrends(null, 90);
      expect(trends.some((t) => t.report_date === reportDate && t.negative_count === 5 && t.report_count === 2)).toBe(
        true
      );
    });
  });
});
