import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT, buildBatchCommentPrompt } from "./prompts.js";
import type { Comment } from "../types.js";

describe("prompts", () => {
  it("exports SYSTEM_PROMPT with expected content", () => {
    expect(SYSTEM_PROMPT).toContain("电商评论分析");
    expect(SYSTEM_PROMPT).toContain("正面");
    expect(SYSTEM_PROMPT).toContain("负面");
    expect(SYSTEM_PROMPT).toContain("质量");
    expect(SYSTEM_PROMPT).toContain("JSON");
  });

  it("buildBatchCommentPrompt includes comments and respects BATCH_SIZE", () => {
    const comments: Comment[] = [
      {
        comment_id: "1",
        user_name: "u1",
        rating: 3,
        comment_text: "不错",
        comment_time: "2024-01-01 12:00:00",
        helpful_count: 0,
      },
    ];
    const out = buildBatchCommentPrompt(comments);
    expect(out).toContain("[1] (评分:3) 不错");
    expect(out).toContain("items");
    expect(out).toContain("sentiment");
  });

  it("buildBatchCommentPrompt slices to BATCH_SIZE", () => {
    const comments: Comment[] = Array.from({ length: 60 }, (_, i) => ({
      comment_id: String(i),
      user_name: "u",
      rating: 3,
      comment_text: `c${i}`,
      comment_time: "2024-01-01 12:00:00",
      helpful_count: 0,
    }));
    const out = buildBatchCommentPrompt(comments);
    expect(out).toContain("[50]");
    expect(out).not.toContain("[51]");
  });
});
