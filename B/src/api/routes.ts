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
import { wrapHandler } from "./wrapHandler.js";
import { parseOptionalId, parseLimit, parseDays, parseIdParam } from "./queryHelpers.js";
import { MSG_NOT_FOUND, MSG_PRODUCT_URL_EXISTS, MSG_PRODUCT_URL_REQUIRED } from "../constants.js";

const router = Router();

router.get(
  "/products",
  wrapHandler((_req, res) => {
    const rows = listProducts();
    res.json({ success: true, data: rows });
  })
);

router.post(
  "/products",
  wrapHandler((req, res) => {
    const { product_url, name } = req.body ?? {};
    if (!product_url || typeof product_url !== "string" || !product_url.trim()) {
      res.status(400).json({ success: false, error: MSG_PRODUCT_URL_REQUIRED });
      return;
    }
    try {
      const id = addProduct(product_url.trim(), name?.trim() ?? null);
      const product = getProduct(id);
      res.status(201).json({ success: true, data: product });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("UNIQUE")) {
        res.status(409).json({ success: false, error: MSG_PRODUCT_URL_EXISTS });
        return;
      }
      throw e;
    }
  })
);

router.get(
  "/products/:id",
  wrapHandler((req, res) => {
    const id = parseIdParam(req.params);
    if (id == null) {
      res.status(400).json({ success: false, error: "Invalid id" });
      return;
    }
    const product = getProduct(id);
    if (!product) {
      res.status(404).json({ success: false, error: MSG_NOT_FOUND });
      return;
    }
    res.json({ success: true, data: product });
  })
);

router.delete(
  "/products/:id",
  wrapHandler((req, res) => {
    const id = parseIdParam(req.params);
    if (id == null) {
      res.status(400).json({ success: false, error: "Invalid id" });
      return;
    }
    deleteProduct(id);
    res.json({ success: true });
  })
);

router.get(
  "/reports",
  wrapHandler((req, res) => {
    const productId = parseOptionalId(req.query.product_id);
    const limit = parseLimit(req.query.limit, 100, 200);
    const rows = listReports(productId, limit);
    res.json({ success: true, data: rows });
  })
);

router.get(
  "/reports/:id",
  wrapHandler((req, res) => {
    const id = parseIdParam(req.params);
    if (id == null) {
      res.status(400).json({ success: false, error: "Invalid id" });
      return;
    }
    const report = getReport(id);
    if (!report) {
      res.status(404).json({ success: false, error: MSG_NOT_FOUND });
      return;
    }
    res.json({ success: true, data: report });
  })
);

router.get(
  "/trends",
  wrapHandler((req, res) => {
    const productId = parseOptionalId(req.query.product_id);
    const days = parseDays(req.query.days, 30, 365);
    const rows = getTrends(productId, days);
    res.json({ success: true, data: rows });
  })
);

router.post(
  "/monitor/run",
  wrapHandler(async (_req, res) => {
    const results = await runDailyMonitor();
    res.json({ success: true, data: results });
  })
);

export default router;
