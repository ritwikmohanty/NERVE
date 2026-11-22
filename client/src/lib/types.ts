// ─── Frontend types mirroring backend ───

export type AgentStatus = "idle" | "running" | "complete" | "error";
export type OutreachChannel = "linkedin_dm" | "email" | "whatsapp";
export type ResponseSentiment = "positive" | "neutral" | "negative" | "no_reply";
export type ToneFramework = "insight_led" | "peer_problem" | "challenger" | "relationship_first" | "growth_urgency";
export type IntentTier = "HOT" | "WARM" | "COOL" | "COLD";
export type SignalStrength = "HIGH" | "MEDIUM" | "LOW";
export type PersonaArchetype = "design_architect" | "aesthetic_designer" | "developer_buyer" | "execution_contractor" | "premium_homeowner";
export type Segment = "architect" | "id_firm" | "developer" | "contractor" | "homeowner";
export type ProjectType = "villa" | "premium_apartment" | "apartment_tower" | "hospitality" | "office" | "retail";
export type ProjectStage = "design" | "structure" | "mep" | "fitout" | "finishing" | "handover";

export const STAGE_LABEL: Record<string, string> = {
  design: "Concept & Design", structure: "Structure", mep: "MEP", fitout: "Fit-out", finishing: "Finishing", handover: "Handover",
};
export type BudgetTier = "value" | "premium" | "luxury";
export type ResponseAction = "escalate_human" | "book_visit" | "continue_cadence" | "cancel_sequence" | "nurture";

export interface ProjectContextInput {
  segment?: Segment;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectName?: string;
  projectCity?: string;
  projectValue?: string;
  budgetTier?: BudgetTier;
}

export interface Lead {
  id: string;
  companyName: string;
  companyDomain?: string;
  companySize?: string;
  industry?: string;
  fundingStage?: string;
  fundingAmount?: string;
  techStack?: string;
  headquarters?: string;
  contactName: string;
  contactTitle: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  seniority?: string;
  source: "targeted" | "discovery";
  status: string;
  rawInput?: string;
  enrichedAt?: string;
  createdAt?: string;
  // AllHome project context
  segment?: Segment;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectName?: string;
  projectCity?: string;
  projectValue?: string;
  budgetTier?: BudgetTier;
  firmType?: string;
  portfolio?: string[];
  projectsPerYear?: number;
  specialties?: string[];
  origin?: string;
  error?: string;
  dataSource?: "live" | "simulated";
  research?: FirmResearch;
  contactUnknown?: boolean;
  projectAssumed?: boolean;
}

export interface FirmResearch {
  status: "found" | "partial" | "not_found" | "unavailable";
  query: string;
  website?: string;
  domain?: string;
  summary?: string;
  city?: string;
  specialties: string[];
  notableProjects: string[];
  principals: Array<{ name: string; title?: string }>;
  teamSize?: string;
  founded?: string;
  signals: Array<{ title: string; category: string; url?: string; date?: string; detail?: string }>;
  sources: Array<{ title: string; url: string }>;
  apollo: { status: "ok" | "unavailable" | "skipped"; note?: string; employees?: number; industry?: string };
  providers: string[];
  researchedAt: string;
}

export interface Signal {
  id: string;
  category: string;
  title: string;
  description: string;
  source: string;
  sourceUrl?: string;
  dateDetected: string;
  recencyDays: number;
  strength: SignalStrength;
  recencyWeight: number;
}

export interface SignalBundle {
  leadId: string;
  signals: Signal[];
  topSignal: Signal | null;
  linkedinActivityScore: number;
  overallSignalStrength: SignalStrength;
  generatedAt: string;
}

export interface ScoreDimension {
  name: string;
  rawScore: number;
  weight: number;
  weightedScore: number;
  reasoning: string;
}

export interface IntentScore {
  leadId: string;
  compositeScore: number;
  tier: IntentTier;
  dimensions: ScoreDimension[];
  topContributors: string[];
  generatedAt: string;
}

export interface PersonaProfile {
  leadId: string;
  archetype: PersonaArchetype;
  archetypeLabel: string;
  confidence: number;
  traits: string[];
  communicationStyle: string;
  preferredTone: string;
  avoidInMessaging: string[];
  reasoning: string;
  generatedAt: string;
}

