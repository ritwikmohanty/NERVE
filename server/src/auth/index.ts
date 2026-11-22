/**
 * Authentication & workspaces.
 *
 * Tokens are signed JWTs sent as `Authorization: Bearer <token>` (or `?token=` for the
 * SSE stream, since EventSource can't set headers). We deliberately avoid cookies: the
 * client (vercel.app) and API (onrender.com) are different sites, and Safari/iOS block
 * third-party cookies — a bearer token works everywhere.
 */
import { Hono, type MiddlewareHandler } from "hono";
import { sign, verify } from "hono/jwt";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { randomBytes } from "crypto";
import { usersCol, orgsCol, scoringWeightsCol } from "../db/index.js";
import { DEFAULT_SCORING_WEIGHTS } from "../types/index.js";
import { BRANDS, PRIORITY_CITIES, type Segment } from "../allhome/catalog.js";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    console.warn("⚠️  JWT_SECRET not set, using a random secret (sessions reset on restart)");
    return randomBytes(32).toString("hex");
  })();

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

export const DEMO_EMAIL = "demo@allhome.nerve";

export interface AuthCtx {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  role: "owner" | "member" | "demo";
}

export type AppEnv = { Variables: { auth: AuthCtx } };

export interface OrgSettings {
  brands: string[];
  segments: Segment[];
  cities: string[];
  onboarded: boolean;
  senderName: string;
  senderTitle: string;
}

export function defaultOrgSettings(): OrgSettings {
  return {
    brands: BRANDS.map((b) => b.id),
    segments: ["architect", "id_firm", "developer", "contractor", "homeowner"],
    cities: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad"],
    onboarded: false,
    senderName: "AllHome Specifier Desk",
    senderTitle: "Specification Partner, AllHome",
  };
}

export async function getOrgSettings(orgId: string): Promise<OrgSettings> {
  const org = await orgsCol().findOne({ _id: orgId });
  return { ...defaultOrgSettings(), ...((org?.settings as Partial<OrgSettings>) || {}) };
}

/** Seed per-workspace scoring weights (Agent 10 learns per workspace). */
export async function ensureOrgWeights(orgId: string): Promise<void> {
  const now = new Date().toISOString();
  for (const [dimension, weight] of Object.entries(DEFAULT_SCORING_WEIGHTS)) {
    await scoringWeightsCol().updateOne(
      { orgId, dimension },
      { $setOnInsert: { _id: nanoid(), orgId, dimension, weight, previousWeight: weight, updatedAt: now, updatedBy: "seed" } },
      { upsert: true }
    );
  }
}

async function issueToken(ctx: AuthCtx): Promise<string> {
  return sign({ ...ctx, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }, JWT_SECRET, "HS256");
}

