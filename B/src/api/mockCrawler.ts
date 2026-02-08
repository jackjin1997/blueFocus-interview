/**
 * 模拟电商评论爬虫接口
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { Comment, CrawlParams, CrawlResult } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let _cachedComments: Comment[] | null = null;

function loadMockComments(): Comment[] {
  if (_cachedComments) return _cachedComments;
  const dataPath = join(__dirname, "../../data/mockComments.json");
  const raw = readFileSync(dataPath, "utf-8");
  _cachedComments = JSON.parse(raw) as Comment[];
  return _cachedComments;
}

function parseDateRange(dateRange: string | undefined): { start: string; end: string } | null {
  if (!dateRange || typeof dateRange !== "string") return null;
  const parts = dateRange.split(/\s+to\s+/i).map((s) => s.trim());
  if (parts.length !== 2) return null;
  return { start: parts[0], end: parts[1] };
}

function isInRange(commentTime: string | undefined, start: string, end: string): boolean {
  if (!commentTime) return true;
  const t = commentTime.slice(0, 10);
  return t >= start && t <= end;
}

export async function fetchComments(params?: CrawlParams): Promise<CrawlResult> {
  const { product_url, date_range } = params || {};
  const comments = loadMockComments();
  const range = parseDateRange(date_range);

  let list = comments;
  if (range) {
    list = comments.filter((c) => isInRange(c.comment_time, range.start, range.end));
  }
  if (list.length === 0) list = comments;

  return {
    product_url: product_url || "https://example.com/product/1",
    date_range: date_range || "2024-12-01 to 2024-12-22",
    comments: list,
  };
}