export interface TouchPoint {
  touchNumber: 1 | 2 | 3;
  channel: OutreachChannel;
  scheduledAt: string;
  dayOffset: number;
  toneFramework: ToneFramework;
}

export interface StrategyDecision {
  decision: string;
  reasoning: string;
  factors: string[];
}

export interface OutreachStrategy {
  leadId: string;
  primaryChannel: OutreachChannel;
  secondaryChannel?: OutreachChannel;
  sendTimestamp: string;
  timezone: string;
  toneFramework: ToneFramework;
  cadence: TouchPoint[];
  decisions: StrategyDecision[];
  generatedAt: string;
}

export interface TouchContent {
  touchNumber: 1 | 2 | 3;
  channel: OutreachChannel;
  subject?: string;
  body: string;
  preview: string;
  groundedIn?: string[];
}

export interface GeneratedContent {
  leadId: string;
  touches: TouchContent[];
  linkedinPost?: string;
  linkedinHeadlineSuggestion?: string;
  generatedAt: string;
}

export interface RationaleItem {
  agentName: string;
  decision: string;
  explanation: string;
  confidence: number;
}

export interface DecisionRationale {
  leadId: string;
  explanations: RationaleItem[];
  summary: string;
  graphData: {
    nodes: AgentNodeData[];
    edges: AgentEdgeData[];
  };
  generatedAt: string;
}

export interface AgentNodeData {
  agentId: string;
  agentName: string;
  agentNumber: number;
  status: AgentStatus;
  startedAt?: string;
  completedAt?: string;
  outputSummary?: string;
  error?: string;
}

export interface AgentEdgeData {
  from: string;
  to: string;
  animated: boolean;
  dataFlowing: boolean;
}

export interface DeliveryResult {
  leadId: string;
  touchNumber: number;
  channel: OutreachChannel;
  status: "sent" | "queued" | "failed" | "simulated";
  messageId?: string;
  sentAt: string;
  simulationMode: boolean;
}

export interface ResponseEvent {
  leadId: string;
  channel: OutreachChannel;
  messageBody?: string;
  sentiment: ResponseSentiment;
  classificationReasoning: string;
  receivedAt: string;
  action: ResponseAction;
}

export interface WeightUpdate {
  dimension: string;
  previousWeight: number;
  newWeight: number;
  delta: number;
  reason: string;
}

export interface LearningResult {
  leadId: string;
  weightUpdates: WeightUpdate[];
  heuristicUpdates: string[];
  toneRuleUpdates: string[];
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  leadId: string;
  agentNumber: number;
  agentName: string;
  status: string;
  input?: string | null;
  output?: string | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
}

export interface LeadDetail {
  lead: Lead;
  agentRuns: AgentRun[];
  agentOutputs: Record<string, unknown>;
  deliveries: DeliveryResult[];
  responses: ResponseEvent[];
  visits: Visit[];
  crmSync: CrmSync | null;
}

