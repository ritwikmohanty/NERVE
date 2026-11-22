/**
 * Delivery-channel readiness — answers "can this deployment really send on this channel,
 * and if not, what exactly is missing?". Uses read-only provider calls, cached for 5 minutes.
 */
import { config } from "../config.js";
import { liveResearchEnabled, tavilyEnabled, apolloEnabled } from "../lib/runtime.js";
import { llmEnabled, LLM_MODEL } from "../lib/llm.js";

async function researchProviders(): Promise<ResearchProvider[]> {
  const apollo = apolloEnabled() ? await probeApollo() : { ok: false, note: config.apolloApiKey ? "Live research is off" : "No Apollo API key configured" };
  return [
    { id: "tavily", label: "Tavily", use: "Web & news search about each firm", state: tavilyEnabled() ? "live" : "off", detail: tavilyEnabled() ? "Live: real search results with sources" : config.tavilyApiKey ? "Key set; live research is off" : "No key: sample firms only" },
    { id: "groq", label: `Groq · ${LLM_MODEL}`, use: "Extracts firm profiles from sources, drafts messages", state: llmEnabled() ? "live" : "off", detail: llmEnabled() ? "Live" : "Off: template drafts" },
    { id: "apollo", label: "Apollo", use: "Company enrichment (team size, industry)", state: apollo.ok ? "live" : config.apolloApiKey ? "limited" : "off", detail: apollo.note },
  ];
}

export type ChannelId = "whatsapp" | "email" | "linkedin_dm" | "crm";
export type ChannelState = "ready" | "needs_setup" | "not_connected";

