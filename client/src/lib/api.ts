import type {
  Lead, LeadDetail, OutreachChannel, CalendarEvent, SSEEvent, SessionInfo, OrgSettings, Catalog,
  BundlePreview, CapturedLead, AnalyticsData, CentreWithStats, Visit, CrmSync, ProjectContextInput, IntegrationsReport,
} from "./types";

// Override with VITE_API_URL (e.g. https://nerve-api.onrender.com/api) when not on localhost:3001
export const API_BASE: string = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/$/, "");

const TOKEN_KEY = "nerve.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — session lasts for this tab only */
  }
  memoryToken = token;
}
let memoryToken: string | null = null;
const currentToken = () => getToken() || memoryToken;

/** Called when the API says the session is invalid (expired token, DB reset). */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

/** Error thrown for non-2xx responses; keeps the status and the server's JSON body. */
export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(message: string, status: number, body: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = currentToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
  } catch {
    throw new ApiError("Can't reach the NERVE server — it may be waking up, try again in a few seconds.", 0, {});
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/signup")) onUnauthorized?.();
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status, body);
  }
  return res.json();
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

type AuthResponse = SessionInfo & { token: string };

export const api = {
  health: () => request<Record<string, unknown>>("/health"),

  // ─── Auth & workspace ───
  login: (email: string, password: string) => post<AuthResponse>("/auth/login", { email, password }),
  signup: (body: { name: string; email: string; password: string; company?: string }) => post<AuthResponse>("/auth/signup", body),
  demo: () => post<AuthResponse>("/auth/demo"),
  me: () => request<SessionInfo>("/auth/me"),
  updateOrg: (body: { name?: string; settings?: Partial<OrgSettings> }) => request<SessionInfo>("/auth/org", { method: "PATCH", body: JSON.stringify(body) }),
  members: () => request<{ members: Array<{ id: string; name: string; email: string; role: string; createdAt: string }> }>("/auth/members"),
  inviteMember: (name: string, email: string) => post<{ email: string; tempPassword: string }>("/auth/members", { name, email }),

  // ─── Catalog & bundler ───
  catalog: () => request<Catalog>("/catalog"),
  bundlePreview: (body: { segment?: string; projectType?: string; projectStage?: string; city?: string; budgetTier?: string }) => post<BundlePreview>("/bundle/preview", body),

  // ─── Leads ───
  executeTargeted: (body: ProjectContextInput & {
    companyName: string; contactName?: string; contactTitle?: string; contactEmail?: string; contactPhone?: string;
    contactLinkedIn?: string; additionalContext?: string; origin?: "form" | "capture";
  }) => post<{ pipelineId: string; leadId: string; status: string }>("/leads/execute", body),
  discover: (body: { segment?: string; cities?: string[]; maxResults?: number }) =>
    post<{ pipelineId: string; leadIds?: string[]; leadsFound?: number; status: string }>("/leads/discover", body),
  capture: (text: string) => post<{ lead: CapturedLead }>("/leads/capture", { text }),
  getLeads: () => request<{ leads: Lead[]; count: number }>("/leads"),
  getLead: (id: string) => request<LeadDetail>(`/leads/${id}`),
  sendReply: (leadId: string, body: { channel: OutreachChannel; messageBody?: string }) =>
    post<{ status: string; sentiment: string; action: string; reasoning: string; visit: Visit | null }>(`/leads/${leadId}/reply`, body),
  crmPush: (leadId: string) => post<CrmSync>(`/leads/${leadId}/crm-push`),
  exportCsv: async () => {
    const token = currentToken();
    const res = await fetch(`${API_BASE}/leads/export.csv`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new ApiError("Export failed", res.status, {});
    return res.blob();
  },

  // ─── Centres, visits, analytics ───
  centres: () => request<{ centres: CentreWithStats[] }>("/centres"),
  visits: () => request<{ visits: Visit[] }>("/visits"),
  updateVisit: (id: string, status: Visit["status"]) => request<{ ok: boolean }>(`/visits/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  analytics: () => request<AnalyticsData>("/analytics"),

  // ─── Delivery-channel readiness ───
  integrations: (refresh = false) => request<IntegrationsReport>(`/integrations${refresh ? "?refresh=1" : ""}`),

  // ─── Config ───
  setSimulation: (enabled: boolean) => post<{ simulationMode: boolean }>("/config/simulation", { enabled }),

  // ─── Calendar ───
  getCalendarEvents: () => request<{ events: CalendarEvent[]; count: number }>("/calendar/events"),
  calendarChat: (message: string) => post<{ reply: string }>("/calendar/chat", { message }),
};

// ─── SSE ───
export function createSSE(leadId?: string, onEvent?: (event: SSEEvent) => void, onError?: (err: Event) => void): EventSource {
  const params = new URLSearchParams();
  const token = currentToken();
  if (token) params.set("token", token);
  if (leadId) params.set("leadId", leadId);
  const es = new EventSource(`${API_BASE}/events?${params.toString()}`);
  es.onmessage = (e) => {
    try {
      onEvent?.(JSON.parse(e.data));
    } catch {
      /* ignore malformed frames */
    }
  };
  es.onerror = (e) => onError?.(e);
  return es;
}
