/**
 * 报告内容组装
 */

import type { NegativeComment, DimensionSummary } from "../types.js";

export function buildReportContent(
  reportDate: string,
  productName: string | null,
  productUrl: string,
  negativeList: NegativeComment[],
  summaryByDimension: DimensionSummary
): string {
  const lines = [
    `# 电商负面评论监测报告`,
    `报告日期：${reportDate}`,
    `商品：${productName || productUrl || "-"}`,
    ``,
    `## 概览`,
    `负面评论数：${negativeList.length}`,
    ``,
    `## 按问题维度分布`,
    ...Object.entries(summaryByDimension || {}).map(([dim, count]) => `- ${dim}：${count}`),
    ``,
    `## 负面评论列表`,
  ];

  negativeList.slice(0, 50).forEach((c, i) => {
    lines.push("");
    lines.push(`### ${i + 1}. [${c.comment_id}] ${c.user_name} (评分: ${c.rating})`);
    lines.push(`时间：${c.comment_time}`);
    if (c.dimensions?.length) lines.push(`问题维度：${c.dimensions.join("、")}`);
    if (c.keywords) lines.push(`关键词：${c.keywords}`);
    lines.push(`内容：${c.comment_text}`);
  });

  if (negativeList.length > 50) {
    lines.push("");
    lines.push(`... 共 ${negativeList.length} 条负面评论，以上仅展示前 50 条`);
  }

  return lines.join("\n");
}

export function buildNegativeSummary(negativeList: NegativeComment[], maxItems = 10): string {
  if (!negativeList?.length) return "本周期无负面评论。";
  const parts = negativeList.slice(0, maxItems).map((c) => `[${c.user_name}] ${c.comment_text.slice(0, 80)}${c.comment_text.length > 80 ? "…" : ""}`);
  return parts.join("；") + (negativeList.length > maxItems ? ` 等共 ${negativeList.length} 条。` : "。");
}