async function readToken(token: string | undefined): Promise<AuthCtx | null> {
  if (!token) return null;
  try {
    const payload = (await verify(token, JWT_SECRET, "HS256")) as unknown as AuthCtx;
    if (!payload?.userId || !payload?.orgId) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function authFromRequest(authHeader?: string, queryToken?: string): Promise<AuthCtx | null> {
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  return readToken(bearer || queryToken);
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = await authFromRequest(c.req.header("Authorization"), c.req.query("token"));
  if (!auth) return c.json({ error: "Not authenticated" }, 401);
  c.set("auth", auth);
  await next();
};

function publicUser(auth: AuthCtx, org: Record<string, unknown> | null, settings: OrgSettings) {
  return {
    user: { id: auth.userId, email: auth.email, name: auth.name, role: auth.role },
    org: { id: auth.orgId, name: String(org?.name || "Workspace"), isDemo: !!org?.isDemo, settings },
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/signup", async (c) => {
  let body: { name?: string; email?: string; password?: string; company?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password || "";
  if (!name || !email || !EMAIL_RE.test(email)) return c.json({ error: "Name and a valid email are required" }, 400);
  if (password.length < 8) return c.json({ error: "Password must be at least 8 characters" }, 400);
  if (email === DEMO_EMAIL) return c.json({ error: "That email is reserved" }, 400);

  if (await usersCol().findOne({ email })) return c.json({ error: "An account with this email already exists" }, 409);

  const now = new Date().toISOString();
  const orgId = nanoid();
  await orgsCol().insertOne({ _id: orgId, name: body.company?.trim() || "AllHome", isDemo: false, settings: { ...defaultOrgSettings(), senderName: name }, createdAt: now });
  await ensureOrgWeights(orgId);
  const userId = nanoid();
  await usersCol().insertOne({ _id: userId, orgId, email, name, role: "owner", passwordHash: await bcrypt.hash(password, 10), createdAt: now });

  const auth: AuthCtx = { userId, orgId, email, name, role: "owner" };
  return c.json({ token: await issueToken(auth), ...publicUser(auth, { name: body.company || "AllHome" }, defaultOrgSettings()) });
});

authRoutes.post("/login", async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const email = body.email?.trim().toLowerCase() || "";
  const user = await usersCol().findOne({ email });
  if (!user || !user.passwordHash || !(await bcrypt.compare(body.password || "", String(user.passwordHash)))) {
    return c.json({ error: "Incorrect email or password" }, 401);
  }
  const auth: AuthCtx = { userId: user._id, orgId: String(user.orgId), email, name: String(user.name), role: user.role as AuthCtx["role"] };
  const org = await orgsCol().findOne({ _id: auth.orgId });
  return c.json({ token: await issueToken(auth), ...publicUser(auth, org, await getOrgSettings(auth.orgId)) });
});

/** One-click demo: signs into the shared, pre-seeded AllHome workspace. */
authRoutes.post("/demo", async (c) => {
  const demo = await getDemoWorkspace();
  const auth: AuthCtx = { userId: demo.userId, orgId: demo.orgId, email: DEMO_EMAIL, name: "AllHome Demo", role: "demo" };
  const org = await orgsCol().findOne({ _id: demo.orgId });
  return c.json({ token: await issueToken(auth), ...publicUser(auth, org, await getOrgSettings(demo.orgId)) });
});

authRoutes.get("/me", requireAuth, async (c) => {
  const auth = c.get("auth");
  const org = await orgsCol().findOne({ _id: auth.orgId });
  if (!org) return c.json({ error: "Workspace not found" }, 401);
  return c.json(publicUser(auth, org, await getOrgSettings(auth.orgId)));
});

/** Update workspace profile / settings (used by onboarding and Settings). */
authRoutes.patch("/org", requireAuth, async (c) => {
  const auth = c.get("auth");
  let body: { name?: string; settings?: Partial<OrgSettings> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const current = await getOrgSettings(auth.orgId);
  const s = body.settings || {};
  const validBrands = BRANDS.map((b) => b.id);
  const next: OrgSettings = {
    ...current,
    ...(Array.isArray(s.brands) ? { brands: s.brands.filter((b) => validBrands.includes(b)) } : {}),
    ...(Array.isArray(s.segments) ? { segments: s.segments } : {}),
    ...(Array.isArray(s.cities) ? { cities: s.cities.map(String).slice(0, 30) } : {}),
    ...(typeof s.onboarded === "boolean" ? { onboarded: s.onboarded } : {}),
    ...(typeof s.senderName === "string" ? { senderName: s.senderName.slice(0, 80) } : {}),
    ...(typeof s.senderTitle === "string" ? { senderTitle: s.senderTitle.slice(0, 80) } : {}),
  };
  if (next.brands.length === 0) return c.json({ error: "Select at least one brand" }, 400);
  await orgsCol().updateOne(
    { _id: auth.orgId },
    { $set: { settings: next, ...(body.name?.trim() ? { name: body.name.trim().slice(0, 80) } : {}) } }
  );
  const org = await orgsCol().findOne({ _id: auth.orgId });
  return c.json(publicUser(auth, org, next));
});

authRoutes.get("/members", requireAuth, async (c) => {
  const auth = c.get("auth");
  const users = await usersCol().find({ orgId: auth.orgId }).project({ passwordHash: 0 }).toArray();
  return c.json({ members: users.map((u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt })) });
});

/** Invite = create a member account in the same workspace with a temporary password. */
authRoutes.post("/members", requireAuth, async (c) => {
  const auth = c.get("auth");
  if (auth.role === "demo") return c.json({ error: "Inviting members is disabled in the shared demo workspace" }, 403);
  let body: { name?: string; email?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const email = body.email?.trim().toLowerCase();
  if (!body.name?.trim() || !email || !EMAIL_RE.test(email)) return c.json({ error: "Name and a valid email are required" }, 400);
  if (await usersCol().findOne({ email })) return c.json({ error: "That email already has an account" }, 409);
  const tempPassword = randomBytes(6).toString("base64url");
  await usersCol().insertOne({
    _id: nanoid(),
    orgId: auth.orgId,
    email,
    name: body.name.trim(),
    role: "member",
    passwordHash: await bcrypt.hash(tempPassword, 10),
    createdAt: new Date().toISOString(),
  });
  return c.json({ email, tempPassword });
});

// ─── Demo workspace ───

let demoCache: { orgId: string; userId: string } | null = null;

export async function getDemoWorkspace(): Promise<{ orgId: string; userId: string; created: boolean }> {
  if (demoCache) return { ...demoCache, created: false };
  const existing = await usersCol().findOne({ email: DEMO_EMAIL });
  if (existing) {
    demoCache = { orgId: String(existing.orgId), userId: existing._id };
    return { ...demoCache, created: false };
  }
  const orgId = "demo-allhome";
  const userId = "demo-user";
  await orgsCol().updateOne(
    { _id: orgId },
    {
      $setOnInsert: {
        _id: orgId,
        name: "AllHome",
        isDemo: true,
        settings: { ...defaultOrgSettings(), onboarded: true, cities: PRIORITY_CITIES.slice(0, 8) },
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
  await ensureOrgWeights(orgId);
  await usersCol().updateOne(
    { email: DEMO_EMAIL },
    { $setOnInsert: { _id: userId, orgId, email: DEMO_EMAIL, name: "AllHome Demo", role: "demo", createdAt: new Date().toISOString() } },
    { upsert: true }
  );
  demoCache = { orgId, userId };
  return { ...demoCache, created: true };
}
