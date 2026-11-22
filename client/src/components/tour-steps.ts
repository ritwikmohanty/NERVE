import type { TourStep } from "./tour";

/** Which tour belongs to the current route. */
export function tourIdForPath(pathname: string): string {
  if (pathname.startsWith("/dashboard/pipeline/")) return "pipeline";
  if (pathname.startsWith("/dashboard/new")) return "new";
  if (pathname.startsWith("/dashboard/centres")) return "centres";
  if (pathname.startsWith("/dashboard/calendar")) return "calendar";
  if (pathname.startsWith("/dashboard/analytics")) return "analytics";
  if (pathname.startsWith("/dashboard/activity")) return "activity";
  if (pathname.startsWith("/dashboard/settings")) return "settings";
  if (pathname.startsWith("/dashboard/brief")) return "brief";
  if (pathname.startsWith("/dashboard/autopilot")) return "autopilot";
  return "dashboard";
}

export const PAGE_TOURS: Record<string, TourStep[]> = {
  dashboard: [
    { target: '[data-tour="stats"]', title: "Command Center", body: "Every specifier mission across AllHome's 7 brands — active pipelines, visits booked and warm leads handed to sales, live." },
    { target: '[data-tour="sending-notice"]', title: "Nothing is sent in the demo", body: "NERVE writes and schedules every message, but real sending needs the company's own WhatsApp Business number, email domain and LinkedIn profiles connected. For AllHome that's your accounts, not NERVE's." },
    { target: '[data-tour="lead-list"]', title: "Live missions", body: "Each row is an architect, designer, developer or homeowner NERVE researched, scored and contacted. Open one to watch all 10 agents' reasoning." },
    { target: '[data-tour="nav-new"]', title: "Launch a mission", body: "Target a B2B specifier or a B2C homeowner, discover firms by city, or paste a WhatsApp chat into Quick Capture." },
    { target: '[data-tour="nav-autopilot"]', title: "Or let NERVE find the firms", body: "Autopilot watches the news for project launches, hotel signings, fit-outs, awards and developer land deals, then picks the firms about to specify materials — no firm names needed." },
    { target: '[data-tour="nav-centres"]', title: "Experience centres", body: "Every message ends with an invite to the nearest AllHome centre. When a lead asks to visit, NERVE books it." },
    { target: '[data-tour="nav-calendar"]', title: "Stage-timed calendar", body: "Touch 3 is scheduled just before the next brand's specification window opens — e.g. pre-specify Ledlum lighting before MEP." },
    { target: '[data-tour="nav-brief"]', title: "The AllHome Brief", body: "The verified knowledge base every draft is grounded in — brand figures, product systems, partners and sources." },
    { target: '[data-tour="nav-analytics"]', title: "What converts", body: "Funnel, segments, cities, which brand bundles convert, and how Agent 10 re-weights scoring after every reply." },
    { target: '[data-tour="help"]', title: "A guide on every page", body: "Each page has its own short guide — it opens the first time you visit, and this button replays it any time." },
  ],
  new: [
    { target: '[data-tour="mission-tabs"]', title: "Four ways to start", body: "B2B for architects, ID firms, developers and contractors; B2C for homeowners; Discover to find firms by city; Quick Capture to paste a WhatsApp chat or business card. To find firms from live news events automatically, use Autopilot." },
    { target: '[data-tour="mission-form"]', title: "Project context matters", body: "Segment, project type, construction stage and city drive everything downstream — which brands are pitched, when, and which experience centre to invite them to. Leave contact fields blank and Agent 1 enriches them." },
    { target: '[data-tour="mission-preview"]', title: "Live bundle preview", body: "Change the stage or project type and watch the recommended AllHome bundle and the specification-window radar update instantly — before anything is launched." },
    { target: '[data-tour="sending-notice"]', title: "Before you launch", body: "Messages are generated and scheduled but only simulated until the company's own sending accounts are connected in Settings." },
  ],
  pipeline: [
    { target: '[data-tour="pipeline-header"]', title: "One mission, 10 agents", body: "The status shows how many agents have finished. The Live badge means progress streams in real time as each agent completes." },
    { target: '[data-tour="research-card"]', title: "Live research, with sources", body: "For a real firm, Agent 1 searches the web and news (Tavily) and extracts a profile with AI — every line links to a source. Contact details are never guessed. Demo firms are labelled as fictional." },
    { target: '[data-tour="pipeline-stepper"]', title: "Seven phases", body: "Ingest → Intel → Strategy → Content → Explain → Deliver → Learn. Click any phase (or use ← →) to see that agent's actual output and reasoning." },
    { target: '[data-tour="phase-strategy"]', title: "The AllHome brain", body: "Strategy shows the One-Collective brand bundle, the specification-window radar and the experience centre this lead is invited to." },
    { target: '[data-tour="phase-content"]', title: "Messages & spec sheet", body: "Personalised WhatsApp / email / LinkedIn copy plus a one-page spec sheet with lead times and order-by dates. Each message shows whether it would really be sent." },
    { target: '[data-tour="phase-deliver"]', title: "Delivery", body: "Shows what was sent on each channel. In demo mode it's simulated — connecting AiSensy, Resend and HeyReach accounts makes it real." },
    { target: '[data-tour="phase-learn"]', title: "Try it yourself", body: "Open Learn and type a reply as the prospect — e.g. “Can we visit your showroom?”. NERVE classifies it, books a visit at the nearest centre and lets you push the lead to Zoho." },
  ],
  centres: [
    { target: '[data-tour="centres-filters"]', title: "Every AllHome location", body: "Experience centres and Ledlum dealer showrooms from allhome.in — filter by city or brand." },
    { target: '[data-tour="centres-grid"]', title: "Invites & visits", body: "“Invited” counts leads whose outreach pointed them here; “visits” counts bookings. NERVE prefers a centre in the lead's own city for any brand in their bundle." },
    { target: '[data-tour="centres-visits"]', title: "Upcoming visits", body: "Visits are booked automatically when a lead asks to see products in person. Mark them done or no-show after the visit." },
  ],
  calendar: [
    { target: '[data-tour="calendar-grid"]', title: "Every scheduled touch", body: "All 3-touch cadences and experience-centre visits on one month view. 📍 entries are visits." },
    { target: '[data-tour="calendar-legend"]', title: "Channels at a glance", body: "Colour-coded by channel. Touch 3 often lands weeks out — timed to the next brand's specification window, not a fixed follow-up." },
    { target: '[data-tour="calendar-detail"]', title: "Day details", body: "Click a date to see who's being contacted, which brands are pitched and whether the message would really be sent." },
    { target: '[data-tour="calendar-chat"]', title: "Ask the schedule", body: "Chat with the AI about the schedule — e.g. “What's going out this week?” or “Which visits are booked?”." },
  ],
  analytics: [
    { target: '[data-tour="analytics-kpis"]', title: "Headline numbers", body: "Reply rate, interested leads, visits booked and leads handed to sales for this workspace." },
    { target: '[data-tour="analytics-funnel"]', title: "Outreach funnel", body: "From enriched → contacted → replied → interested → visit booked → handed to sales." },
    { target: '[data-tour="analytics-bundles"]', title: "Which bundles convert", body: "Agent 10 records every outcome by segment and brand bundle — the data AllHome would use to decide what to pitch to architects vs developers." },
    { target: '[data-tour="analytics-weights"]', title: "The model learns", body: "Positive replies reinforce the scoring dimensions that predicted them; negative ones dampen them. Future leads are scored with these updated weights." },
    { target: '[data-tour="analytics-export"]', title: "Export", body: "Download every lead with score, tier and bundle as CSV." },
  ],
  activity: [
    { target: '[data-tour="activity-status"]', title: "Live event stream", body: "A real-time feed of everything the agents do in this workspace, streamed from the server." },
    { target: '[data-tour="activity-feed"]', title: "Watch it work", body: "Keep this open in one tab and launch a mission in another — each agent's progress appears here as it happens." },
  ],
  autopilot: [
    { target: '[data-tour="autopilot-how"]', title: "NERVE finds the firms itself", body: "Autopilot searches recent news for events that mean materials will be specified soon, extracts the firms named in each article, and ranks them. A firm is only kept if its name literally appears in the source." },
    { target: '[data-tour="autopilot-triggers"]', title: "Pick the triggers", body: "Each trigger is an event AllHome can act on — a launch locks facades, a fit-out buys lighting and hardware. Untick the ones you don't care about." },
    { target: '[data-tour="autopilot-volume"]', title: "How many firms — and how many pipelines", body: "Finding firms is cheap. The full 10-agent pipeline is not (~2 web searches and ~7 AI calls per firm), so it only runs for the top few. The rest wait in a shortlist you can run on demand." },
    { target: '[data-tour="autopilot-cost"]', title: "See the cost before you run", body: "The estimate shows exactly how many API calls this run will use, what running every firm would cost, and how much of today's shared budget is left. Autopilot never spends past that budget." },
    { target: '[data-tour="autopilot-run"]', title: "Run it", body: "Live runs research real firms (read-only — nothing is sent). The sample scan uses fictional firms and makes no search calls, so you can try it any time." },
    { target: '[data-tour="autopilot-results"]', title: "Ranked firms, with the why", body: "Every firm shows the event that surfaced it, its source, its triage score and the AllHome angle. Open a finished mission, run a shortlisted one, or dismiss it." },
    { target: '[data-tour="autopilot-history"]', title: "Run history", body: "Every run is logged with what it found, how many pipelines it ran and anything it skipped (duplicates, daily limits, budget)." },
  ],
  brief: [
    { target: '[data-tour="brief-company"]', title: "What NERVE knows about AllHome", body: "Company positioning, figures, founders and funding — taken from AllHome's website, its 2026 brochure and press coverage." },
    { target: '[data-tour="brief-brands"]', title: "Brand facts the drafts may use", body: "Every brand's verified figures, named product systems, services and international partners. Drafts may only quote what's on this page — nothing is invented." },
    { target: '[data-tour="brief-sources"]', title: "Traceable", body: "Each fact links back to its source. Lead times and specification stages are NERVE's planning estimates and are labelled that way." },
  ],
  settings: [
    { target: '[data-tour="settings-workspace"]', title: "Workspace & sender", body: "Messages are signed with this name — specifiers reply to people, not brands." },
    { target: '[data-tour="settings-brands"]', title: "Brand catalog", body: "AllHome's 7 brands with product lines, specification stages and lead times. Untick a brand and the bundler stops recommending it." },
    { target: '[data-tour="settings-integrations"]', title: "Connect sending", body: "This is what turns the demo into production: each channel shows exactly what's connected and what's left — e.g. connecting a LinkedIn account in HeyReach or verifying an email domain in Resend." },
    { target: '[data-tour="settings-team"]', title: "Team", body: "Invite colleagues into the same workspace — they see the same missions, calendar and analytics." },
  ],
};
