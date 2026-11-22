import type { Segment, ProjectType, ProjectStage } from "../allhome/catalog.js";
import type { BrandBundle, RadarEntry } from "../allhome/bundler.js";
import type { CentreMatch } from "../allhome/catalog.js";
import type { FirmResearch } from "../research/firm.js";
export type { Segment, ProjectType, ProjectStage };

/** AllHome project context attached to every lead */
export interface ProjectContext {
  segment?: Segment;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectName?: string;
  projectCity?: string;
  projectValue?: string; // e.g. "₹25 Cr"
  budgetTier?: "value" | "premium" | "luxury";
}

// ─── Execution Modes ───
export type ExecutionMode = "targeted" | "discovery";

// Mode 1: Targeted — user provides a specific company to evaluate
export interface TargetedInput extends ProjectContext {
  mode: "targeted";
  companyName: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactLinkedIn?: string;
  contactPhone?: string;
  location?: string;
  additionalContext?: string;
  /** Where the lead came from: manual form, quick capture, discovery, autopilot prospecting */
  origin?: "form" | "capture" | "discovery" | "seed" | "autopilot";
  /** The real-world event that surfaced this firm (Autopilot) — becomes Agent 2's top signal */
  trigger?: TriggerSignal;
}

/** A dated, sourced event about a firm, found by Autopilot prospecting. */
export interface TriggerSignal {
  title: string;
  category: "project_launch" | "award_publication" | "office_opening" | "funding" | "possession_milestone" | "other";
  url?: string;
  date?: string;
  detail?: string;
}

// Mode 2: Discovery — system recommends companies based on user's product
export interface DiscoveryInput {
  mode: "discovery";
  productName: string;
  productDescription: string;
  targetIndustries: string[];
  targetCompanySize?: string; // e.g. "50-200", "200-1000", "1000+"
  targetGeographies?: string[];
  idealCustomerProfile?: string;
  maxResults?: number;
  segment?: Segment;
  cities?: string[];
}

export type LeadInput = TargetedInput | DiscoveryInput;

// ─── Enriched Lead (output of Agent 1) ───
export interface EnrichedLead extends ProjectContext {
  id: string;
  orgId: string;
  // Company info
  companyName: string;
  companyDomain?: string;
  companySize?: string;
  industry?: string;
  fundingStage?: string;
  fundingAmount?: string;
  techStack?: string[];
  headquarters?: string;
  // Contact info
  contactName: string;
  contactTitle: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  seniority?: "C-Level" | "VP" | "Director" | "Manager" | "Individual Contributor";
  // Firm profile (architect / ID / developer / contractor)
  firmType?: string;
  portfolio?: string[];
  projectsPerYear?: number;
  specialties?: string[];
  /** "live" = researched with real APIs; "simulated" = fictional sample data */
  dataSource?: "live" | "simulated";
  research?: FirmResearch;
  /** No verified contact person found — outreach addresses the firm */
  contactUnknown?: boolean;
  /** Project type/stage were not provided — defaults used for planning only */
  projectAssumed?: boolean;
  // Meta
  source: "targeted" | "discovery";
  enrichedAt: string;
  rawInput: TargetedInput | DiscoveryInput;
}

// ─── Signal (output of Agent 2) ───
export type SignalCategory =
  | "project_launch"
  | "award_publication"
  | "possession_milestone"
  | "exhibition"
  | "office_opening"
  | "funding"
  | "product_launch"
  | "executive_hire"
  | "geographic_expansion"
  | "hiring_spike"
  | "linkedin_activity"
  | "partnership"
  | "award"
  | "other";

export type SignalStrength = "HIGH" | "MEDIUM" | "LOW";

export interface Signal {
  id: string;
  category: SignalCategory;
  title: string;
  description: string;
  source: string;
  sourceUrl?: string;
  dateDetected: string;
  recencyDays: number;
  strength: SignalStrength;
  recencyWeight: number; // 0-1, decays with age
}

export interface SignalBundle {
  leadId: string;
  signals: Signal[];
  topSignal: Signal | null;
  linkedinActivityScore: number; // 0-100
  overallSignalStrength: SignalStrength;
  generatedAt: string;
}

// ─── Intent Score (output of Agent 3) ───
export interface ScoreDimension {
  name: string;
  rawScore: number; // 0-100
  weight: number; // 0-1
  weightedScore: number; // rawScore * weight
  reasoning: string;
}

export interface IntentScore {
  leadId: string;
  compositeScore: number; // 0-100
  tier: "HOT" | "WARM" | "COOL" | "COLD";
  dimensions: ScoreDimension[];
  topContributors: string[]; // top 3 dimension names
  generatedAt: string;
}

// ─── Persona (output of Agent 4) ───
export type PersonaArchetype =
  | "design_architect"
  | "aesthetic_designer"
  | "developer_buyer"
  | "execution_contractor"
  | "premium_homeowner";

export interface PersonaProfile {
  leadId: string;
  archetype: PersonaArchetype;
  archetypeLabel: string; // "Strategic Executive", etc.
  confidence: number; // 0-1
  traits: string[];
  communicationStyle: string;
  preferredTone: string;
  avoidInMessaging: string[];
  talkingPoints: string[];
  reasoning: string;
  generatedAt: string;
}

