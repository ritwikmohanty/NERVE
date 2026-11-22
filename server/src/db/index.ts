import { MongoClient, Db, type Collection, type Document } from "mongodb";
import { config } from "../config.js";

const MONGO_URI = config.mongoUri;
const DB_NAME = config.mongoDbName;

const client = new MongoClient(MONGO_URI);
let _db: Db;

export async function connectDB(): Promise<Db> {
  if (_db) return _db;
  await client.connect();
  _db = client.db(DB_NAME);
  console.log(`📦 Connected to MongoDB, ${DB_NAME}`);
  return _db;
}

export function getDB(): Db {
  if (!_db) throw new Error("Database not connected. Call connectDB() first.");
  return _db;
}

// All documents use string _id (nanoid), not ObjectId
export interface StringIdDoc extends Document { _id: string; }

// ─── Collection accessors ───
export function leadsCol()            { return getDB().collection<StringIdDoc>("leads"); }
export function agentRunsCol()        { return getDB().collection<StringIdDoc>("agent_runs"); }
export function signalsCol()          { return getDB().collection<StringIdDoc>("signals"); }
export function scoringWeightsCol()   { return getDB().collection<StringIdDoc>("scoring_weights"); }
export function intentScoresCol()     { return getDB().collection<StringIdDoc>("intent_scores"); }
export function personaProfilesCol()  { return getDB().collection<StringIdDoc>("persona_profiles"); }
export function strategiesCol()       { return getDB().collection<StringIdDoc>("strategies"); }
export function generatedContentCol() { return getDB().collection<StringIdDoc>("generated_content"); }
export function deliveryLogsCol()     { return getDB().collection<StringIdDoc>("delivery_logs"); }
export function responseEventsCol()   { return getDB().collection<StringIdDoc>("response_events"); }
export function learningHistoryCol()  { return getDB().collection<StringIdDoc>("learning_history"); }
export function campaignsCol()        { return getDB().collection<StringIdDoc>("campaigns"); }
export function usersCol()            { return getDB().collection<StringIdDoc>("users"); }
export function orgsCol()             { return getDB().collection<StringIdDoc>("orgs"); }
export function visitsCol()           { return getDB().collection<StringIdDoc>("visits"); }
export function crmSyncCol()          { return getDB().collection<StringIdDoc>("crm_sync"); }
// Autopilot prospecting
export function autopilotCol()        { return getDB().collection<StringIdDoc>("autopilot"); }
export function prospectRunsCol()     { return getDB().collection<StringIdDoc>("prospect_runs"); }
export function prospectsCol()        { return getDB().collection<StringIdDoc>("prospects"); }

// ─── Create indexes for common queries ───
export async function ensureIndexes(): Promise<void> {
  const db = getDB();
  await db.collection("leads").createIndex({ orgId: 1, createdAt: -1 });
  await db.collection("leads").createIndex({ orgId: 1, companyName: 1 });
  await db.collection("leads").createIndex({ status: 1 });
  await db.collection("agent_runs").createIndex({ leadId: 1, agentNumber: 1 });
  await db.collection("signals").createIndex({ leadId: 1 });
  // Weights are per workspace now — drop the old global unique index if present
  await db.collection("scoring_weights").dropIndex("dimension_1").catch(() => {});
  await db.collection("scoring_weights").createIndex({ orgId: 1, dimension: 1 }, { unique: true });
  await db.collection("intent_scores").createIndex({ leadId: 1 });
  await db.collection("persona_profiles").createIndex({ leadId: 1 });
  await db.collection("strategies").createIndex({ leadId: 1 });
  await db.collection("generated_content").createIndex({ leadId: 1 });
  await db.collection("delivery_logs").createIndex({ leadId: 1 });
  await db.collection("response_events").createIndex({ leadId: 1 });
  await db.collection("learning_history").createIndex({ leadId: 1 });
  await db.collection("campaigns").createIndex({ leadId: 1 });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("visits").createIndex({ orgId: 1, scheduledAt: 1 });
  await db.collection("crm_sync").createIndex({ orgId: 1, leadId: 1 });
  await db.collection("prospect_runs").createIndex({ orgId: 1, startedAt: -1 });
  await db.collection("prospect_runs").createIndex({ status: 1 });
  await db.collection("prospects").createIndex({ orgId: 1, createdAt: -1 });
  await db.collection("prospects").createIndex({ orgId: 1, runId: 1 });
  await db.collection("prospects").createIndex({ orgId: 1, nameKey: 1 });
  await db.collection("autopilot").createIndex({ schedule: 1, nextRunAt: 1 });
  console.log("🗂️  MongoDB indexes ensured");
}
