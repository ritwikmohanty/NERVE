import { Hono, type Context } from "hono";
import { nanoid } from "nanoid";
import { sseManager } from "../lib/sse.js";
import { runLeadIngestionAgent, findDuplicateLead } from "../agents/agent1-lead-ingestion.js";
import {
  agentRunsCol,
  leadsCol,
  deliveryLogsCol,
  responseEventsCol,
  visitsCol,
  crmSyncCol,
  learningHistoryCol,
  scoringWeightsCol,
} from "../db/index.js";
import { config } from "../config.js";
import { llmGenerateText, hasLLMKey, llmEnabled, LLM_MODEL } from "../lib/llm.js";
import { requireAuth, authFromRequest, getOrgSettings, type AppEnv } from "../auth/index.js";
import { runPipelineSafely, processReply, latestAgentRun, parseRunOutput } from "../pipeline/orchestrator.js";
import { extractLeadFromText } from "../allhome/capture.js";
import { getIntegrationsReport } from "../integrations/status.js";
import { liveResearchEnabled } from "../lib/runtime.js";
import { buildBundle, buildRadar } from "../allhome/bundler.js";
import { prospectingRoutes } from "../prospecting/routes.js";
import { usageToday } from "../lib/usage.js";
import {
  ALLHOME,
  SOURCES,
  BRANDS,
  CATEGORIES,
  EXPERIENCE_CENTRES,
  PRIORITY_CITIES,
  PROJECT_TYPES,
  SEGMENTS,
  STAGES,
  getBrand,
  normalizeCity,
  type ProjectStage,
  type ProjectType,
  type Segment,
} from "../allhome/catalog.js";
import type { TargetedInput, DiscoveryInput, OutreachStrategy, OutreachChannel, IntentScore } from "../types/index.js";

const api = new Hono<AppEnv>();

const SEGMENT_IDS = Object.keys(SEGMENTS) as Segment[];
const TYPE_IDS = Object.keys(PROJECT_TYPES) as ProjectType[];
const STAGE_IDS = STAGES.map((s) => s.id);

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

async function readJson<T>(c: { req: { json: () => Promise<unknown> } }): Promise<T | null> {
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
}

// ─── Public: health ───
api.get("/health", (c) =>
  c.json({
    status: "ok",
    simulationMode: config.simulationMode,
    sendingLocked: config.simulationMode,
    liveResearch: liveResearchEnabled(),
    liveToggleAllowed: process.env.ALLOW_LIVE_TOGGLE === "true",
    hasGroqKey: hasLLMKey(),
    llmModel: LLM_MODEL,
    hasApolloKey: config.apolloApiKey.length > 5,
    hasTavilyKey: config.tavilyApiKey.length > 5,
    hasResendKey: config.resendApiKey.length > 5,
    hasHeyReachKey: config.heyreachApiKey.length > 5,
    hasAiSensyKey: config.aisensyApiKey.length > 5,
    connectedClients: sseManager.getClientCount(),
    timestamp: new Date().toISOString(),
  })
);

// ─── SSE stream (token via query string — EventSource can't send headers) ───
api.get("/events", async (c) => {
  const auth = await authFromRequest(c.req.header("Authorization"), c.req.query("token"));
  if (!auth) return c.json({ error: "Not authenticated" }, 401);
  const clientId = nanoid();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const leadId = c.req.query("leadId") || undefined;

  return c.newResponse(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const client = {
          id: clientId,
          orgId: auth.orgId,
          leadId,
          send: (event: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)),
          close: () => {
            try { controller.close(); } catch { /* already closed */ }
          },
        };
        sseManager.addClient(client);
        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            clearInterval(heartbeat);
            sseManager.removeClient(clientId);
          }
        }, 25_000);
        client.send({ type: "connected", leadId: "system", orgId: auth.orgId, data: { clientId, simulationMode: config.simulationMode }, timestamp: new Date().toISOString() });
      },
      cancel() {
        clearInterval(heartbeat);
        sseManager.removeClient(clientId);
      },
    }),
    { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" } }
  );
});

