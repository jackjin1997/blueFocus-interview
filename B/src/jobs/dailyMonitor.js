/**
 * 每日监测任务：遍历已登记商品 → Mock 拉取评论 → AI 分析 → 写 snapshot + report
 */

import { fetchComments } from "../api/mockCrawler.js";
import { analyzeComments } from "../ai/analyzer.js";
import { buildReportContent, buildNegativeSummary } from "../report/reportBuilder.js";
import {
  getDb,
  listProducts,
  insertSnapshot,
  insertReport,
} from "../db/schema.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateRangeForToday() {
  const s = todayStr();
  return `${s} to ${s}`;
}

/**
 * 对单个商品执行一次监测：拉取 → 分析 → 落库
 */
export async function runMonitorForProduct(product) {
  const db = getDb();
  const productId = product.id;
  const productUrl = product.product_url;
  const productName = product.name || productUrl;

  const dateRange = dateRangeForToday();
  const [start, end] = dateRange.split(/\s+to\s+/i).map((s) => s.trim());

  const crawlResult = await fetchComments({ product_url: productUrl, date_range: dateRange });
  const comments = crawlResult.comments || [];

  if (comments.length === 0) {
    return { productId, snapshotId: null, reportId: null, negativeCount: 0, message: "无评论" };
  }

  const { negativeList, summaryByDimension } = await analyzeComments(comments);

  const snapshotId = insertSnapshot(
    productId,
    start,
    end,
    comments.length,
    { comments },
    db
  );

  const reportDate = todayStr();
  const negativeSummary = buildNegativeSummary(negativeList);
  const content = buildReportContent(
    reportDate,
    productName,
    productUrl,
    negativeList,
    summaryByDimension
  );

  const reportId = insertReport(
    productId,
    snapshotId,
    reportDate,
    negativeList.length,
    negativeSummary,
    summaryByDimension,
    content,
    db
  );

  return {
    productId,
    snapshotId,
    reportId,
    negativeCount: negativeList.length,
    totalComments: comments.length,
  };
}

/**
 * 执行全部商品的每日监测
 */
export async function runDailyMonitor() {
  const db = getDb();
  const products = listProducts(db);
  const results = [];

  for (const product of products) {
    try {
      const r = await runMonitorForProduct(product);
      results.push({ ok: true, ...r });
    } catch (err) {
      results.push({
        ok: false,
        productId: product.id,
        error: err.message,
      });
    }
  }

  return results;
}
