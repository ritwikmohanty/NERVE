# NERVE: Autonomous Outreach Engine

## AllHome Edition

> Prototype built for AllHome. It is not an official AllHome product. The pre-loaded demo prospects are fictional. Missions you launch with a real firm name are researched live, but **nothing is ever sent**.

AllHome sells premium architectural and interior products through 7 brands: Metalia, The Window Factory, Ledlum, House of W, Fiamarc, Shapes and Colour Coats. In this market, architects, interior designers, developers and contractors decide what gets specified. NERVE is an **outbound specifier engine** for that market. For each firm it:
- researches the firm with live data;
- works out which AllHome brands fit the project's current construction stage;
- drafts grounded WhatsApp, email and LinkedIn messages;
- invites the firm to the nearest experience centre;
- hands warm leads to Zoho CRM.

**Try it:** open the app → **Continue as AllHome demo** (one click, 8 pre-loaded pipelines, a guide on every page).

### Built for AllHome

| Feature | What it does |
|---|---|
| **AllHome Brief** | Holds verified facts for every brand: figures, named product systems, services, international partners and founders, all from allhome.in and the 2026 brochure with source links. Drafts may only quote facts from this page. |
| **Autopilot prospecting** | NERVE finds the firms itself. It scans recent news for trigger events (project launches, hotel signings, office and retail fit-outs, developer land deals, awards, new studios), extracts the firms named in each article and ranks them with a free triage score. The full 10-agent pipeline runs only for the top few, and the rest are shortlisted to run on demand. It can run daily or weekly, shows the API cost before each run and never spends past a shared daily budget. |
| **Live firm research** | Uses Tavily to search the web and news, and Groq to turn the results into a structured profile with summary, principals, public projects and dated signals, keeping the sources. It only reads information and never sends anything. Contact details and projects are never invented for real firms. |
| **Grounded drafting** | Each message opens with one detail that is specific to the recipient and can be checked, ties it to one concrete brand capability, and makes one ask. It shows the facts it was "grounded in". Clichés are banned, invented figures are rejected, and channel length limits are enforced. |
| **One-Collective Brand Bundler** | Recommends a cross-brand bundle for the project's type, construction stage, segment and budget. |
| **Specification-Window Radar** | Shows when each brand gets specified on the project. Touch 3 of the cadence is timed to the next brand's window. |
| **Experience Centre Router** | Picks the nearest AllHome centre, preferring one in the lead's own city. A reply asking to visit books the visit. |
| **Quick Capture** | Turns a pasted WhatsApp chat or business card into a lead. |
| **Zoho CRM hand-off and CSV export** | Shows the Zoho Leads API payload for warm leads (simulated) and exports leads as CSV. |
| **Channel readiness** | Every message shows whether it would really be sent, and what's missing (for example "connect a LinkedIn account in HeyReach"). |
| **Accounts, workspaces and guides** | Signup and login, onboarding, isolated workspaces, and a guided tour on every page. |

### Data and safety
- **Research is live, sending is locked.** `LIVE_RESEARCH=true` uses Tavily, Groq and Apollo (where the plan allows) only to *retrieve* information. `SIMULATION_MODE=true` keeps sending permanently off. The keys on the demo are the developer's personal keys, and the UI says so.
- **Nothing invented for real firms.** There are no simulated news items, no guessed emails or phone numbers, no made-up projects, and no fabricated replies. A real lead waits for a real reply, and the learning loop doesn't learn from a non-event.
- **The demo seed stays fictional and offline**, and uses reserved `.example` addresses.

Deployment steps are in [DEPLOY.md](DEPLOY.md).

---

## Problem Statement

B2B sales development is a constant battle between quantity and quality. Sales teams spend the majority of their time on manual, non-revenue-generating tasks: researching leads, finding contact information, searching for relevant "buy signals," and writing endless email variations. This operational drag leads to:

- **Slow Speed-to-Lead:** High-intent prospects go cold while reps are buried in research.
- **Generic Messaging:** Under pressure to hit quotas, reps fall back on generic templates that get ignored.
- **Inconsistent Execution:** The quality of outreach varies wildly from rep to rep and day to day.
- **Wasted Talent:** Skilled salespeople are stuck doing data entry instead of building relationships and closing deals.

## Our Solution

