/**
 * 入口：启动 HTTP 服务 + 定时每日监测
 */

import "dotenv/config";
import express from "express";
import cron from "node-cron";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import routes from "./api/routes.js";
import { getDb } from "./db/schema.js";
import { runDailyMonitor } from "./jobs/dailyMonitor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const CRON_DAILY = process.env.CRON_DAILY || "0 8 * * *";

// 初始化 DB
getDb();

const app = express();
app.use(express.json());
app.use("/api", routes);

// 静态前端
const publicDir = join(__dirname, "public");
app.use(express.static(publicDir));
app.get("/", (req, res) => {
  res.sendFile(join(publicDir, "index.html"));
});

// 每日 8:00 执行监测
cron.schedule(CRON_DAILY, async () => {
  console.log("[cron] daily monitor start");
  try {
    const results = await runDailyMonitor();
    console.log("[cron] daily monitor done", results);
  } catch (e) {
    console.error("[cron] daily monitor error", e);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
