import "dotenv/config";
import express from "express";
import cron from "node-cron";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import routes from "./api/routes.js";
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

const app = express();
app.use(express.json());
app.use("/api", routes);

const publicDir = getPublicDir();
app.use(express.static(publicDir));
app.get("/", (_req, res) => {
  res.sendFile(join(publicDir, "index.html"));
});

cron.schedule(CRON_DAILY, runScheduledDailyMonitor);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