// Everything below requires a signed-in user
api.use("/*", async (c, next) => {
  // Exact matches only — a suffix check would also skip auth on e.g. /calendar/events
  const PUBLIC = new Set(["/api/health", "/api/events"]);
  if (PUBLIC.has(c.req.path) || c.req.path.startsWith("/api/auth/")) return next();
  return requireAuth(c, next);
});

// ─── Autopilot prospecting (NERVE finds the firms itself) ───
api.route("/prospecting", prospectingRoutes);

// ─── Shared API usage today (Tavily / Groq / Apollo) ───
api.get("/usage", async (c) => c.json(await usageToday()));

// ─── Delivery-channel readiness (WhatsApp / Email / LinkedIn / CRM) ───
api.get("/integrations", async (c) => c.json(await getIntegrationsReport(c.req.query("refresh") === "1")));

// ─── Catalog (brands, centres, stages, segments) ───
api.get("/catalog", async (c) => {
  const settings = await getOrgSettings(c.get("auth").orgId);
  return c.json({
    brands: BRANDS.map((b) => ({ ...b, enabled: settings.brands.includes(b.id) })),
    categories: CATEGORIES,
    centres: EXPERIENCE_CENTRES.map((ec) => ({ ...ec, brandName: getBrand(ec.brandId)?.name })),
    stages: STAGES,
    segments: SEGMENTS,
    projectTypes: PROJECT_TYPES,
    cities: PRIORITY_CITIES,
    allhome: ALLHOME,
    sources: SOURCES,
  });
});

// ─── F1/F2: live bundle + radar preview (used by the New Mission form) ───
api.post("/bundle/preview", async (c) => {
  const body = (await readJson<Record<string, unknown>>(c)) || {};
  const settings = await getOrgSettings(c.get("auth").orgId);
  const segment = oneOf(body.segment, SEGMENT_IDS) || "architect";
  const projectType = oneOf(body.projectType, TYPE_IDS) || "villa";
  const projectStage = oneOf(body.projectStage, STAGE_IDS) || "design";
  const city = normalizeCity(String(body.city || "")) || undefined;
  const budgetTier = oneOf(body.budgetTier, ["value", "premium", "luxury"] as const);
  return c.json({
    bundle: buildBundle({ segment, projectType, projectStage, city, budgetTier, enabledBrands: settings.brands }),
    radar: buildRadar(projectStage, settings.brands),
  });
});

// ─── Launch: targeted (B2B / B2C) ───
api.post("/leads/execute", async (c) => {
  const auth = c.get("auth");
  const body = await readJson<Record<string, unknown>>(c);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const companyName = String(body.companyName || "").trim();
  if (!companyName) return c.json({ error: "companyName is required (firm or homeowner name)" }, 400);

  try {
    const contactEmail = typeof body.contactEmail === "string" && body.contactEmail.trim() ? body.contactEmail.trim() : undefined;
    const existing = await findDuplicateLead(auth.orgId, companyName, contactEmail);
    if (existing) {
      return c.json({ error: `A pipeline for "${companyName}" already exists (status: ${existing.status.replace(/_/g, " ")})`, leadId: existing.id }, 409);
    }
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : undefined);
    const input: TargetedInput = {
      mode: "targeted",
      companyName,
      contactName: str(body.contactName),
      contactTitle: str(body.contactTitle),
      contactEmail,
      contactPhone: str(body.contactPhone),
      contactLinkedIn: str(body.contactLinkedIn),
      location: str(body.location),
      additionalContext: str(body.additionalContext),
      segment: oneOf(body.segment, SEGMENT_IDS),
      projectType: oneOf(body.projectType, TYPE_IDS),
      projectStage: oneOf(body.projectStage, STAGE_IDS) as ProjectStage | undefined,
      projectName: str(body.projectName),
      projectCity: str(body.projectCity),
      projectValue: str(body.projectValue),
      budgetTier: oneOf(body.budgetTier, ["value", "premium", "luxury"] as const),
      origin: oneOf(body.origin, ["form", "capture", "discovery", "seed"] as const) || "form",
    };

    const leads = await runLeadIngestionAgent(input, auth.orgId);
    if (leads.length === 0) return c.json({ error: "No leads to process (duplicate)" }, 409);
    const lead = leads[0];
    void runPipelineSafely(lead.id, lead);
    return c.json({ pipelineId: lead.id, leadId: lead.id, mode: "targeted", companyName: lead.companyName, contactName: lead.contactName, status: "started" });
  } catch (error) {
    console.error("❌ Failed to start targeted pipeline:", error);
    return c.json({ error: "Failed to start pipeline", details: String(error) }, 500);
  }
});

