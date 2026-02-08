/**
 * 每日监测任务
 */

import { fetchComments } from "../api/mockCrawler.js";
import { analyzeComments } from "../ai/analyzer.js";
import { buildReportContent, buildNegativeSummary } from "../report/reportBuilder.js";
import { listProducts, insertSnapshot, insertReport } from "../db/schema.js";
import type { Product } from "../types.js";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateRangeForToday(): string {
  const s = todayStr();
  return `${s} to ${s}`;
}

export interface MonitorProductResult {
  productId: number;
  snapshotId: number | null;
  reportId: number | null;
  negativeCount: number;
  totalComments?: number;
  message?: string;
}

export async function runMonitorForProduct(product: Product): Promise<MonitorProductResult> {
  const productId = product.id;
  const productUrl = product.product_url;
  const productName = product.name ?? productUrl;

  const dateRange = dateRangeForToday();
  const [start, end] = dateRange.split(/\s+to\s+/i).map((s) => s.trim());

  const crawlResult = await fetchComments({ product_url: productUrl, date_range: dateRange });
  const comments = crawlResult.comments ?? [];

  if (comments.length === 0) {
    return { productId, snapshotId: null, reportId: null, negativeCount: 0, message: "无评论" };
  }

  const { negativeList, summaryByDimension } = await analyzeComments(comments);

  const snapshotId = insertSnapshot(productId, start, end, comments.length, { comments });

  const reportDate = todayStr();
  const negativeSummary = buildNegativeSummary(negativeList);
  const content = buildReportContent(reportDate, productName, productUrl, negativeList, summaryByDimension);

  const reportId = insertReport(
    productId,
    snapshotId,
    reportDate,
    negativeList.length,
    negativeSummary,
    summaryByDimension,
    content
  );

  return {
    productId,
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