export interface SSEEvent {
  type: string;
  leadId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface HealthCheck {
  status: string;
  simulationMode: boolean;
  hasGroqKey: boolean;
  hasApolloKey: boolean;
  hasTavilyKey: boolean;
  hasResendKey: boolean;
  hasHeyReachKey: boolean;
  hasAiSensyKey: boolean;
  connectedClients: number;
  timestamp: string;
}

// ─── Calendar ───
export interface CalendarEvent {
  id: string;
  kind: "touch" | "visit";
  focusBrands?: string[];
  purpose?: string;
  centreCity?: string;
  brandName?: string;
  address?: string;
  status?: string;
  leadId: string;
  companyName: string;
  contactName: string;
  contactTitle: string;
  channel: OutreachChannel | "visit";
  touchNumber: number;
  scheduledAt: string;
  dayOffset: number;
  toneFramework: ToneFramework | "";
  timezone: string;
  primaryChannel: OutreachChannel | "visit";
  sentiment?: string;
  action?: string;
  tier?: string;
  compositeScore?: number;
}

// ─── Auth / workspace ───
export interface OrgSettings {
  brands: string[];
  segments: Segment[];
  cities: string[];
  onboarded: boolean;
  senderName: string;
  senderTitle: string;
}

export interface SessionInfo {
  user: { id: string; email: string; name: string; role: "owner" | "member" | "demo" };
  org: { id: string; name: string; isDemo: boolean; settings: OrgSettings };
}

// ─── AllHome catalog ───
export interface Brand {
  id: string;
  name: string;
  formalName?: string;
  services: string[];
  facts: string[];
  partners: string[];
  founders: string;
  pitch: string;
  externalSite?: string;
  category: string;
  tagline: string;
  description: string;
  productLines: string[];
  specifyAt: ProjectStage[];
  leadTimeWeeks: number;
  projectTypes: ProjectType[];
  segments: Segment[];
  color: string;
  website: string;
  enabled?: boolean;
}

export interface ExperienceCentre {
  id: string;
  brandId: string;
  brandName?: string;
  city: string;
  address: string;
  mapUrl: string;
  kind: "experience_centre" | "dealer";
}

export interface CentreWithStats extends ExperienceCentre {
  invited: number;
  visits: number;
}

export interface Catalog {
  brands: Brand[];
  categories: Record<string, string>;
  centres: ExperienceCentre[];
  stages: Array<{ id: ProjectStage; label: string; startWeek: number; description: string }>;
  segments: Record<Segment, { label: string; market: "B2B" | "B2C"; description: string }>;
  projectTypes: Record<ProjectType, string>;
  cities: string[];
  allhome: {
    name: string; positioning: string; promise: string; model: string; categories: string[]; facts: string[];
    founders: string; funding: string; insight: string; painPoints: string[]; hq: string; email: string; website: string;
  };
  sources: Record<string, string>;
}

export interface CentreMatch {
  centre: ExperienceCentre;
  brandName: string;
  distanceKm: number;
  sameCity: boolean;
}

export interface BundleItem {
  brandId: string;
  brandName: string;
  category: string;
  role: "primary" | "next_stage" | "add_on";
  score: number;
  productLines: string[];
  reason: string;
  centre: CentreMatch | null;
}

export interface BrandBundle {
  headline: string;
  items: BundleItem[];
  primaryBrands: string[];
  nextBrand?: { brandId: string; brandName: string; weeksUntil: number };
  vendorsReplaced: number;
}

export interface RadarEntry {
  brandId: string;
  brandName: string;
  category: string;
  status: "now" | "upcoming" | "passed";
  weeksUntil: number;
  windowLabel: string;
  leadTimeWeeks: number;
  orderBy?: string;
}

export interface BundlePreview {
  bundle: BrandBundle;
  radar: RadarEntry[];
}

export interface CapturedLead extends ProjectContextInput {
  companyName?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  interestedBrands: string[];
  notes?: string;
  confidence: number;
  method: "llm" | "heuristic";
}

export interface Visit {
  id?: string;
  leadId?: string;
  companyName?: string;
  contactName?: string;
  centreId: string;
  centreCity: string;
  brandName: string;
  scheduledAt: string;
  address?: string;
  mapUrl?: string;
  status?: "scheduled" | "completed" | "cancelled" | "no_show";
}

export interface CrmSync {
  id: string;
  provider: string;
  mode: string;
  payload: { data: Array<Record<string, unknown>> };
  response: Record<string, unknown>;
  pushedAt: string;
}

export interface AnalyticsData {
  totals: { leads: number; replied: number; positive: number; visits: number; handedOff: number; replyRate: number };
  funnel: Array<{ stage: string; count: number }>;
  bySegment: Array<{ key: string; label: string; count: number; positive: number }>;
  byCity: Array<{ key: string; label: string; count: number; positive: number }>;
  byStage: Array<{ key: string; label: string; count: number; positive: number }>;
  byBrand: Array<{ brandId: string; brandName: string; pitched: number; positive: number }>;
  bundles: Array<{ segment: string; segmentLabel: string; brands: string[]; brandNames: string[]; total: number; positive: number; rate: number }>;
  weights: Array<{ dimension: string; weight: number; previousWeight: number; updatedAt: string }>;
  weightSeries: Array<{ at: string; weights: Record<string, number> }>;
}

// ─── Delivery-channel readiness ───
export type ChannelId = "whatsapp" | "email" | "linkedin_dm" | "crm";
export interface ChannelStatus {
  channel: ChannelId;
  label: string;
  provider: string;
  providerUrl: string;
  keyConfigured: boolean;
  state: "ready" | "needs_setup" | "not_connected";
  canSendLive: boolean;
  detail: string;
  shortAction: string;
  nextSteps: string[];
  forAllHome: string;
}
export interface ResearchProvider {
  id: "tavily" | "groq" | "apollo";
  label: string;
  use: string;
  state: "live" | "limited" | "off";
  detail: string;
}
export interface IntegrationsReport {
  simulationMode: boolean;
  liveResearch: boolean;
  checkedAt: string;
  channels: ChannelStatus[];
  research: ResearchProvider[];
}

// ─── Autopilot prospecting ───
export type TriggerType = "project_launch" | "hospitality" | "commercial_fitout" | "award_feature" | "new_studio" | "developer_expansion";
export type AutopilotSchedule = "off" | "daily" | "weekly";

export interface TriggerDef {
  id: TriggerType;
  label: string;
  description: string;
  allhomeAngle: string;
  segments: Segment[];
  stageHint: ProjectStage;
  weight: number;
}

export interface AutopilotConfig {
  triggers: TriggerType[];
  segments: Segment[];
  cities: string[];
  firmsPerRun: number;
  pipelinesPerRun: number;
  lookbackDays: number;
  schedule: AutopilotSchedule;
  nextRunAt?: string;
  lastRunAt?: string;
}

export interface AutopilotLimits {
  maxFirmsPerRun: number;
  maxPipelinesPerRun: number;
  maxQueriesPerRun: number;
  maxRunsPerDay: number;
  maxPipelinesPerDay: number;
  scheduleAllowed: boolean;
}

export type ApiCalls = { tavily: number; groq: number; apollo: number };

export interface AutopilotEstimate {
  live: boolean;
  queries: number;
  scan: { tavily: number; groq: number };
  pipelines: number;
  pipelineCost: ApiCalls;
  total: ApiCalls;
  everyFirm: ApiCalls & { firms: number };
  perPipeline: ApiCalls;
  fitsBudget: boolean;
  shortfall?: string;
}

export interface ApiUsage {
  day: string;
  used: ApiCalls;
  budget: ApiCalls;
  remaining: ApiCalls;
  /** Hard daily safety limit for all features together */
  hardLimit: ApiCalls;
  failures: ApiCalls;
  blocked: ApiCalls;
  recentFailures: Array<{ at: string; provider: keyof ApiCalls; message: string; fallback: string }>;
}

export type ProspectRunStatus = "scanning" | "running_pipelines" | "done" | "failed" | "skipped_budget" | "interrupted";

export interface ProspectRun {
  id: string;
  by: "manual" | "schedule" | "seed";
  mode: "live" | "sample";
  status: ProspectRunStatus;
  config: Omit<AutopilotConfig, "schedule">;
  queriesPlanned: number;
  queriesDone: number;
  found: number;
  pipelinesPlanned: number;
  pipelinesDone: number;
  notes: string[];
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

export type ProspectStatus = "queued" | "running" | "pipeline_done" | "shortlisted" | "already_in_pipeline" | "dismissed" | "error";

export interface Prospect {
  id: string;
  runId: string;
  rank: number;
  companyName: string;
  segment: Segment;
  city: string;
  trigger: TriggerType;
  triggerLabel: string;
  title: string;
  detail: string;
  allhomeAngle: string;
  projectName?: string;
  projectType?: ProjectType;
  stage?: ProjectStage;
  eventDate?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  dataSource: "live" | "sample";
  triageScore: number;
  triageReasons: string[];
  status: ProspectStatus;
  leadId?: string;
  score?: number;
  tier?: string;
  error?: string;
  createdAt: string;
}

export interface AutopilotOverview {
  config: AutopilotConfig;
  limits: AutopilotLimits;
  live: boolean;
  sendingLocked: boolean;
  triggers: TriggerDef[];
  usage: ApiUsage;
  unitCosts: Record<"live" | "sample", { perQuery: ApiCalls; perPipeline: ApiCalls }>;
  estimate: AutopilotEstimate;
  sampleEstimate: AutopilotEstimate;
  pipelinesToday: number;
  queueDepth: number;
  activeRunId: string | null;
  runs: ProspectRun[];
}
