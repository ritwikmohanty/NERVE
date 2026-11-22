/**
 * Autopilot prospecting API — mounted at /api/prospecting (auth required).
 */
import { Hono } from "hono";
import type { AppEnv } from "../auth/index.js";
import { prospectRunsCol, prospectsCol } from "../db/index.js";
import { config as appConfig } from "../config.js";
import { llmEnabled } from "../lib/llm.js";
import { liveResearchEnabled, tavilyEnabled } from "../lib/runtime.js";
import { usageToday } from "../lib/usage.js";
import { TRIGGERS, TRIGGER_IDS } from "./triggers.js";
import {
  AutopilotError,
  activeRun,
  estimateRun,
  getConfig,
  limitsFor,
  pipelinesToday,
  queueDepth,
  runProspectOnDemand,
  sanitizeConfig,
  saveConfig,
  startRun,
  unitCosts,
  type AutopilotConfig,
} from "./engine.js";

export const prospectingRoutes = new Hono<AppEnv>();

const toClient = (d: Record<string, unknown> | null) => {
  if (!d) return null;
  const { _id, ...rest } = d;
  return { id: _id, ...rest };
};

async function overview(orgId: string, role: Parameters<typeof limitsFor>[0], cfgOverride?: AutopilotConfig) {
  const cfg = cfgOverride || (await getConfig(orgId));
  const limits = limitsFor(role);
  const usage = await usageToday();
  const live = liveResearchEnabled() && tavilyEnabled() && llmEnabled();
  const [runs, active, usedToday] = await Promise.all([
    prospectRunsCol().find({ orgId }).sort({ startedAt: -1 }).limit(10).toArray(),
    activeRun(orgId),
    pipelinesToday(orgId),
  ]);
  return {
    config: cfg,
    limits,
    live,
    sendingLocked: appConfig.simulationMode,
    triggers: TRIGGER_IDS.map((id) => {
      const { query, ...rest } = TRIGGERS[id];
      void query;
      return rest;
    }),
    usage,
    unitCosts: { live: unitCosts(true), sample: unitCosts(false) },
    estimate: estimateRun(cfg, limits, live, usage),
    sampleEstimate: estimateRun(cfg, limits, false, usage),
    pipelinesToday: usedToday,
    queueDepth: queueDepth(),
    activeRunId: active?._id || null,
    runs: runs.map(toClient),
  };
}

prospectingRoutes.get("/", async (c) => {
  const auth = c.get("auth");
  return c.json(await overview(auth.orgId, auth.role));
});

prospectingRoutes.patch("/config", async (c) => {
  const auth = c.get("auth");
  let body: Partial<AutopilotConfig>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const current = await getConfig(auth.orgId);
  const { config, error } = sanitizeConfig(body, current, limitsFor(auth.role));
  if (error) return c.json({ error }, 400);
  await saveConfig(config);
  return c.json(await overview(auth.orgId, auth.role, config));
});

prospectingRoutes.post("/run", async (c) => {
  const auth = c.get("auth");
  const body = ((await c.req.json().catch(() => ({}))) || {}) as { sample?: boolean };
  try {
    const runId = await startRun(auth.orgId, auth.role, { sample: !!body.sample, by: "manual" });
    return c.json({ runId, status: "started" });
  } catch (err) {
    if (err instanceof AutopilotError) return c.json({ error: err.message }, err.status as 400);
    console.error("❌ Autopilot start failed:", err);
    return c.json({ error: "Couldn't start Autopilot", details: String(err) }, 500);
  }
});

prospectingRoutes.get("/runs/:id", async (c) => {
  const orgId = c.get("auth").orgId;
  const run = await prospectRunsCol().findOne({ _id: c.req.param("id"), orgId });
  if (!run) return c.json({ error: "Run not found" }, 404);
  const prospects = await prospectsCol().find({ orgId, runId: run._id }).sort({ rank: 1 }).toArray();
  return c.json({ run: toClient(run), prospects: prospects.map(toClient) });
});

/** Every firm Autopilot has found for this workspace (newest run first). */
prospectingRoutes.get("/prospects", async (c) => {
  const orgId = c.get("auth").orgId;
  const prospects = await prospectsCol().find({ orgId, status: { $ne: "dismissed" } }).sort({ createdAt: -1, rank: 1 }).limit(200).toArray();
  return c.json({ prospects: prospects.map(toClient) });
});

prospectingRoutes.post("/prospects/:id/run", async (c) => {
  const auth = c.get("auth");
  try {
    await runProspectOnDemand(c.req.param("id"), auth.orgId, auth.role);
    return c.json({ status: "queued" });
  } catch (err) {
    if (err instanceof AutopilotError) return c.json({ error: err.message }, err.status as 400);
    return c.json({ error: "Couldn't start the pipeline", details: String(err) }, 500);
  }
});

prospectingRoutes.post("/prospects/:id/dismiss", async (c) => {
  const orgId = c.get("auth").orgId;
  const res = await prospectsCol().updateOne({ _id: c.req.param("id"), orgId, status: { $in: ["shortlisted", "error"] } }, { $set: { status: "dismissed" } });
  if (!res.matchedCount) return c.json({ error: "Only shortlisted firms can be dismissed" }, 409);
  return c.json({ ok: true });
});
