import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import Fastify from "fastify";

const testDataDir = mkdtempSync(join(tmpdir(), "rm-routes-test-"));
process.env.DATA_DIR = testDataDir;

describe("api routes", () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    const schema = await import("../db/schema.js");
    schema.initStorage();
    const { default: apiRoutes } = await import("./routes.js");
    app = Fastify();
    await app.register(apiRoutes, { prefix: "/api" });
  });

  afterAll(async () => {
    await app.close();
    rmSync(testDataDir, { recursive: true, force: true });
  });

  it("GET /api/products returns empty list", async () => {
    const res = await app.inject({ method: "GET", url: "/api/products" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("POST /api/products requires product_url", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("product_url");
  });

  it("POST /api/products creates product", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { product_url: "https://example.com/p/1", name: "Test" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.product_url).toBe("https://example.com/p/1");
    expect(res.json().data.name).toBe("Test");
  });

  it("POST /api/products duplicate url returns 409", async () => {
    await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { product_url: "https://example.com/p/dup", name: "A" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { product_url: "https://example.com/p/dup", name: "B" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("GET /api/products/:id returns 400 for invalid id", async () => {
    const res = await app.inject({ method: "GET", url: "/api/products/abc" });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/products/:id returns 404 when not found", async () => {
    const res = await app.inject({ method: "GET", url: "/api/products/99999" });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/products/:id returns product", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { product_url: "https://example.com/p/2", name: "P2" },
    });
    const id = create.json().data.id;
    const res = await app.inject({ method: "GET", url: `/api/products/${id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe("P2");
  });

  it("DELETE /api/products/:id", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { product_url: "https://example.com/p/del", name: "Del" },
    });
    const id = create.json().data.id;
    const res = await app.inject({ method: "DELETE", url: `/api/products/${id}` });
    expect(res.statusCode).toBe(200);
  });

  it("GET /api/reports returns list", async () => {
    const res = await app.inject({ method: "GET", url: "/api/reports" });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data)).toBe(true);
  });

  it("GET /api/reports/:id invalid id returns 400", async () => {
    const res = await app.inject({ method: "GET", url: "/api/reports/abc" });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/reports/:id returns 404 when not found", async () => {
    const res = await app.inject({ method: "GET", url: "/api/reports/99999" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBeDefined();
  });

  it("GET /api/trends returns list", async () => {
    const res = await app.inject({ method: "GET", url: "/api/trends" });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data)).toBe(true);
  });

  it("POST /api/monitor/run returns success", async () => {
    const res = await app.inject({ method: "POST", url: "/api/monitor/run" });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    expect(Array.isArray(res.json().data)).toBe(true);
  }, 30000);
});
