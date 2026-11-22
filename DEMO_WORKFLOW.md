# NERVE demo: start to finish

About 10 minutes. Everything below works in the shared demo workspace with sending locked, so nothing is ever sent.

## Before you start (2 minutes early)

1. Open `https://nerve-a36o.onrender.com/api/health`. Render's free tier sleeps when idle and takes up to a minute to wake. Wait until it returns JSON.
2. Open `https://nerve.ritwikmohanty.dev` in a fresh window.
3. If someone has been clicking around the shared demo, restart the Render service. `DEMO_RESET_ON_BOOT=true` reseeds a clean workspace on every boot.
4. Keep one real firm name ready for the live part (for example, an architecture practice you know in Delhi or Bengaluru).

## 1. Landing page (1 minute)

- The hero shows a building going through its stages. Click **Structure**, then **Fit-out**: the brands that light up and the WhatsApp draft change with the stage. That is the whole idea in one picture.
- Scroll once to the **Every brand has a window** grid and click a stage column if anyone asks how NERVE decides what to pitch.
- Click **Open the live demo**. It logs straight into the demo workspace (the first click can take up to a minute while the free server wakes; the button says so).

## 2. The dashboard opens (10 seconds)

- A short guide opens. Show two steps, then **Skip tour**.
- Every page has its own guide. The **Guide** button in the sidebar replays it.

## 3. Command Center (1 minute)

- 11 missions, already run through all 10 agents: 8 added by hand and 3 found by the seeded Autopilot run. They are fictional firms, labelled SAMPLE.
- Point at the yellow banner: sending is locked; research uses live data, read-only.
- Open **Studio Kaarva Architects**.

## 4. One mission, phase by phase (3 minutes)

Use the stepper at the top (or the arrow keys).

| Phase | What to say |
|---|---|
| **Ingest** | Firm, contact and project. The yellow note says it's a fictional profile. For a real firm this card shows sourced research instead. |
| **Intel** | Signals (labelled as sample data), intent score 81/100 with the breakdown, and the persona (Design-led Architect) with the tone to use. |
| **Strategy** | The brand bundle for this stage (The Window Factory and Metalia now, House of W next). The specification-window radar shows when each brand is specified on this project. Touch 3 is timed to the next window, not a fixed follow-up. The nearest experience centre is chosen automatically. |
| **Content** | Three touches (WhatsApp, email, WhatsApp) plus a one-page spec sheet. Every figure comes from the AllHome Brief. The badge shows whether the AI or the templates wrote them. |
| **Explain** | A plain-English reason for every decision. |
| **Deliver** | What was "sent" on each channel, and exactly what AllHome would need to connect to go live (WhatsApp template, verified email domain, LinkedIn account in HeyReach, Zoho). |
| **Learn** | Kaarva already replied asking to visit: classified as positive, visit booked at The Window Factory centre in Mumbai, scoring weights updated. |

## 5. Play the prospect (1 minute)

- Go back and open **Monsoon House Architects** (no reply yet), then **Learn**.
- Under **Simulate a reply**, click **Wants a visit**. Agent 9 classifies it, books a visit at the nearest centre, and Agent 10 updates the weights.
- Click **Push to Zoho**. It shows the exact Zoho Leads API payload (simulated).

## 6. A real firm, researched live (2 minutes)

- **New Mission** → B2B Specifier. Type the real firm name, pick its city, leave project fields blank, click **Launch 10-agent pipeline**.
- It takes about a minute. Show the research card: every line has a source link; contact details are never guessed.
- Open **Content**. The messages open with the firm's real public work or recent news. They never invent a project or claim a stage NERVE doesn't know.
- Cost: about 2 web searches and 7 AI calls per firm.
- Alternative if time is short: **Quick Capture** → **Use sample chat** → **Extract lead**. The form fills itself from a pasted WhatsApp chat.

## 7. Autopilot: NERVE finds the firms itself (2 minutes)

- Open **Autopilot**. Walk the three steps at the top: scan the news, rank for free, full pipeline for the top few only.
- Point at the cost panel: running the full pipeline on every firm costs about 2.6 times more, which is why only the top 3 run and the rest are shortlisted.
- Click **Run sample scan** (fictional firms, no web searches). Watch the progress, then open **Why this firm** on a result.
- On a shortlisted firm, show **Run pipeline** (with its cost) and **Dismiss**.
- Only if asked: **Run Autopilot now** does a live scan of real news (about 11 web searches and 26 AI calls).

## 8. Calendar, centres, analytics (1 minute)

- **Calendar**: click the next working day to see the touches due. Open the chat button (bottom right) and ask "Which experience-centre visits are booked?"
- **Experience Centres**: every AllHome centre and Ledlum dealer from allhome.in, with invites and visits per centre.
- **Analytics**: funnel, conversion by segment, city, stage and bundle, and the weights Agent 10 has learned.
- **AllHome Brief**: the only facts the drafts are allowed to use, with sources.

## 9. Close (30 seconds)

"Nothing here was sent. To go live, AllHome connects its own WhatsApp Business number, email domain, LinkedIn profiles and Zoho. Settings → Integrations lists each remaining step."

## If you are asked

| Question | Answer |
|---|---|
| Are the demo firms real? | No. The 11 seeded firms and the Autopilot sample firms are fictional and labelled as such. Their emails use `.example` and their phone numbers start `+91-00000`, so nothing can reach a real person. Real firm names typed into New Mission, Discover or a live Autopilot run are researched live. |
| Can the AI make things up? | Drafts may only use facts from the AllHome Brief and the firm's sourced research. The AI edits a checked draft, and its output is rejected (falling back to the template) if it changes the greeting, alters a figure, asks more than one thing, uses filler phrases or flattery, or congratulates on old news. |
| What does it cost? | Per full pipeline about 2 web searches and 7 AI calls. Autopilot stops at a shared daily budget (40 searches, 400 AI calls by default), and a hard safety limit (50 searches, 900 AI calls) covers every feature. Settings → API usage & health shows today's numbers. |
| What if an API fails or runs out? | Every feature has a fallback: templates for messages, rule-based scoring, or "no public information found" for research. Nothing crashes, and Settings → API usage & health lists each error and the fallback used. |
| Why not run the pipeline on every firm? | Cost. Finding and ranking firms is cheap; the full pipeline is not. Autopilot runs the top few and lets you choose the rest. |
| Does it send messages? | Not in this deployment. Sending is locked. In production each channel uses AllHome's own account. |
