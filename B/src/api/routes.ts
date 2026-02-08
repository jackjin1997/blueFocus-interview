/**
 * REST API 路由
 */

import { Router, Request, Response } from "express";
import {
  listProducts,
  addProduct,
  getProduct,
  deleteProduct,
  listReports,
  getReport,
  getTrends,
} from "../db/schema.js";
import { runDailyMonitor } from "../jobs/dailyMonitor.js";

const router = Router();

router.get("/products", (_req: Request, res: Response) => {
  try {
    const rows = listProducts();
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post("/products", (req: Request, res: Response) => {
  try {
    const { product_url, name } = req.body ?? {};
    if (!product_url || typeof product_url !== "string" || !product_url.trim()) {
      return res.status(400).json({ success: false, error: "product_url required" });
    }
    const id = addProduct(product_url.trim(), name?.trim() ?? null);
    const product = getProduct(Number(id));
    res.status(201).json({ success: true, data: product });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("UNIQUE")) {
      return res.status(409).json({ success: false, error: "商品链接已存在" });
    }
    res.status(500).json({ success: false, error: msg });
  }
});

router.get("/products/:id", (req: Request, res: Response) => {
  try {
    const product = getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: product });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.delete("/products/:id", (req: Request, res: Response) => {
  try {
    deleteProduct(Number(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.get("/reports", (req: Request, res: Response) => {
  try {
    const productId = req.query.product_id ? Number(req.query.product_id) : null;
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const rows = listReports(productId, limit);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.get("/reports/:id", (req: Request, res: Response) => {
  try {
    const report = getReport(Number(req.params.id));
    if (!report) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: report });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.get("/trends", (req: Request, res: Response) => {
  try {
    const productId = req.query.product_id ? Number(req.query.product_id) : null;
    const days = Math.min(Number(req.query.days) || 30, 365);
    const rows = getTrends(productId, days);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post("/monitor/run", async (_req: Request, res: Response) => {
  try {
    const results = await runDailyMonitor();
    res.json({ success: true, data: results });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

export default router;
