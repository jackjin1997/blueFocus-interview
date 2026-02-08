import { fetchComments } from "../api/mockCrawler.js";
import { analyzeComments } from "../ai/analyzer.js";
import { buildReportContent, buildNegativeSummary } from "../report/reportBuilder.js";
import { listProducts, insertSnapshot, insertReport } from "../db/schema.js";
import { todayDateString, dateRangeForToday } from "../utils/date.js";
import type { Product, Comment, NegativeComment, DimensionSummary } from "../types.js";

export interface WebhookPayload {
  event: "report_created";
  productId: number;
  productName: string | null;
  productUrl: string;
  reportId: number;
  reportDate: string;
  negativeCount: number;
  totalComments: number;
}

export async function sendWebhookNotification(payload: WebhookPayload): Promise<void> {
  const url = process.env.WEBHOOK_URL ?? "";
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`[webhook] POST ${url} -> ${res.status}`);
  } catch (err) {
    console.error("[webhook] failed:", err instanceof Error ? err.message : String(err));
  }
}

export interface MonitorProductResult {
  productId: number;
  snapshotId: number | null;
  reportId: number | null;
  negativeCount: number;
  totalComments?: number;
  message?: string;
}

async function fetchAndAnalyze(product: Product): Promise<{
  comments: Comment[];
  negativeList: NegativeComment[];
  summaryByDimension: DimensionSummary;
} | null> {
  const dateRange = dateRangeForToday();
  const crawlResult = await fetchComments({ product_url: product.product_url, date_range: dateRange });
  const comments = crawlResult.comments ?? [];
  if (comments.length === 0) return null;
  const { negativeList, summaryByDimension } = await analyzeComments(comments);
  return { comments, negativeList, summaryByDimension };
}

function persistMonitorResult(
  product: Product,
  comments: Comment[],
  negativeList: NegativeComment[],
  summaryByDimension: DimensionSummary
): { snapshotId: number; reportId: number } {
  const dateRange = dateRangeForToday();
  const [start, end] = dateRange.split(/\s+to\s+/i).map((s) => s.trim());
  const reportDate = todayDateString();
  const productName = product.name ?? product.product_url;
  const snapshotId = insertSnapshot(product.id, start, end, comments.length, { comments });
  const negativeSummary = buildNegativeSummary(negativeList);
  const content = buildReportContent(reportDate, productName, product.product_url, negativeList, summaryByDimension);
  const reportId = insertReport(
    product.id,
    snapshotId,
    reportDate,
    negativeList.length,
    negativeSummary,
    summaryByDimension as Record<string, number>,
    content
  );
  return { snapshotId, reportId };
}

export async function runMonitorForProduct(product: Product): Promise<MonitorProductResult> {
  const analyzed = await fetchAndAnalyze(product);
  if (!analyzed) {
    return { productId: product.id, snapshotId: null, reportId: null, negativeCount: 0, message: "无评论" };
  }
  const { comments, negativeList, summaryByDimension } = analyzed;
  const { snapshotId, reportId } = persistMonitorResult(product, comments, negativeList, summaryByDimension);

  await sendWebhookNotification({
    event: "report_created",
    productId: product.id,
    productName: product.name,
    productUrl: product.product_url,
    reportId,
    reportDate: todayDateString(),
    negativeCount: negativeList.length,
    totalComments: comments.length,
  });

  return {
    productId: product.id,
    snapshotId,
    reportId,
    negativeCount: negativeList.length,
    totalComments: comments.length,
  };
}

export interface DailyMonitorResultItem {
  ok: boolean;
  productId?: number;
  error?: string;
  snapshotId?: number | null;
  reportId?: number | null;
  negativeCount?: number;
  totalComments?: number;
  message?: string;
}

export async function runDailyMonitor(): Promise<DailyMonitorResultItem[]> {
  const products = listProducts();
  const results: DailyMonitorResultItem[] = [];
  for (const product of products) {
    try {
      const r = await runMonitorForProduct(product);
      results.push({ ok: true, ...r });
    } catch (err) {
      results.push({
        ok: false,
        productId: product.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
