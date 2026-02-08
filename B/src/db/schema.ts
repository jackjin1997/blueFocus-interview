/**
 * 存储层：JSON 文件（无需原生编译，替代 better-sqlite3）
 * 数据文件：data/products.json, data/snapshots.json, data/reports.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Product } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

const PRODUCTS_FILE = join(DATA_DIR, "products.json");
const SNAPSHOTS_FILE = join(DATA_DIR, "snapshots.json");
const REPORTS_FILE = join(DATA_DIR, "reports.json");

interface ProductsStore {
  nextId: number;
  items: Product[];
}

interface SnapshotRow {
  id: number;
  product_id: number;
  date_range_start: string;
  date_range_end: string;
  comment_count: number;
  raw_json: string | null;
  created_at: string;
}

interface ReportRowStore {
  id: number;
  product_id: number;
  snapshot_id: number | null;
  report_date: string;
  negative_count: number;
  negative_summary: string | null;
  dimension_summary: string | null;
  content: string | null;
  created_at: string;
}

interface SnapshotsStore {
  nextId: number;
  items: SnapshotRow[];
}

interface ReportsStore {
  nextId: number;
  items: ReportRowStore[];
}

function loadJson<T>(path: string, defaultVal: T): T {
  ensureDataDir();
  if (!existsSync(path)) return defaultVal;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return defaultVal;
  }
}

function saveJson(path: string, data: unknown): void {
  ensureDataDir();
  writeFileSync(path, JSON.stringify(data, null, 0), "utf-8");
}

function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/** 初始化存储目录（启动时调用一次） */
export function initStorage(): void {
  ensureDataDir();
}

export interface ReportRow {
  id: number;
  product_id: number;
  snapshot_id: number | null;
  report_date: string;
  negative_count: number;
  negative_summary: string | null;
  dimension_summary: string | null;
  content: string | null;
  created_at: string;
  product_url: string;
  product_name: string | null;
}

export interface TrendRow {
  report_date: string;
  negative_count: number;
  report_count: number;
}

export function listProducts(): Product[] {
  const store = loadJson<ProductsStore>(PRODUCTS_FILE, { nextId: 1, items: [] });
  return [...store.items].sort((a, b) => a.id - b.id);
}

export function addProduct(productUrl: string, name: string | null): number {
  const store = loadJson<ProductsStore>(PRODUCTS_FILE, { nextId: 1, items: [] });
  if (store.items.some((p) => p.product_url === productUrl)) {
    throw new Error("UNIQUE constraint failed: products.product_url");
  }
  const id = store.nextId++;
  store.items.push({
    id,
    product_url: productUrl,
    name,
    created_at: now(),
  });
  saveJson(PRODUCTS_FILE, store);
  return id;
}

export function getProduct(id: number): Product | undefined {
  const store = loadJson<ProductsStore>(PRODUCTS_FILE, { nextId: 1, items: [] });
  return store.items.find((p) => p.id === id);
}

export function deleteProduct(id: number): void {
  const pStore = loadJson<ProductsStore>(PRODUCTS_FILE, { nextId: 1, items: [] });
  const sStore = loadJson<SnapshotsStore>(SNAPSHOTS_FILE, { nextId: 1, items: [] });
  const rStore = loadJson<ReportsStore>(REPORTS_FILE, { nextId: 1, items: [] });
  rStore.items = rStore.items.filter((r) => r.product_id !== id);
  sStore.items = sStore.items.filter((s) => s.product_id !== id);
  pStore.items = pStore.items.filter((p) => p.id !== id);
  saveJson(REPORTS_FILE, rStore);
  saveJson(SNAPSHOTS_FILE, sStore);
  saveJson(PRODUCTS_FILE, pStore);
}

export function insertSnapshot(
  productId: number,
  dateRangeStart: string,
  dateRangeEnd: string,
  commentCount: number,
  rawJson: unknown
): number {
  const store = loadJson<SnapshotsStore>(SNAPSHOTS_FILE, { nextId: 1, items: [] });
  const id = store.nextId++;
  store.items.push({
    id,
    product_id: productId,
    date_range_start: dateRangeStart,
    date_range_end: dateRangeEnd,
    comment_count: commentCount,
    raw_json: rawJson ? JSON.stringify(rawJson) : null,
    created_at: now(),
  });
  saveJson(SNAPSHOTS_FILE, store);
  return id;
}

