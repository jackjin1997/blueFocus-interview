import "dotenv/config";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import cron from "node-cron";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import apiRoutes from "./api/routes.js";
import { initStorage } from "./db/schema.js";
import { runDailyMonitor } from "./jobs/dailyMonitor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const CRON_DAILY = process.env.CRON_DAILY || "0 8 * * *";

function getPublicDir(): string {
  return join(__dirname, "..", "public");
}

async function runScheduledDailyMonitor(): Promise<void> {
  console.log("[cron] daily monitor start");
  try {
    const results = await runDailyMonitor();
    console.log("[cron] daily monitor done", results);
  } catch (e) {
    console.error("[cron] daily monitor error", e);
  }
}

initStorage();

const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

await app.register(fastifyStatic, {
  root: getPublicDir(),
  prefix: "/",
});

app.get("/", (_request, reply) => {
  return reply.sendFile("index.html");
});

await app.register(apiRoutes, { prefix: "/api" });

cron.schedule(CRON_DAILY, runScheduledDailyMonitor);

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Server running at http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
