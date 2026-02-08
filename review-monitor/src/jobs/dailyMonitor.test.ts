import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Product, Comment, NegativeComment, DimensionSummary } from "../types.js";

const mockFetchComments = vi.fn();
const mockAnalyzeComments = vi.fn();
const mockListProducts = vi.fn();
const mockInsertSnapshot = vi.fn();
const mockInsertReport = vi.fn();

vi.mock("../api/mockCrawler.js", () => ({ fetchComments: (...args: unknown[]) => mockFetchComments(...args) }));
vi.mock("../ai/analyzer.js", () => ({ analyzeComments: (...args: unknown[]) => mockAnalyzeComments(...args) }));
vi.mock("../db/schema.js", () => ({
  listProducts: () => mockListProducts(),
  insertSnapshot: (...args: unknown[]) => mockInsertSnapshot(...args),
  insertReport: (...args: unknown[]) => mockInsertReport(...args),
}));

beforeEach(() => {
  mockFetchComments.mockReset();
  mockAnalyzeComments.mockReset();
  mockListProducts.mockReset();
  mockInsertSnapshot.mockReset();
  mockInsertReport.mockReset();
});

describe("dailyMonitor", () => {
  it("runDailyMonitor returns empty when no products", async () => {
    mockListProducts.mockReturnValue([]);
    const { runDailyMonitor } = await import("./dailyMonitor.js");
    const results = await runDailyMonitor();
    expect(results).toEqual([]);
    expect(mockFetchComments).not.toHaveBeenCalled();
  });

  it("runDailyMonitor returns result per product and persists", async () => {
    const product: Product = {
      id: 1,
      product_url: "https://example.com/p/1",
      name: "P1",
      created_at: "2024-01-01 00:00:00",
    };
    mockListProducts.mockReturnValue([product]);
    mockFetchComments.mockResolvedValue({
      comments: [
        {
          comment_id: "1",
          user_name: "u",
          rating: 2,
          comment_text: "差",
          comment_time: "2024-01-01 12:00:00",
          helpful_count: 0,
        },
      ],
    });
    const negativeList: NegativeComment[] = [
      {
        ...product,
        comment_id: "1",
        user_name: "u",
        rating: 2,
        comment_text: "差",
        comment_time: "2024-01-01 12:00:00",
        helpful_count: 0,
        dimensions: ["质量"],
        keywords: "质量",
      },
    ];
    const summary: DimensionSummary = { 质量: 1, 服务: 0, 物流: 0, 价格: 0 };
    mockAnalyzeComments.mockResolvedValue({ negativeList, summaryByDimension: summary });
    mockInsertSnapshot.mockReturnValue(1);
    mockInsertReport.mockReturnValue(1);

    const { runDailyMonitor } = await import("./dailyMonitor.js");
    const results = await runDailyMonitor();

    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(true);
    expect(results[0].productId).toBe(1);
    expect(results[0].negativeCount).toBe(1);
    expect(results[0].snapshotId).toBe(1);
    expect(results[0].reportId).toBe(1);
    expect(mockInsertSnapshot).toHaveBeenCalledWith(1, expect.any(String), expect.any(String), 1, expect.any(Object));
    expect(mockInsertReport).toHaveBeenCalled();
  });

  it("runMonitorForProduct returns message when no comments", async () => {
    mockFetchComments.mockResolvedValue({ comments: [] });
    const product: Product = {
      id: 2,
      product_url: "https://example.com/p/2",
      name: "P2",
      created_at: "2024-01-01 00:00:00",
    };
    mockListProducts.mockReturnValue([product]);

    const { runDailyMonitor } = await import("./dailyMonitor.js");
    const results = await runDailyMonitor();

    expect(results[0].ok).toBe(true);
    expect(results[0].negativeCount).toBe(0);
    expect(results[0].message).toBe("无评论");
    expect(mockAnalyzeComments).not.toHaveBeenCalled();
  });

  it("runDailyMonitor pushes error when fetch/analyze throws", async () => {
    const product: Product = {
      id: 3,
      product_url: "https://example.com/p/3",
      name: "P3",
      created_at: "2024-01-01 00:00:00",
    };
    mockListProducts.mockReturnValue([product]);
    mockFetchComments.mockRejectedValue(new Error("network error"));

    const { runDailyMonitor } = await import("./dailyMonitor.js");
    const results = await runDailyMonitor();

    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
    expect(results[0].productId).toBe(3);
    expect(results[0].error).toContain("network error");
  });
});