export function getSnapshot(id: number): Record<string, unknown> | undefined {
  const store = loadJson<SnapshotsStore>(SNAPSHOTS_FILE, { nextId: 1, items: [] });
  const row = store.items.find((s) => s.id === id);
  return row as unknown as Record<string, unknown> | undefined;
}

export function insertReport(
  productId: number,
  snapshotId: number | null,
  reportDate: string,
  negativeCount: number,
  negativeSummary: string | null,
  dimensionSummary: Record<string, number> | string | null,
  content: string | null
): number {
  const store = loadJson<ReportsStore>(REPORTS_FILE, { nextId: 1, items: [] });
  const id = store.nextId++;
  const dimStr = dimensionSummary == null ? null : typeof dimensionSummary === "string" ? dimensionSummary : JSON.stringify(dimensionSummary);
  store.items.push({
    id,
    product_id: productId,
    snapshot_id: snapshotId,
    report_date: reportDate,
    negative_count: negativeCount,
    negative_summary: negativeSummary,
    dimension_summary: dimStr,
    content,
    created_at: now(),
  });
  saveJson(REPORTS_FILE, store);
  return id;
}

export function listReports(productId: number | null, limit: number): ReportRow[] {
  const rStore = loadJson<ReportsStore>(REPORTS_FILE, { nextId: 1, items: [] });
  const pStore = loadJson<ProductsStore>(PRODUCTS_FILE, { nextId: 1, items: [] });
  const byId = new Map(pStore.items.map((p) => [p.id, p]));
  let rows: ReportRow[] = rStore.items.map((r) => ({
    ...r,
    product_url: byId.get(r.product_id)?.product_url ?? "",
    product_name: byId.get(r.product_id)?.name ?? null,
  }));
  if (productId != null) rows = rows.filter((r) => r.product_id === productId);
  rows.sort((a, b) => (b.report_date + String(b.id)).localeCompare(a.report_date + String(a.id)));
  return rows.slice(0, limit);
}

export function getReport(id: number): (ReportRow & { dimension_summary?: Record<string, number> }) | undefined {
  const rStore = loadJson<ReportsStore>(REPORTS_FILE, { nextId: 1, items: [] });
  const pStore = loadJson<ProductsStore>(PRODUCTS_FILE, { nextId: 1, items: [] });
  const row = rStore.items.find((r) => r.id === id);
  if (!row) return undefined;
  const product = pStore.items.find((p) => p.id === row.product_id);
  const out: ReportRow & { dimension_summary?: Record<string, number> } = {
    ...row,
    product_url: product?.product_url ?? "",
    product_name: product?.name ?? null,
  };
  if (row.dimension_summary) {
    try {
      out.dimension_summary = JSON.parse(row.dimension_summary) as Record<string, number>;
    } catch {
      // keep as-is
    }
  }
  return out;
}

function parseDate(s: string): Date {
  const d = new Date(s.slice(0, 10));
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export function getTrends(productId: number | null, days: number): TrendRow[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const rStore = loadJson<ReportsStore>(REPORTS_FILE, { nextId: 1, items: [] });
  let items = rStore.items.filter((r) => parseDate(r.report_date) >= cutoff);
  if (productId != null) items = items.filter((r) => r.product_id === productId);
  const byDate = new Map<string, { negative_count: number; report_count: number }>();
  for (const r of items) {
    const d = r.report_date.slice(0, 10);
    const cur = byDate.get(d) ?? { negative_count: 0, report_count: 0 };
    cur.negative_count += r.negative_count;
    cur.report_count += 1;
    byDate.set(d, cur);
  }
  return Array.from(byDate.entries())
    .map(([report_date, v]) => ({ report_date, negative_count: v.negative_count, report_count: v.report_count }))
    .sort((a, b) => a.report_date.localeCompare(b.report_date));
}
