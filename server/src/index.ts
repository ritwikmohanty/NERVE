import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "./config.js";
import { api } from "./api/routes.js";
import { authRoutes } from "./auth/index.js";
import { connectDB, ensureIndexes } from "./db/index.js";
import { seedDemoWorkspace } from "./db/seed-demo.js";
import { recoverInterruptedRuns, startScheduler } from "./prospecting/engine.js";

const app = new Hono();

// Allowed browser origins: CLIENT_URL (comma-separated for multiple), Vercel previews of
// the same project, and any localhost port for development.
const allowedOrigins = config.clientUrl.split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const vercelProject = process.env.VERCEL_PROJECT_SLUG; // e.g. "nerve-allhome" → allows nerve-allhome-*.vercel.app previews

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0] || "*";
      if (allowedOrigins.includes(origin)) return origin;
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
      if (vercelProject && new RegExp(`^https://${vercelProject}(-[a-z0-9-]+)?\\.vercel\\.app$`).test(origin)) return origin;
      return null;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use("*", logger());

app.route("/api/auth", authRoutes);
app.route("/api", api);

app.get("/", (c) =>
  c.json({
    name: "NERVE Engine, AllHome edition",
    version: "2.0.0",
    description: "Autonomous specifier outreach engine for AllHome's brand collective",
    health: "GET /api/health",
  })
);

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error(`❌ Cannot connect to MongoDB at ${config.mongoUri.replace(/\/\/[^@]*@/, "//***@")}. Start it first (e.g. \`brew services start mongodb-community\`) or set MONGO_URI.`);
    throw err;
  }
  await ensureIndexes();
  await recoverInterruptedRuns();
  await seedDemoWorkspace();

  serve({ fetch: app.fetch, port: config.port });
  startScheduler();
  console.log(`🧠 NERVE (AllHome edition), ${config.simulationMode ? "SIMULATION" : "LIVE"} mode, http://localhost:${config.port}`);
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
