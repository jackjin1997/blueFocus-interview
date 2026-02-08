/**
 * 模拟电商评论爬虫接口
 * 协议：请求 body { product_url, date_range }，响应 { product_url, date_range, comments[] }
 * 每条 comment: comment_id, user_name, rating, comment_text, comment_time, helpful_count
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let _cachedComments = null;

function loadMockComments() {
  if (_cachedComments) return _cachedComments;
  const dataPath = join(__dirname, "../../data/mockComments.json");
  const raw = readFileSync(dataPath, "utf-8");
  _cachedComments = JSON.parse(raw);
  return _cachedComments;
}

/**
 * 解析 date_range 字符串 "2024-12-01 to 2024-12-07" 为 [start, end] 日期
 */
function parseDateRange(dateRange) {
  if (!dateRange || typeof dateRange !== "string") return null;
  const parts = dateRange.split(/\s+to\s+/i).map((s) => s.trim());
  if (parts.length !== 2) return null;
  return { start: parts[0], end: parts[1] };
}

/**
 * 评论的 comment_time 是否落在 [start, end] 范围内（按字符串比较）
 */
function isInRange(commentTime, start, end) {
  if (!commentTime) return true;
  const t = commentTime.slice(0, 10);
  return t >= start && t <= end;
}

/**
 * 模拟抓取评论
 * @param {object} params - { product_url: string, date_range: string }
 * @returns {Promise<{ product_url: string, date_range: string, comments: array }>}
 */
export async function fetchComments(params) {
  const { product_url, date_range } = params || {};
  const comments = loadMockComments();
  const range = parseDateRange(date_range);

  let list = comments;
  if (range) {
    list = comments.filter((c) =>
      isInRange(c.comment_time, range.start, range.end)
    );
  }
  // 若按日期过滤后为空，则返回全部（便于演示）
  if (list.length === 0) list = comments;

  return {
    product_url: product_url || "https://example.com/product/1",
    date_range: date_range || "2024-12-01 to 2024-12-22",
    comments: list,
  };
}