NERVE is an autonomous agentic workforce designed to automate the entire B2B outreach process from end to end. It acts as a force multiplier for your sales team, executing the time-consuming research and writing tasks with machine speed and precision.

By connecting a series of specialized AI agents, NERVE transforms a single trigger (like a company name) into a fully executed, hyper-personalized outreach campaign. It finds the lead, scores their intent, identifies the perfect moment to engage, and crafts a unique message based on real-time data.

This allows your human sales team to focus exclusively on high-value activities: engaging with warm, high-intent leads and closing deals.
> 10-agent AI pipeline that finds, scores, writes, and delivers B2B outreach, with no human input after the trigger.

```
Lead Input ──► Agent 1: Lead Ingestion & Enrichment
                   │
                   ▼
              Agent 2: Signal Scout
                   │
          ┌────────┴────────┐
          ▼                 ▼
   Agent 3: Intent    Agent 4: Persona
      Scorer            Analyst
          └────────┬────────┘
                   ▼
          Agent 5: Strategy Commander
                   │
          ┌────────┴────────┐
          ▼                 ▼
   Agent 6: Content   Agent 7: Explainer
      Forge
          └────────┬────────┘
                   ▼
          Agent 8: Delivery
                   │
                   ▼
          Agent 9: Response Monitor
                   │
        ┌──────────┼──────────┬──────────┐
        ▼          ▼          ▼          ▼
  escalate    continue    cancel      nurture
   _human     _cadence   _sequence
                   │
                   ▼
          Agent 10: Learning Loop
```

---

## Stack

| Layer | Tech |
|-------|------|
| Server | Hono v4 + Node.js 20 (ESM) |
| Database | MongoDB (local) |
| LLM | Groq: `openai/gpt-oss-120b`, falling back to `openai/gpt-oss-20b` on rate limits (`@ai-sdk/groq`) |
| Agent Framework | Mastra (`mastra@1.5.0`, `@mastra/core`): Studio at `:4111` |
| Enrichment | Apollo.io API |
| Signals | Tavily Search API |
| Email delivery | Resend |
| LinkedIn outreach | HeyReach |
| WhatsApp | AiSensy |
| Real-time events | Server-Sent Events (SSE) |
| Frontend | React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 4 + shadcn/ui + Framer Motion 12 |

---

## Features

- **Targeted mode**: provide a company name; agents enrich, score, and outreach automatically
- **Discovery mode**: describe your product; Agent 1 finds and recommends matching companies
- **Phase-wise pipeline UI**: 7-phase stepper with prev/next navigation and keyboard shortcuts (← →)
- **Real-time SSE**: watch every agent run live in the browser
- **Outreach Calendar**: month-view calendar showing all scheduled touchpoints across leads
- **AI Schedule Assistant**: chatbot (Groq LLM) answers questions about your outreach schedule
- **Mastra Studio**: visual agent/workflow debugger at `localhost:4111`
- **Simulate Reply**: test Agent 9 sentiment classification and Agent 10 weight updates from the UI
- **Learning Loop**: Agent 10 adjusts 9 scoring dimension weights after every outcome

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/ritwikmohanty/HackX
cd HackX

# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env   # SIMULATION_MODE=true works with no API keys
```

Optionally edit `server/.env` and add real keys. `CLIENT_URL` must be `http://localhost:5173`.

### 3. Run

```bash
# Terminal 0: MongoDB must be running
brew services start mongodb-community   # or: mongod

# Terminal 1: Server (from /server)
npm start          # or: npx tsx src/index.ts

# Terminal 2: Client (from /client)
npm run dev

# Terminal 3: Mastra Studio (optional, from /server)
npx mastra dev
```

| Service | URL |
|---------|-----|
| API Server | `http://localhost:3001` |
| Frontend | `http://localhost:5173` |
| Mastra Studio | `http://localhost:4111` |

---

## Frontend Pages

| Route | Page |
|-------|------|
| `/` | Landing page |
| `/dashboard` | Command Center: all leads with status |
| `/dashboard/new` | New Mission: targeted or discovery mode form |
| `/dashboard/autopilot` | Autopilot: trigger-based prospecting, cost estimate, ranked firms, run history |
| `/dashboard/pipeline/:id` | Pipeline: 7-phase agent visualizer with live SSE |
| `/dashboard/activity` | Activity log |
| `/dashboard/calendar` | Outreach Calendar + AI Schedule Chatbot |
| `/dashboard/settings` | Settings |

