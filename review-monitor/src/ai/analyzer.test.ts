import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Comment } from "../types.js";

const mockInvoke = vi.fn();
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn(() => ({ invoke: mockInvoke })),
}));
vi.mock("@langchain/core/messages", () => ({
  HumanMessage: class {},
  SystemMessage: class {},
}));

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
  mockInvoke.mockReset();
});

describe("analyzer", () => {
  it("returns empty result when comments are empty", async () => {
    const { analyzeComments } = await import("./analyzer.js");
    const result = await analyzeComments([]);
    expect(result.negativeList).toEqual([]);
    expect(result.summaryByDimension).toEqual({ 质量: 0, 服务: 0, 物流: 0, 价格: 0 });
    expect(result.fullResult).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("returns empty result when comments is null/undefined", async () => {
    const { analyzeComments } = await import("./analyzer.js");
    const result = await analyzeComments(undefined as unknown as Comment[]);
    expect(result.negativeList).toEqual([]);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("parses LLM response and builds negativeList and summary", async () => {
    mockInvoke.mockResolvedValue({
      content: [
        {
          text: `\`\`\`json
{
  "items": [
    { "sentiment": "正面", "dimensions": [], "keywords": "" },
    { "sentiment": "负面", "dimensions": ["质量"], "keywords": "质量差" }
  ],
  "summary": { "by_dimension": { "质量": 1, "服务": 0, "物流": 0, "价格": 0 } }
}
\`\`\``,
        },
      ],
    });
    const { analyzeComments } = await import("./analyzer.js");
    const comments: Comment[] = [
      {
        comment_id: "1",
        user_name: "a",
        rating: 5,
        comment_text: "好",
        comment_time: "2024-01-01",
        helpful_count: 0,
      },
      {
        comment_id: "2",
        user_name: "b",
        rating: 2,
        comment_text: "质量差",
        comment_time: "2024-01-01",
        helpful_count: 0,
      },
    ];
    const result = await analyzeComments(comments);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(result.negativeList).toHaveLength(1);
    expect(result.negativeList[0].comment_id).toBe("2");
    expect(result.negativeList[0].dimensions).toEqual(["质量"]);
    expect(result.negativeList[0].keywords).toBe("质量差");
    expect(result.summaryByDimension).toEqual({ 质量: 1, 服务: 0, 物流: 0, 价格: 0 });
  });

  it("handles string content from LLM", async () => {
    mockInvoke.mockResolvedValue({
      content: '{"items":[{"sentiment":"中性","dimensions":[],"keywords":""}],"summary":{"by_dimension":{}}}',
    });
    const { analyzeComments } = await import("./analyzer.js");
    const comments: Comment[] = [
      {
        comment_id: "1",
        user_name: "a",
        rating: 3,
        comment_text: "一般",
        comment_time: "2024-01-01",
        helpful_count: 0,
      },
    ];
    const result = await analyzeComments(comments);
    expect(result.negativeList).toHaveLength(0);
    expect(result.summaryByDimension).toBeDefined();
  });

  it("throws when AI response is not valid JSON", async () => {
    mockInvoke.mockResolvedValue({ content: "not json at all" });
    const { analyzeComments } = await import("./analyzer.js");
    const comments: Comment[] = [
      {
        comment_id: "1",
        user_name: "a",
        rating: 3,
        comment_text: "x",
        comment_time: "2024-01-01",
        helpful_count: 0,
      },
    ];
    await expect(analyzeComments(comments)).rejects.toThrow("not valid JSON");
  });
});