// ─── Launch: discovery (find specifiers by segment / city) ───
api.post("/leads/discover", async (c) => {
  const auth = c.get("auth");
  const body = await readJson<Record<string, unknown>>(c);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);
  const segment = oneOf(body.segment, SEGMENT_IDS);
  const cities = Array.isArray(body.cities) ? body.cities.map(String).slice(0, 10) : [];
  try {
    const input: DiscoveryInput = {
      mode: "discovery",
      productName: String(body.productName || "AllHome"),
      productDescription: String(body.productDescription || "Premium facades, windows, lighting, hardware, bathware and coatings"),
      targetIndustries: [segment ? SEGMENTS[segment].label : "Architecture & Interiors"],
      segment,
      cities,
      maxResults: Math.min(Math.max(Number(body.maxResults) || 3, 1), 8),
    };
    const leads = await runLeadIngestionAgent(input, auth.orgId);
    if (leads.length === 0) return c.json({ error: "No new firms found — all matches already have active pipelines" }, 404);

    (async () => {
      for (const lead of leads) await runPipelineSafely(leads[0].id, lead);
      sseManager.emit("pipeline_complete", `pipeline:${auth.orgId}`, { pipelineId: leads[0].id, status: "complete", leadsProcessed: leads.length });
    })();

    return c.json({ pipelineId: leads[0].id, leadId: leads[0].id, leadIds: leads.map((l) => l.id), mode: "discovery", leadsFound: leads.length, status: "started" });
  } catch (error) {
    console.error("❌ Failed to start discovery:", error);
    return c.json({ error: "Failed to start discovery", details: String(error) }, 500);
  }
});

// ─── F4: Quick Capture — extract a lead from pasted text ───
api.post("/leads/capture", async (c) => {
  const body = await readJson<{ text?: string }>(c);
  const text = body?.text?.trim();
  if (!text || text.length < 15) return c.json({ error: "Paste at least a few lines of chat, a business card or notes" }, 400);
  if (text.length > 8000) return c.json({ error: "Text is too long (max 8000 characters)" }, 400);
  return c.json({ lead: await extractLeadFromText(text) });
});

// ─── Replies (Simulate Reply panel / provider webhooks) ───
async function handleReply(c: Context<AppEnv>, leadId: string, body: { channel?: OutreachChannel; messageBody?: string }) {
  const auth = c.get("auth");
  if (!body.channel || !["email", "linkedin_dm", "whatsapp"].includes(body.channel)) {
    return c.json({ error: "channel must be one of email, linkedin_dm, whatsapp" }, 400);
  }
  const lead = await leadsCol().findOne({ _id: leadId, orgId: auth.orgId });
  if (!lead) return c.json({ error: "Lead not found" }, 404);
  try {
    const r = await processReply(leadId, auth.orgId, body.channel, body.messageBody);
    return c.json({ status: "processed", sentiment: r.sentiment, action: r.action, reasoning: r.classificationReasoning, visit: r.visit || null });
  } catch (error) {
    console.error("Reply processing error:", error);
    return c.json({ error: "Failed to process reply" }, 500);
  }
}

api.post("/webhook/response", async (c) => {
  const body = await readJson<{ leadId?: string; channel?: OutreachChannel; messageBody?: string }>(c);
  if (!body?.leadId) return c.json({ error: "leadId and channel are required" }, 400);
  return handleReply(c, body.leadId, body);
});