---

## API Reference

### Health
```text
GET /api/health
```
Returns server status, simulation mode, connected SSE clients, and API key presence flags.

---

### Mode 1: Targeted (you pick the company)
```json
POST /api/leads/execute
{
  "companyName": "Stripe",
  "contactName": "Patrick Collison",    // optional; Apollo fills gaps
  "contactTitle": "CEO",
  "contactEmail": "...",                // optional
  "contactLinkedIn": "...",             // optional
  "location": "San Francisco",
  "additionalContext": "..."            // optional
}
```
Returns `{ pipelineId, leadId, status: "started" }` immediately. Pipeline runs async.

---

### Mode 2: Discovery (AI finds companies)
```json
POST /api/leads/discover
{
  "productName": "CortexReach",
  "productDescription": "Autonomous B2B outreach engine",
  "targetIndustries": ["SaaS", "FinTech"],
  "targetGeographies": ["India", "US"],
  "targetCompanySize": "50-200",        // optional
  "idealCustomerProfile": "...",        // optional
  "maxResults": 5
}
```

---

### Lead state
```
GET /api/leads/:id      # Full pipeline output for one lead
GET /api/leads          # All leads
```

---

### Real-time events (SSE)
```text
GET /api/events?leadId=<id>
```

| Event type | When |
|------------|------|
| `connected` | On SSE connect |
| `agent_status` | Agent starts/completes |
| `score_update` | Intent score ready |
| `strategy_update` | Strategy decided |
| `content_update` | Messages generated |
| `delivery_update` | Messages dispatched |
| `response_update` | Sentiment classified |
| `branch_decision` | Cadence branch chosen |
| `pipeline_complete` | All 10 agents done |
| `error` | Any agent failure |

---

### Autopilot prospecting
```text
GET   /api/prospecting                    # config, limits, cost estimate, today's API usage, recent runs
PATCH /api/prospecting/config             # triggers, segments, cities, firmsPerRun, pipelinesPerRun, lookbackDays, schedule
POST  /api/prospecting/run                # { "sample": false } live scan, or { "sample": true } fictional, no-search scan
GET   /api/prospecting/runs/:id           # run progress + ranked firms
POST  /api/prospecting/prospects/:id/run  # run the full pipeline for one shortlisted firm
POST  /api/prospecting/prospects/:id/dismiss
GET   /api/usage                          # Tavily / Groq / Apollo calls used today vs the daily budget
```
Each live scan query costs about 1 web search and 1 AI call. Each full pipeline costs about 2 web searches and 7 AI calls, which is why only the top few firms get one. Budgets and caps are set with `DAILY_*_BUDGET` and `AUTOPILOT_*` (see `server/.env.example`). The shared demo workspace has lower caps and no scheduling.

---

### Response webhook (for real replies)
```json
POST /api/webhook/response
{
  "leadId": "...",
  "channel": "email",
  "messageBody": "Thanks, let's talk"
}
```
Triggers Agent 9 (sentiment classification) → Agent 10 (learning weight update).

---

### Calendar
```
GET  /api/calendar/events        # All scheduled touchpoints across all leads
POST /api/calendar/chat          # AI chatbot for schedule queries
     { "message": "What's scheduled this week?" }
```

---

### Simulation toggle
```json
POST /api/config/simulation
{ "enabled": true }
```

---

## Agents

