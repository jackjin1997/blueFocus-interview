import type { FastifyInstance } from "fastify";
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
import { parseOptionalId, parseLimit, parseDays, parseIdParam } from "./queryHelpers.js";
import { MSG_NOT_FOUND, MSG_PRODUCT_URL_EXISTS, MSG_PRODUCT_URL_REQUIRED } from "../constants.js";

type BodyAddProduct = { product_url?: string; name?: string };
type ParamsId = { id?: string };
type QueryReports = { product_id?: string; limit?: string };
type QueryTrends = { product_id?: string; days?: string };

export default async function apiRoutes(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((err, _request, reply) => {
    const message = (err as Error)?.message ?? String(err);
    const code = (err as { statusCode?: number })?.statusCode ?? 500;
    reply.status(code).send({ success: false, error: message });
  });

  app.get("/products", async (_request, reply) => {
    const rows = listProducts();
    return reply.send({ success: true, data: rows });
  });

  app.post<{ Body: BodyAddProduct }>("/products", async (request, reply) => {
    const { product_url, name } = request.body ?? {};
    if (!product_url || typeof product_url !== "string" || !product_url.trim()) {
      return reply.status(400).send({ success: false, error: MSG_PRODUCT_URL_REQUIRED });
    }
    try {
      const id = addProduct(product_url.trim(), name?.trim() ?? null);
      const product = getProduct(id);
      return reply.status(201).send({ success: true, data: product });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("UNIQUE")) {
        return reply.status(409).send({ success: false, error: MSG_PRODUCT_URL_EXISTS });
      }
      throw e;
    }
  });

  app.get<{ Params: ParamsId }>("/products/:id", async (request, reply) => {
    const id = parseIdParam(request.params);
    if (id == null) {
      return reply.status(400).send({ success: false, error: "Invalid id" });
    }
    const product = getProduct(id);
    if (!product) {
      return reply.status(404).send({ success: false, error: MSG_NOT_FOUND });
    }
    return reply.send({ success: true, data: product });
  });

  app.delete<{ Params: ParamsId }>("/products/:id", async (request, reply) => {
    const id = parseIdParam(request.params);
    if (id == null) {
      return reply.status(400).send({ success: false, error: "Invalid id" });
    }
    deleteProduct(id);
    return reply.send({ success: true });
  });

  app.get<{ Querystring: QueryReports }>("/reports", async (request, reply) => {
    const productId = parseOptionalId(request.query?.product_id);
    const limit = parseLimit(request.query?.limit, 100, 200);
    const rows = listReports(productId, limit);
    return reply.send({ success: true, data: rows });
  });

  app.get<{ Params: ParamsId }>("/reports/:id", async (request, reply) => {
    const id = parseIdParam(request.params);
    if (id == null) {
      return reply.status(400).send({ success: false, error: "Invalid id" });
    }
    const report = getReport(id);
    if (!report) {
      return reply.status(404).send({ success: false, error: MSG_NOT_FOUND });
    }
    return reply.send({ success: true, data: report });
  });

  app.get<{ Querystring: QueryTrends }>("/trends", async (request, reply) => {
    const productId = parseOptionalId(request.query?.product_id);
    const days = parseDays(request.query?.days, 30, 365);
    const rows = getTrends(productId, days);
    return reply.send({ success: true, data: rows });
  });

  app.post("/monitor/run", async (_request, reply) => {
    const results = await runDailyMonitor();
    return reply.send({ success: true, data: results });
  });
}
