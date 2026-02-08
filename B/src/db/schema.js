/**
 * SQLite 数据库：表结构及读写封装
 * 表：products, comment_snapshots, reports
 */

import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const defaultDbPath = join(__dirname, "../../data/monitor.db");

function ensureDataDir(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

let _db = null;

export function getDb(dbPath = defaultDbPath) {
  if (_db) return _db;
  ensureDataDir(dbPath);
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_url TEXT NOT NULL UNIQUE,
      name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comment_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      date_range_start TEXT NOT NULL,
      date_range_end TEXT NOT NULL,
      comment_count INTEGER NOT NULL DEFAULT 0,
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      snapshot_id INTEGER,
      report_date TEXT NOT NULL,
      negative_count INTEGER NOT NULL DEFAULT 0,
      negative_summary TEXT,
      dimension_summary TEXT,
      content TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (snapshot_id) REFERENCES comment_snapshots(id)
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_product ON comment_snapshots(product_id);
    CREATE INDEX IF NOT EXISTS idx_reports_product ON reports(product_id);
    CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(report_date);
  `);
}

// --- products ---

export function listProducts(db = getDb()) {
  return db.prepare("SELECT id, product_url, name, created_at FROM products ORDER BY id").all();
}

export function addProduct(productUrl, name = null, db = getDb()) {
  const stmt = db.prepare("INSERT INTO products (product_url, name) VALUES (?, ?)");
  const result = stmt.run(productUrl, name || null);
  return result.lastInsertRowid;
}

export function getProduct(id, db = getDb()) {
  return db.prepare("SELECT id, product_url, name, created_at FROM products WHERE id = ?").get(id);
}

export function deleteProduct(id, db = getDb()) {
  db.prepare("DELETE FROM reports WHERE product_id = ?").run(id);
  db.prepare("DELETE FROM comment_snapshots WHERE product_id = ?").run(id);
  return db.prepare("DELETE FROM products WHERE id = ?").run(id);
}

// --- comment_snapshots ---

export function insertSnapshot(productId, dateRangeStart, dateRangeEnd, commentCount, rawJson, db = getDb()) {
  const stmt = db.prepare(`
    INSERT INTO comment_snapshots (product_id, date_range_start, date_range_end, comment_count, raw_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(productId, dateRangeStart, dateRangeEnd, commentCount, rawJson ? JSON.stringify(rawJson) : null);
  return result.lastInsertRowid;
}

export function getSnapshot(id, db = getDb()) {
  return db.prepare("SELECT * FROM comment_snapshots WHERE id = ?").get(id);
}

// --- reports ---

export function insertReport(productId, snapshotId, reportDate, negativeCount, negativeSummary, dimensionSummary, content, db = getDb()) {
  const stmt = db.prepare(`
    INSERT INTO reports (product_id, snapshot_id, report_date, negative_count, negative_summary, dimension_summary, content)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    productId,
    snapshotId,
    reportDate,
    negativeCount,
    negativeSummary || null,
    dimensionSummary ? JSON.stringify(dimensionSummary) : (typeof dimensionSummary === "string" ? dimensionSummary : null),
    content || null
  );
  return result.lastInsertRowid;
}

export function listReports(productId = null, limit = 100, db = getDb()) {
  if (productId) {
    return db.prepare(`
      SELECT r.*, p.product_url, p.name as product_name
      FROM reports r
      JOIN products p ON r.product_id = p.id
      WHERE r.product_id = ?
      ORDER BY r.report_date DESC, r.id DESC
      LIMIT ?
    `).all(productId, limit);
  }
  return db.prepare(`
    SELECT r.*, p.product_url, p.name as product_name
    FROM reports r
    JOIN products p ON r.product_id = p.id
    ORDER BY r.report_date DESC, r.id DESC
    LIMIT ?
  `).all(limit);
}

export function getReport(id, db = getDb()) {
  const row = db.prepare(`
    SELECT r.*, p.product_url, p.name as product_name
    FROM reports r
    JOIN products p ON r.product_id = p.id
    WHERE r.id = ?
  `).get(id);
  if (row && row.dimension_summary) {
    try {
      row.dimension_summary = JSON.parse(row.dimension_summary);
    } catch (_) {}
  }
  return row;
}

// --- trends: 按日聚合负面数量/率 ---

export function getTrends(productId = null, days = 30, db = getDb()) {
  const sql = productId
    ? `SELECT report_date, SUM(negative_count) as negative_count, COUNT(*) as report_count
       FROM reports WHERE product_id = ? AND report_date >= date('now', ?)
       GROUP BY report_date ORDER BY report_date`
    : `SELECT report_date, SUM(negative_count) as negative_count, COUNT(*) as report_count
       FROM reports WHERE report_date >= date('now', ?)
       GROUP BY report_date ORDER BY report_date`;
  const params = productId ? [productId, `-${days} days`] : [`-${days} days`];
  return db.prepare(sql).all(...params);
}