| # | Name | Input | Output | Key behaviour |
|---|------|-------|--------|--------------|
| 1 | **Lead Ingestion** | `TargetedInput` or `DiscoveryInput` | `EnrichedLead[]` | Apollo enrichment (targeted) or Groq LLM company discovery from a 20+ company pool across 7 industries. Deduplicates by company domain hash. |
| 2 | **Signal Scout** | `EnrichedLead` | `SignalBundle` | Tavily web search for hiring spikes, funding rounds, product launches, exec hires, LinkedIn activity. 18 unique signal types across 6 pools. |
| 3 | **Intent Scorer** | `EnrichedLead`, `SignalBundle` | `IntentScore` | 9-dimension weighted scoring → 0–100 composite + tier (HOT/WARM/COOL/COLD). Dimensions: ICP fit, seniority, geography, industry, company size, funding stage, signal strength, LinkedIn activity, engagement history. |
| 4 | **Persona Analyst** | `EnrichedLead` | `PersonaProfile` | Groq LLM classifies contact into one of 4 archetypes (strategic_executive, practitioner, innovator, networker). Returns tone guidance and messaging avoidances. |
| 5 | **Strategy Commander** | `EnrichedLead`, `SignalBundle`, `IntentScore`, `PersonaProfile` | `OutreachStrategy` | Picks primary channel (LinkedIn/email/WhatsApp), send timing (IST-aware), tone framework, and full 3-touch cadence with ISO `scheduledAt` timestamps. |
| 6 | **Content Forge** | All prior outputs | `GeneratedContent` | Groq LLM generates 3 personalised touch messages + LinkedIn thought leadership post + headline suggestion. Signal-aware, industry-specific templates. |
| 7 | **Explainer** | All prior outputs | `DecisionRationale` | Plain-English rationale for every agent decision. Provides confidence scores, decision summaries, and React Flow graph data for the Decision Theatre UI. |
| 8 | **Delivery** | `OutreachStrategy`, `GeneratedContent` | `DeliveryResult[]` | Routes Touch 1 via Resend (email), HeyReach (LinkedIn), or AiSensy (WhatsApp). Queues Touches 2–3. Returns provider message IDs. |
| 9 | **Response Monitor** | `leadId`, `channel`, `messageBody?` | `ResponseEvent` | Keyword + Groq LLM sentiment classification → positive/neutral/negative/no_reply. Deterministic distribution in simulation: 15% positive, 10% negative, 25% neutral, 50% no_reply. |
| 10 | **Learning Loop** | `ResponseEvent`, `IntentScore`, `OutreachStrategy`, `PersonaProfile` | `LearningResult` | Updates 9 scoring dimension weights based on outcome. Records heuristic and tone rule adjustments for compounding improvement across campaigns. |

---

### Conditional branches after Agent 9

| Sentiment | Action | Behaviour |
|-----------|--------|-----------|
| `positive` | `escalate_human` | Stop cadence, hand off to human sales rep |
| `negative` | `cancel_sequence` | Mark lead as do-not-contact, stop all outreach |
| `neutral` | `continue_cadence` | Proceed with Touch 2 / Touch 3 |
| `no_reply` | `nurture` | Move lead to long-term drip sequence |

---

## Database

MongoDB at `mongodb://localhost:27017`, database name `nerve`.

| Collection | Contents |
|------------|----------|
| `leads` | Enriched lead records |
| `campaigns` | Pipeline run state per lead |
| `agent_runs` | Every agent execution with JSON output |
| `signals` | Signal bundles from Agent 2 |
| `intent_scores` | Composite scores from Agent 3 |
| `persona_profiles` | Archetype profiles from Agent 4 |
| `strategies` | Outreach strategies + cadence from Agent 5 |
| `generated_content` | Touch messages + LinkedIn posts from Agent 6 |
| `delivery_logs` | Delivery receipts from Agent 8 |
| `response_events` | Sentiment events from Agent 9 |
| `learning_history` | Weight update history from Agent 10 |
| `scoring_weights` | Current live scoring weights (updated by Agent 10) |

---

## Mastra Studio

NERVE agents and the full pipeline workflow are registered with Mastra for visual debugging.

```bash
npx mastra dev    # from /HackX root
# → http://localhost:4111
```

The Mastra Studio lets you inspect agent inputs/outputs, replay individual steps, and visualise the `nervePipeline` workflow DAG.

---

## Notes

- **Groq free tier** is generous (14,400 req/day, 500k tokens/min for Llama 3.3 70B). Production load may need a paid key.
- **HeyReach** requires a connected LinkedIn account in the HeyReach dashboard before `AddLeadsToCampaign` works.
- **Resend** free tier only sends from `onboarding@resend.dev`. Add a verified domain for a custom sender address.
- **AiSensy** WhatsApp requires an approved message template. Leave `AISENSY_API_KEY` empty to skip WhatsApp entirely.
- **MongoDB** must be running locally before starting the server (`mongod` or MongoDB Compass).
- **Simulation mode** (`SIMULATION_MODE=true`) never sends anything: Resend, HeyReach and AiSensy sends are simulated with identical payload shapes, so all downstream agents and the UI work normally. With `LIVE_RESEARCH=true`, Tavily, Apollo and Groq are still used to research real firms (read-only).