api.post("/leads/:id/reply", async (c) => {
  const body = (await readJson<{ channel?: OutreachChannel; messageBody?: string }>(c)) || {};
  return handleReply(c, c.req.param("id"), body);
});

// ─── Leads ───
api.get("/leads", async (c) => {
  const leads = await leadsCol().find({ orgId: c.get("auth").orgId }).sort({ createdAt: -1 }).limit(500).toArray();
  return c.json({ leads: leads.map((l) => ({ ...l, id: l._id })), count: leads.length });
});

api.get("/leads/export.csv", async (c) => {
  const orgId = c.get("auth").orgId;
  const leads = await leadsCol().find({ orgId }).sort({ createdAt: -1 }).toArray();
  const header = ["Firm", "Segment", "Contact", "Title", "Email", "Phone", "City", "Project", "Type", "Stage", "Value", "Status", "Score", "Tier", "Bundle", "Created"];
  const rows = [header];
  for (const l of leads) {
    const intent = parseRunOutput<IntentScore>(await latestAgentRun(l._id, 3));
    const strategy = parseRunOutput<OutreachStrategy>(await latestAgentRun(l._id, 5));
    rows.push([
      l.companyName, l.segment ? SEGMENTS[l.segment as Segment]?.label : "", l.contactName, l.contactTitle, l.contactEmail, l.contactPhone,
      l.projectCity, l.projectName, l.projectType ? PROJECT_TYPES[l.projectType as ProjectType] : "", l.projectStage, l.projectValue, l.status,
      intent?.compositeScore ?? "", intent?.tier ?? "", strategy?.bundle?.items.map((i) => i.brandName).join(" + ") ?? "", l.createdAt,
    ].map((v) => String(v ?? "")));
  }
  const csv = rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\n");
  return c.body(csv, 200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="allhome-nerve-leads.csv"` });
});

api.get("/leads/:id", async (c) => {
  const leadId = c.req.param("id");
  const lead = await leadsCol().findOne({ _id: leadId, orgId: c.get("auth").orgId });
  if (!lead) return c.json({ error: "Lead not found" }, 404);

  const [runs, deliveries, responses, visits, crm] = await Promise.all([
    agentRunsCol().find({ leadId }).sort({ completedAt: 1 }).toArray(),
    deliveryLogsCol().find({ leadId }).toArray(),
    responseEventsCol().find({ leadId }).sort({ receivedAt: 1 }).toArray(),
    visitsCol().find({ leadId }).sort({ scheduledAt: 1 }).toArray(),
    crmSyncCol().find({ leadId }).sort({ pushedAt: -1 }).limit(1).toArray(),
  ]);
  const agentOutputs: Record<number, unknown> = {};
  for (const run of runs) agentOutputs[run.agentNumber as number] = parseRunOutput(run) ?? run.output;

  return c.json({
    lead: { ...lead, id: lead._id },
    agentRuns: runs.map((r) => ({ ...r, id: r._id })),
    agentOutputs,
    deliveries: deliveries.map((d) => ({ ...d, id: d._id })),
    responses: responses.map((r) => ({ ...r, id: r._id })),
    visits: visits.map((v) => ({ ...v, id: v._id })),
    crmSync: crm[0] ? { ...crm[0], id: crm[0]._id } : null,
  });
});

// ─── F5: Zoho CRM hand-off (simulated unless live credentials are configured) ───
api.post("/leads/:id/crm-push", async (c) => {
  const auth = c.get("auth");
  const leadId = c.req.param("id");
  const lead = await leadsCol().findOne({ _id: leadId, orgId: auth.orgId });
  if (!lead) return c.json({ error: "Lead not found" }, 404);
  const intent = parseRunOutput<IntentScore>(await latestAgentRun(leadId, 3));
  const strategy = parseRunOutput<OutreachStrategy>(await latestAgentRun(leadId, 5));
  const visit = await visitsCol().findOne({ leadId }, { sort: { scheduledAt: -1 } });
  const [first, ...rest] = String(lead.contactName || "").split(" ");

  // Shape of Zoho CRM v2 "Leads" insert — https://www.zoho.com/crm/developer/docs/api/v2/insert-records.html
  const payload = {
    data: [
      {
        First_Name: first,
        Last_Name: rest.join(" ") || first,
        Company: lead.companyName,
        Designation: lead.contactTitle,
        Email: lead.contactEmail,
        Phone: lead.contactPhone,
        City: lead.projectCity,
        Lead_Source: "NERVE Outbound",
        Lead_Status: lead.status === "visit_booked" ? "Visit Scheduled" : lead.status === "active" ? "Contacted - Interested" : "Contacted",
        Rating: intent?.tier === "HOT" ? "Hot" : intent?.tier === "WARM" ? "Warm" : "Cold",
        Description: [
          `Segment: ${lead.segment ? SEGMENTS[lead.segment as Segment]?.label : "-"}`,
          lead.projectAssumed
            ? "Project: not yet confirmed"
            : `Project: ${[lead.projectName, lead.projectStage && `${lead.projectStage} stage`, lead.projectValue].filter(Boolean).join(" · ") || "-"}`,
          lead.dataSource === "live" ? `Profile: live research${lead.research?.website ? ` (${lead.research.website})` : ""}` : "",
          `Intent: ${intent?.compositeScore ?? "-"}/100`,
          `AllHome bundle: ${strategy?.bundle?.items.map((i) => i.brandName).join(" + ") ?? "-"}`,
          visit ? `Visit: ${visit.brandName}, ${visit.centreCity} on ${new Date(String(visit.scheduledAt)).toDateString()}` : "",
        ].filter(Boolean).join("\n"),
      },
    ],
    trigger: ["workflow"],
  };
  const record = {
    _id: nanoid(),
    orgId: auth.orgId,
    leadId,
    provider: "zoho_crm",
    mode: "simulated",
    payload,
    response: { data: [{ code: "SUCCESS", details: { id: `sim_${nanoid(10)}` }, message: "record added (simulated)", status: "success" }] },
    pushedAt: new Date().toISOString(),
  };
  await crmSyncCol().insertOne(record);
  return c.json({ ...record, id: record._id });
});

// ─── Live-send toggle (locked on the public demo) ───
api.post("/config/simulation", async (c) => {
  if (process.env.ALLOW_LIVE_TOGGLE !== "true" || c.get("auth").role === "demo") {
    return c.json({ error: "Live sending is locked on this deployment — messages are always simulated", simulationMode: config.simulationMode }, 403);
  }
  const body = await readJson<{ enabled?: unknown }>(c);
  if (typeof body?.enabled !== "boolean") return c.json({ error: "enabled must be a boolean" }, 400);
  (config as { simulationMode: boolean }).simulationMode = body.enabled;
  return c.json({ simulationMode: config.simulationMode });
});

// ─── F3: experience centres with invite / visit counts ───
api.get("/centres", async (c) => {
  const orgId = c.get("auth").orgId;
  const leads = await leadsCol().find({ orgId }).project({ _id: 1, projectCity: 1 }).toArray();
  const invited: Record<string, number> = {};
  for (const l of leads) {
    const strategy = parseRunOutput<OutreachStrategy>(await latestAgentRun(l._id, 5));
    const id = strategy?.experienceCentre?.centre.id;
    if (id) invited[id] = (invited[id] || 0) + 1;
  }
  const visits = await visitsCol().find({ orgId }).toArray();
  const booked: Record<string, number> = {};
  for (const v of visits) booked[String(v.centreId)] = (booked[String(v.centreId)] || 0) + 1;
  return c.json({
    centres: EXPERIENCE_CENTRES.map((ec) => ({ ...ec, brandName: getBrand(ec.brandId)?.name, invited: invited[ec.id] || 0, visits: booked[ec.id] || 0 })),
  });
});

api.get("/visits", async (c) => {
  const visits = await visitsCol().find({ orgId: c.get("auth").orgId }).sort({ scheduledAt: 1 }).toArray();
  return c.json({ visits: visits.map((v) => ({ ...v, id: v._id })) });
});

api.patch("/visits/:id", async (c) => {
  const body = await readJson<{ status?: string }>(c);
  const status = oneOf(body?.status, ["scheduled", "completed", "cancelled", "no_show"] as const);
  if (!status) return c.json({ error: "status must be scheduled, completed, cancelled or no_show" }, 400);
  const res = await visitsCol().updateOne({ _id: c.req.param("id"), orgId: c.get("auth").orgId }, { $set: { status, updatedAt: new Date().toISOString() } });
  if (!res.matchedCount) return c.json({ error: "Visit not found" }, 404);
  return c.json({ ok: true, status });
});

// ─── Analytics ───
api.get("/analytics", async (c) => {
  const orgId = c.get("auth").orgId;
  const leads = await leadsCol().find({ orgId }).toArray();
  const ids = leads.map((l) => l._id);
  const [responses, visits, history, weights, deliveries] = await Promise.all([
    responseEventsCol().find({ leadId: { $in: ids } }).toArray(),
    visitsCol().find({ orgId }).toArray(),
    learningHistoryCol().find({ orgId }).sort({ updatedAt: 1 }).toArray(),
    scoringWeightsCol().find({ orgId }).toArray(),
    deliveryLogsCol().find({ leadId: { $in: ids }, touchNumber: 1 }).toArray(),
  ]);

  const repliedLeads = new Set(responses.filter((r) => r.sentiment !== "no_reply").map((r) => String(r.leadId)));
  const positiveLeads = new Set(responses.filter((r) => r.sentiment === "positive").map((r) => String(r.leadId)));
  const visitLeads = new Set(visits.map((v) => String(v.leadId)));
  const handedOff = leads.filter((l) => ["active", "visit_booked"].includes(String(l.status))).length;

  const funnel = [
    { stage: "Enriched", count: leads.length },
    { stage: "Contacted", count: new Set(deliveries.map((d) => String(d.leadId))).size },
    { stage: "Replied", count: repliedLeads.size },
    { stage: "Interested", count: positiveLeads.size },
    { stage: "Visit booked", count: visitLeads.size },
    { stage: "Handed to sales", count: handedOff },
  ];

  const countBy = (key: string, label?: (v: string) => string) => {
    const m: Record<string, { count: number; positive: number }> = {};
    for (const l of leads) {
      const k = String(l[key] ?? "unknown");
      m[k] = m[k] || { count: 0, positive: 0 };
      m[k].count++;
      if (positiveLeads.has(l._id)) m[k].positive++;
    }
    return Object.entries(m).map(([k, v]) => ({ key: k, label: label ? label(k) : k, ...v })).sort((a, b) => b.count - a.count);
  };

  // Brand pitches + bundle conversion from learning history
  const brandStats: Record<string, { pitched: number; positive: number }> = {};
  const bundleStats: Record<string, { segment: string; brands: string[]; total: number; positive: number }> = {};
  for (const h of history) {
    const brands = (h.bundleBrands as string[]) || [];
    for (const b of brands) {
      brandStats[b] = brandStats[b] || { pitched: 0, positive: 0 };
      brandStats[b].pitched++;
      if (h.sentiment === "positive") brandStats[b].positive++;
    }
    const sorted = [...brands].sort();
    const key = `${h.segment || "unknown"}|${sorted.join("+")}`;
    bundleStats[key] = bundleStats[key] || { segment: String(h.segment || "unknown"), brands: sorted, total: 0, positive: 0 };
    bundleStats[key].total++;
    if (h.sentiment === "positive") bundleStats[key].positive++;
  }

  // Weight trajectory: start from defaults, apply each learning step in order
  const weightSeries: Array<{ at: string; weights: Record<string, number> }> = [];
  const running: Record<string, number> = Object.fromEntries(weights.map((w) => [String(w.dimension), Number(w.previousWeight ?? w.weight)]));
  for (const h of history) {
    Object.assign(running, (h.weightsAfter as Record<string, number>) || {});
    weightSeries.push({ at: String(h.updatedAt), weights: { ...running } });
  }

  return c.json({
    totals: { leads: leads.length, replied: repliedLeads.size, positive: positiveLeads.size, visits: visits.length, handedOff, replyRate: leads.length ? repliedLeads.size / leads.length : 0 },
    funnel,
    bySegment: countBy("segment", (k) => SEGMENTS[k as Segment]?.label || k),
    byCity: countBy("projectCity"),
    byStage: countBy("projectStage", (k) => STAGES.find((s) => s.id === k)?.label || k),
    byBrand: Object.entries(brandStats).map(([id, v]) => ({ brandId: id, brandName: getBrand(id)?.name || id, ...v })).sort((a, b) => b.pitched - a.pitched),
    bundles: Object.values(bundleStats).map((b) => ({ ...b, segmentLabel: SEGMENTS[b.segment as Segment]?.label || b.segment, brandNames: b.brands.map((x) => getBrand(x)?.name || x), rate: b.total ? b.positive / b.total : 0 })).sort((a, b) => b.total - a.total).slice(0, 12),
    weights: weights.map((w) => ({ dimension: w.dimension, weight: w.weight, previousWeight: w.previousWeight, updatedAt: w.updatedAt })),
    weightSeries: weightSeries.slice(-30),
  });
});

// ═══════════════════════ CALENDAR ═══════════════════════

type CalendarEvent = {
  id: string; kind: "touch" | "visit"; leadId: string; companyName: string; contactName: string; contactTitle: string;
  channel: string; touchNumber: number; scheduledAt: string; dayOffset: number; toneFramework: string; timezone: string;
  primaryChannel: string; sentiment?: string; action?: string; tier?: string; compositeScore?: number;
  focusBrands?: string[]; purpose?: string; centreCity?: string; brandName?: string; address?: string; status?: string;
};

async function buildCalendar(orgId: string): Promise<CalendarEvent[]> {
  const leads = await leadsCol().find({ orgId }).toArray();
  const events: CalendarEvent[] = [];
  for (const lead of leads) {
    const leadId = lead._id;
    const strategy = parseRunOutput<OutreachStrategy>(await latestAgentRun(leadId, 5));
    if (!strategy?.cadence?.length) continue;
    const intent = parseRunOutput<{ compositeScore?: number; tier?: string }>(await latestAgentRun(leadId, 3)) || {};
    const resp = parseRunOutput<{ sentiment?: string; action?: string }>(await latestAgentRun(leadId, 9)) || {};
    // Stop showing future touches once the lead opted out
    const stopped = lead.status === "do_not_contact";
    for (const tp of strategy.cadence) {
      if (stopped && tp.touchNumber > 1) continue;
      events.push({
        id: `${leadId}-touch-${tp.touchNumber}`, kind: "touch", leadId,
        companyName: String(lead.companyName || "Unknown"), contactName: String(lead.contactName || ""), contactTitle: String(lead.contactTitle || ""),
        channel: tp.channel, touchNumber: tp.touchNumber, scheduledAt: tp.scheduledAt, dayOffset: tp.dayOffset, toneFramework: tp.toneFramework,
        timezone: strategy.timezone || "Asia/Kolkata", primaryChannel: strategy.primaryChannel, sentiment: resp.sentiment, action: resp.action,
        tier: intent.tier, compositeScore: intent.compositeScore, focusBrands: (tp.focusBrands || []).map((b) => getBrand(b)?.name || b), purpose: tp.purpose,
      });
    }
  }
  const visits = await visitsCol().find({ orgId }).toArray();
  for (const v of visits) {
    events.push({
      id: `visit-${v._id}`, kind: "visit", leadId: String(v.leadId), companyName: String(v.companyName), contactName: String(v.contactName), contactTitle: "",
      channel: "visit", touchNumber: 0, scheduledAt: String(v.scheduledAt), dayOffset: 0, toneFramework: "", timezone: "Asia/Kolkata", primaryChannel: "visit",
      centreCity: String(v.centreCity), brandName: String(v.brandName), address: String(v.address || ""), status: String(v.status), purpose: `Experience centre visit — ${v.brandName}, ${v.centreCity}`,
    });
  }
  return events.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

api.get("/calendar/events", async (c) => {
  try {
    const events = await buildCalendar(c.get("auth").orgId);
    return c.json({ events, count: events.length });
  } catch (error) {
    console.error("Calendar events error:", error);
    return c.json({ error: "Failed to fetch calendar events" }, 500);
  }
});

function formatInZone(dt: Date, timeZone = "Asia/Kolkata"): string {
  const opts = (tz: string): Intl.DateTimeFormatOptions => ({ weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz, timeZoneName: "short" });
  try {
    return dt.toLocaleString("en-US", opts(timeZone));
  } catch {
    return dt.toLocaleString("en-US", opts("UTC"));
  }
}

api.post("/calendar/chat", async (c) => {
  const body = await readJson<{ message?: string }>(c);
  const message = body?.message?.trim();
  if (!message) return c.json({ error: "message is required" }, 400);
  try {
    const events = await buildCalendar(c.get("auth").orgId);
    const entries = events.map((e) =>
      e.kind === "visit"
        ? `- VISIT: ${e.contactName} (${e.companyName}) at ${e.brandName} experience centre, ${e.centreCity} | ${formatInZone(new Date(e.scheduledAt))} | ${e.status}`
        : `- ${e.contactName} @ ${e.companyName} | Touch ${e.touchNumber} via ${e.channel.replace(/_/g, " ")} | ${formatInZone(new Date(e.scheduledAt), e.timezone)} | Brands: ${(e.focusBrands || []).join(", ")} | Response: ${e.sentiment || "pending"}`
    );
    const schedule = entries.length ? entries.join("\n") : "No outreach activities scheduled yet.";

    if (llmEnabled()) {
      try {
        const reply = await llmGenerateText(
          `You are the schedule assistant for AllHome's NERVE outreach engine. Today is ${formatInZone(new Date())}. Answer clearly and concisely using ONLY this schedule (touches and experience-centre visits):\n${schedule}\nFormat channels nicely (WhatsApp, LinkedIn DM, Email). Reply in plain text only — no markdown tables, headings or bold; use short "- " bullet lines when listing items.`,
          message
        );
        return c.json({ reply });
      } catch (err) {
        console.warn("Calendar chat LLM failed, using fallback:", String(err));
      }
    }

    // Offline answer: simple intent handling over the schedule
    const lower = message.toLowerCase();
    const now = Date.now();
    let picked = events;
    let heading = `Here's your schedule (${events.length} items)`;
    if (/visit|centre|center|showroom/.test(lower)) {
      picked = events.filter((e) => e.kind === "visit");
      heading = picked.length ? `${picked.length} experience-centre visit(s) booked` : "No experience-centre visits booked yet";
    } else if (/today/.test(lower)) {
      picked = events.filter((e) => new Date(e.scheduledAt).toDateString() === new Date().toDateString());
      heading = picked.length ? "Today's activities" : "Nothing scheduled for today";
    } else if (/week|upcoming|next|coming/.test(lower)) {
      picked = events.filter((e) => new Date(e.scheduledAt).getTime() >= now && new Date(e.scheduledAt).getTime() <= now + 7 * 86_400_000);
      heading = picked.length ? `${picked.length} activities in the next 7 days` : "Nothing in the next 7 days";
    }
    const lines = picked.slice(0, 12).map((e) => entries[events.indexOf(e)]);
    return c.json({ reply: `${heading}:\n\n${lines.join("\n")}${picked.length > 12 ? `\n…and ${picked.length - 12} more.` : ""}` });
  } catch (error) {
    console.error("Calendar chat error:", error);
    return c.json({ reply: "I'm having trouble reading the schedule right now. Please try again in a moment." });
  }
});

export { api };