// ─── Strategy (output of Agent 5) ───
export type OutreachChannel = "linkedin_dm" | "email" | "whatsapp";
export type ToneFramework =
  | "insight_led"
  | "peer_problem"
  | "challenger"
  | "relationship_first"
  | "growth_urgency";

export interface TouchPoint {
  touchNumber: 1 | 2 | 3;
  channel: OutreachChannel;
  scheduledAt: string; // ISO timestamp
  dayOffset: number; // days from Touch 1
  toneFramework: ToneFramework;
  /** AllHome brands this touch pitches */
  focusBrands?: string[];
  purpose?: string;
}

export interface OutreachStrategy {
  leadId: string;
  primaryChannel: OutreachChannel;
  secondaryChannel?: OutreachChannel;
  sendTimestamp: string; // ISO — when Touch 1 fires
  timezone: string;
  toneFramework: ToneFramework;
  cadence: TouchPoint[];
  decisions: StrategyDecision[];
  bundle?: BrandBundle;
  radar?: RadarEntry[];
  experienceCentre?: CentreMatch | null;
  generatedAt: string;
}

export interface StrategyDecision {
  decision: string;
  reasoning: string;
  factors: string[];
}

// ─── Content (output of Agent 6) ───
export interface GeneratedContent {
  leadId: string;
  touches: TouchContent[];
  linkedinPost?: string;
  linkedinHeadlineSuggestion?: string;
  /** One-page specification sheet for the recommended bundle (markdown) */
  specSheet?: string;
  generatedAt: string;
}

export interface TouchContent {
  touchNumber: 1 | 2 | 3;
  channel: OutreachChannel;
  subject?: string; // email only
  body: string;
  preview: string; // first 100 chars
  /** Facts the draft is grounded in (shown in the UI) */
  groundedIn?: string[];
}

// ─── Rationale (output of Agent 7) ───
export interface DecisionRationale {
  leadId: string;
  explanations: RationaleItem[];
  summary: string;
  graphData: AgentGraphData;
  generatedAt: string;
}

export interface RationaleItem {
  agentName: string;
  decision: string;
  explanation: string;
  confidence: number;
}

// ─── Agent Graph (for frontend React Flow) ───
export type AgentStatus = "idle" | "running" | "complete" | "error";

export interface AgentNode {
  agentId: string;
  agentName: string;
  agentNumber: number;
  status: AgentStatus;
  startedAt?: string;
  completedAt?: string;
  outputSummary?: string;
  error?: string;
}

export interface AgentEdge {
  from: string;
  to: string;
  animated: boolean;
  dataFlowing: boolean;
}

export interface AgentGraphData {
  nodes: AgentNode[];
  edges: AgentEdge[];
}

// ─── Delivery (output of Agent 8) ───
export interface DeliveryResult {
  leadId: string;
  touchNumber: number;
  channel: OutreachChannel;
  status: "sent" | "queued" | "failed" | "simulated";
  messageId?: string;
  sentAt: string;
  simulationMode: boolean;
  rawApiResponse?: unknown;
}

// ─── Response (input to Agent 9) ───
export type ResponseSentiment = "positive" | "neutral" | "negative" | "no_reply";

export interface ResponseEvent {
  leadId: string;
  channel: OutreachChannel;
  messageBody?: string;
  sentiment: ResponseSentiment;
  classificationReasoning: string;
  receivedAt: string;
  action: ResponseAction;
  visit?: { centreId: string; centreCity: string; brandName: string; scheduledAt: string };
}

export type ResponseAction = "escalate_human" | "book_visit" | "continue_cadence" | "cancel_sequence" | "nurture";

// ─── Learning Update (output of Agent 10) ───
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
  bundleOutcome?: { segment?: string; brands: string[]; sentiment: string };
  updatedAt: string;
}

// ─── SSE Events ───
export type SSEEventType =
  | "connected"
  | "agent_status"
  | "score_update"
  | "signal_update"
  | "strategy_update"
  | "content_update"
  | "rationale_update"
  | "delivery_update"
  | "response_update"
  | "learning_update"
  | "branch_decision"
  | "error"
  | "pipeline_complete";

export interface SSEEvent {
  type: SSEEventType;
  leadId: string;
  orgId?: string;
  data: unknown;
  timestamp: string;
}

// ─── Scoring Weights (persisted in DB, updated by Agent 10) ───
// AllHome-tuned intent dimensions
export interface ScoringWeights {
  specifierInfluence: number;
  segmentFit: number;
  projectValue: number;
  stageFit: number;
  centreProximity: number;
  signalStrength: number;
  portfolioFit: number;
  contactReachability: number;
  engagementHistory: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  specifierInfluence: 0.16,
  segmentFit: 0.10,
  projectValue: 0.13,
  stageFit: 0.16,
  centreProximity: 0.09,
  signalStrength: 0.13,
  portfolioFit: 0.10,
  contactReachability: 0.06,
  engagementHistory: 0.07,
};

/** Display names for the dimensions (Agent 3 output ↔ Agent 10 weight keys) */
export const DIMENSION_LABELS: Record<keyof ScoringWeights, string> = {
  specifierInfluence: "Specifier Influence",
  segmentFit: "Segment Fit",
  projectValue: "Project Value",
  stageFit: "Stage Fit",
  centreProximity: "Centre Proximity",
  signalStrength: "Signal Strength",
  portfolioFit: "Portfolio Fit",
  contactReachability: "Reachability",
  engagementHistory: "Engagement History",
};