export interface ChannelStatus {
  channel: ChannelId;
  label: string;
  provider: string;
  providerUrl: string;
  keyConfigured: boolean;
  state: ChannelState;
  /** true only when the account is ready AND simulation mode is off */
  canSendLive: boolean;
  detail: string;
  /** Short phrase for inline badges, e.g. "verify a sending domain" */
  shortAction: string;
  nextSteps: string[];
  /** What this looks like for the AllHome team specifically */
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

let apolloProbe: { at: number; ok: boolean; note: string } | null = null;
async function probeApollo(): Promise<{ ok: boolean; note: string }> {
  if (!config.apolloApiKey) return { ok: false, note: "No Apollo API key configured" };
  if (apolloProbe && Date.now() - apolloProbe.at < 6 * 60 * 60_000) return apolloProbe;
  try {
    // Read-only company lookup of AllHome's own domain to learn what the key is allowed to do
    const res = await fetch("https://api.apollo.io/api/v1/organizations/enrich?domain=allhome.in", { headers: { "X-Api-Key": config.apolloApiKey, "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(8000) });
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    const ok = res.ok;
    const msg = String(body.error || body.message || "");
    apolloProbe = { at: Date.now(), ok, note: ok ? "Company enrichment available" : /free plan/i.test(msg) ? "Free plan: search and enrichment APIs not included" : /not authorized|scope/i.test(msg) ? "Key lacks company-enrichment scope (create a master key in Apollo)" : msg.slice(0, 100) || `HTTP ${res.status}` };
  } catch (e) {
    apolloProbe = { at: Date.now(), ok: false, note: String(e).slice(0, 100) };
  }
  return apolloProbe;
}

let cache: { at: number; report: IntegrationsReport } | null = null;
const TTL_MS = 5 * 60_000;

type Check = Pick<ChannelStatus, "state" | "detail" | "nextSteps"> & { shortAction?: string };

async function checkResend(): Promise<Check> {
  if (!config.resendApiKey) {
    return {
      state: "not_connected",
      detail: "No Resend API key configured.",
      nextSteps: ["Create an API key at resend.com → API Keys", "Set RESEND_API_KEY on the server"],
    };
  }
  const from = process.env.RESEND_FROM;
  if (!from) {
    return {
      state: "needs_setup",
      shortAction: "verify a sending domain",
      detail: "API key connected, but no verified sending domain yet. Resend's test sender (onboarding@resend.dev) only delivers to the account owner's own inbox.",
      nextSteps: ["resend.com → Domains → Add domain and add the DNS records it shows", "Once verified, set RESEND_FROM, e.g. specifiers@yourdomain.com"],
    };
  }
  // Full-access keys can confirm the domain is verified; send-only keys cannot (that's fine).
  try {
    const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${config.resendApiKey}` }, signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = (await res.json()) as { data?: Array<{ name: string; status: string }> };
      const domain = from.split("@")[1]?.toLowerCase();
      const match = data.data?.find((d) => d.name.toLowerCase() === domain);
      if (match && match.status !== "verified") {
        return { state: "needs_setup", detail: `Domain ${match.name} is "${match.status}". Finish DNS verification in Resend.`, nextSteps: ["resend.com → Domains → verify the DNS records"] };
      }
    }
  } catch {
    /* network issue — fall through to ready based on config */
  }
  return { state: "ready", detail: `Sending from ${from}.`, nextSteps: [] };
}

async function checkHeyReach(): Promise<Check> {
  if (!config.heyreachApiKey) {
    return {
      state: "not_connected",
      detail: "No HeyReach API key configured.",
      nextSteps: ["heyreach.io → Integrations → API → create a key", "Set HEYREACH_API_KEY on the server"],
    };
  }
  const headers = { "X-API-KEY": config.heyreachApiKey, "Content-Type": "application/json" };
  try {
    const [accounts, campaigns] = await Promise.all([
      fetch("https://api.heyreach.io/api/public/li_account/GetAll", { method: "POST", headers, body: JSON.stringify({ offset: 0, limit: 10 }), signal: AbortSignal.timeout(6000) }),
      fetch("https://api.heyreach.io/api/public/campaign/getall", { method: "POST", headers, body: JSON.stringify({ offset: 0, limit: 10 }), signal: AbortSignal.timeout(6000) }),
    ]);
    if (accounts.status === 401 || campaigns.status === 401) {
      return { state: "not_connected", detail: "HeyReach rejected the API key.", nextSteps: ["Create a new key in HeyReach → Integrations → API"] };
    }
    const a = accounts.ok ? ((await accounts.json()) as { totalCount?: number }) : {};
    const c = campaigns.ok ? ((await campaigns.json()) as { totalCount?: number }) : {};
    const steps: string[] = [];
    if (!a.totalCount) steps.push("HeyReach → LinkedIn Accounts → connect the sender's LinkedIn profile");
    if (!c.totalCount) steps.push("HeyReach → Campaigns → create a campaign (NERVE adds leads to it)");
    if (steps.length) {
      return {
        state: "needs_setup",
        shortAction: !a.totalCount ? "connect a LinkedIn account" : "create a campaign",
        detail: `API key connected, but ${!a.totalCount ? "no LinkedIn account is linked" : ""}${!a.totalCount && !c.totalCount ? " and " : ""}${!c.totalCount ? "no campaign exists yet" : ""}.`,
        nextSteps: steps,
      };
    }
    return { state: "ready", detail: `${a.totalCount} LinkedIn account(s), ${c.totalCount} campaign(s) available.`, nextSteps: [] };
  } catch {
    return { state: "needs_setup", detail: "API key set, but HeyReach couldn't be reached to confirm account status.", nextSteps: ["Retry later or check HeyReach status"] };
  }
}

function checkAiSensy(): Check {
  if (!config.aisensyApiKey) {
    return {
      state: "not_connected",
      detail: "No AiSensy API key configured.",
      nextSteps: ["Get WhatsApp Business API access through AiSensy", "AiSensy → Manage → API Key → set AISENSY_API_KEY"],
    };
  }
  if (!process.env.AISENSY_CAMPAIGN_NAME) {
    return {
      state: "needs_setup",
      shortAction: "add an approved template campaign",
      detail: "API key connected, but WhatsApp only allows business-initiated messages through a Meta-approved template sent via an AiSensy API campaign.",
      nextSteps: ["AiSensy → Manage → Templates → create a template with one body variable and get it approved", "AiSensy → Campaigns → create an API campaign using that template", "Set AISENSY_CAMPAIGN_NAME to the campaign's exact name"],
    };
  }
  return { state: "ready", detail: `Sending through API campaign "${process.env.AISENSY_CAMPAIGN_NAME}".`, nextSteps: [] };
}

export async function getIntegrationsReport(force = false): Promise<IntegrationsReport> {
  if (!force && cache && Date.now() - cache.at < TTL_MS && cache.report.simulationMode === config.simulationMode) return cache.report;

  const [email, linkedin] = await Promise.all([checkResend(), checkHeyReach()]);
  const whatsapp = checkAiSensy();
  const live = !config.simulationMode;

  const channels: ChannelStatus[] = [
    {
      channel: "whatsapp", label: "WhatsApp", provider: "AiSensy", providerUrl: "https://aisensy.com", keyConfigured: !!config.aisensyApiKey, shortAction: "add your API key", ...whatsapp,
      canSendLive: live && whatsapp.state === "ready",
      forAllHome: "AllHome would connect its own WhatsApp Business number (one per city sales team) and use Meta-approved specifier templates.",
    },
    {
      channel: "email", label: "Email", provider: "Resend", providerUrl: "https://resend.com", keyConfigured: !!config.resendApiKey, shortAction: "add your API key", ...email,
      canSendLive: live && email.state === "ready",
      forAllHome: "AllHome would verify its own sending domain (e.g. specifiers@allhome.in) so emails come from the brand, not a test sender.",
    },
    {
      channel: "linkedin_dm", label: "LinkedIn DM", provider: "HeyReach", providerUrl: "https://heyreach.io", keyConfigured: !!config.heyreachApiKey, shortAction: "add your API key", ...linkedin,
      canSendLive: live && linkedin.state === "ready",
      forAllHome: "AllHome would connect its specification team's own LinkedIn profiles in HeyReach, so DMs come from real people at AllHome.",
    },
    {
      channel: "crm", label: "CRM hand-off", provider: "Zoho CRM", providerUrl: "https://www.zoho.com/crm/", keyConfigured: false,
      state: "not_connected", canSendLive: false, shortAction: "connect Zoho CRM",
      detail: "Hand-off is simulated: NERVE builds the exact Zoho Leads API payload but doesn't send it.",
      nextSteps: ["Create a server-based client at api-console.zoho.in", "Add OAuth credentials to enable the live push"],
      forAllHome: "AllHome's existing Zoho CRM would receive warm leads directly, assigned to the right city sales team.",
    },
  ];

  const research = await researchProviders();
  const report = { simulationMode: config.simulationMode, liveResearch: liveResearchEnabled(), checkedAt: new Date().toISOString(), channels, research };
  cache = { at: Date.now(), report };
  return report;
}
