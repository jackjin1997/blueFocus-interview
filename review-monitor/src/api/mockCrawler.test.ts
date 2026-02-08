import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

beforeEach(async () => {
  vi.mocked(readFileSync).mockReset();
  vi.resetModules();
});

describe("mockCrawler", () => {
  it("fetchComments returns mock data and filters by date_range", async () => {
    const mockComments = [
      {
        comment_id: "1",
        user_name: "u1",
        rating: 2,
        comment_text: "差",
        comment_time: "2024-12-01 10:00:00",
        helpful_count: 0,
      },
      {
        comment_id: "2",
        user_name: "u2",
        rating: 5,
        comment_text: "好",
        comment_time: "2024-12-15 10:00:00",
        helpful_count: 1,
      },
    ];
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockComments) as string);

    const { fetchComments } = await import("./mockCrawler.js");

    const result = await fetchComments({
      product_url: "https://example.com/p/1",
      date_range: "2024-12-01 to 2024-12-01",
    });
    expect(result.product_url).toBe("https://example.com/p/1");
    expect(result.date_range).toBe("2024-12-01 to 2024-12-01");
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].comment_id).toBe("1");
  });

  it("fetchComments returns all comments when no range or empty filter", async () => {
    const mockComments = [
      {
        comment_id: "1",
        user_name: "u1",
        rating: 2,
        comment_text: "x",
        comment_time: "2024-12-10 10:00:00",
        helpful_count: 0,
      },
    ];
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockComments) as string);

    const { fetchComments } = await import("./mockCrawler.js");
    const result = await fetchComments();
    expect(result.comments).toHaveLength(1);
    expect(result.product_url).toBeDefined();
    expect(result.date_range).toBeDefined();
  });

  it("fetchComments falls back to all comments when filter yields empty", async () => {
    const mockComments = [
      {
        comment_id: "1",
        user_name: "u1",
        rating: 2,
        comment_text: "x",
        comment_time: "2024-12-10 10:00:00",
        helpful_count: 0,
      },
    ];
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockComments) as string);

    const { fetchComments } = await import("./mockCrawler.js");
    const result = await fetchComments({
      product_url: "https://example.com/p/1",
      date_range: "2020-01-01 to 2020-01-01",
    });
    expect(result.comments).toHaveLength(1);
  });
});
