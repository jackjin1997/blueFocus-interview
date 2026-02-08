import { describe, it, expect } from "vitest";
import {
  buildReportHeader,
  buildNegativeCommentLines,
  buildReportContent,
  buildNegativeSummary,
} from "./reportBuilder.js";
import type { NegativeComment, DimensionSummary } from "../types.js";

const sampleSummary: DimensionSummary = {
  质量: 2,
  服务: 1,
  物流: 0,
  价格: 1,
};

const sampleNegative: NegativeComment = {
  comment_id: "c1",
  user_name: "用户A",
  rating: 2,
  comment_text: "质量一般",
  comment_time: "2024-01-15 10:00:00",
  helpful_count: 0,
  dimensions: ["质量"],
  keywords: "质量",
};

describe("reportBuilder", () => {
  describe("buildReportHeader", () => {
    it("includes title, date, product, negative count, and dimension summary", () => {
      const lines = buildReportHeader("2024-01-15", "测试商品", "https://example.com/p/1", 3, sampleSummary);
      expect(lines.join("\n")).toContain("电商负面评论监测报告");
      expect(lines.join("\n")).toContain("报告日期：2024-01-15");
      expect(lines.join("\n")).toContain("商品：测试商品");
      expect(lines.join("\n")).toContain("负面评论数：3");
      expect(lines.join("\n")).toContain("质量：2");
      expect(lines.join("\n")).toContain("负面评论列表");
    });

    it("uses productUrl when productName is null", () => {
      const lines = buildReportHeader("2024-01-15", null, "https://example.com/p/1", 0, {});
      expect(lines.join("\n")).toContain("商品：https://example.com/p/1");
    });
  });

  describe("buildNegativeCommentLines", () => {
    it("formats each negative comment with index and fields", () => {
      const lines = buildNegativeCommentLines([sampleNegative], 10);
      const text = lines.join("\n");
      expect(text).toContain("[c1] 用户A");
      expect(text).toContain("评分: 2");
      expect(text).toContain("质量");
      expect(text).toContain("质量一般");
    });

    it("limits to maxItems and appends overflow message", () => {
      const list: NegativeComment[] = [
        { ...sampleNegative, comment_id: "c1" },
        { ...sampleNegative, comment_id: "c2" },
        { ...sampleNegative, comment_id: "c3" },
      ];
      const lines = buildNegativeCommentLines(list, 2);
      const text = lines.join("\n");
      expect(text).toContain("c1");
      expect(text).toContain("c2");
      expect(text).not.toContain("c3");
      expect(text).toContain("共 3 条负面评论");
      expect(text).toContain("前 2 条");
    });
  });

  describe("buildReportContent", () => {
    it("concatenates header and comment lines", () => {
      const content = buildReportContent("2024-01-15", "测试", "https://example.com", [sampleNegative], sampleSummary);
      expect(content).toContain("电商负面评论监测报告");
      expect(content).toContain("负面评论数：1");
      expect(content).toContain("用户A");
      expect(content).toContain("质量一般");
    });
  });

  describe("buildNegativeSummary", () => {
    it("returns default message when list is empty", () => {
      expect(buildNegativeSummary([])).toBe("本周期无负面评论。");
      expect(buildNegativeSummary(undefined as unknown as NegativeComment[])).toBe("本周期无负面评论。");
    });

    it("joins first N comments with truncation", () => {
      const summary = buildNegativeSummary([sampleNegative], 10);
      expect(summary).toContain("用户A");
      expect(summary).toContain("质量一般");
      expect(summary).toMatch(/。$/);
    });

    it("appends count when over maxItems", () => {
      const list: NegativeComment[] = [
        { ...sampleNegative, comment_id: "c1" },
        { ...sampleNegative, comment_id: "c2" },
        { ...sampleNegative, comment_id: "c3" },
      ];
      const summary = buildNegativeSummary(list, 2);
      expect(summary).toContain("等共 3 条");
    });

    it("truncates long comment_text to 80 chars", () => {
      const long = {
        ...sampleNegative,
        comment_text: "x".repeat(100),
      };
      const summary = buildNegativeSummary([long], 10);
      expect(summary).toContain("…");
    });
  });
});
