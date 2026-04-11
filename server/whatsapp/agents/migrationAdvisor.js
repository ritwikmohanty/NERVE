/**
 * Agent 6: Migration Advisor
 * 
 * Predictive migration advice, labour hostel recommendations,
 * weather/pollution alerts, demand forecasting.
 */

const groq = require('../../shared/services/groqService');
const { logAgent } = require('../../shared/utils/logger');
const Worker = require('../../shared/models/Worker');
const MigrationAdvisory = require('../../shared/models/MigrationAdvisory');

const SYSTEM_PROMPT = `You are the Migration Advisor (Kahan Jaaun Agent) — a smart migration GPS for Indian migrant workers.
You speak Hindi/Hinglish naturally.

Your capabilities:
1. DEMAND FORECAST: Which cities need what skills right now?
2. WAGE COMPARISON: Compare daily wages across cities
3. HOSTEL FINDER: Verified, safe labour hostels near work sites
4. WEATHER ALERTS: Heat waves, pollution — avoid risky areas
5. CONTRACTOR INTEL: Best contractors in target city (by Trust Score)
6. PROACTIVE ALERTS: "Avoid Thane this week — only 11 openings"

Flow:
- "Kahan jaaun?" → Ask current skill and preferred region
- Analyze demand data → "Pune has 240 openings at ₹1,200/day for Concrete workers"
- Suggest top 3 cities with verified hostels + contractor numbers
- Warn about unsafe areas (heat, pollution, low demand)

Be data-driven and practical. This is about making migration safe and profitable.`;

async function handle(phone, message, session) {
  logAgent('MIGRATION_ADVISOR', phone, 'processing', { message: message.substring(0, 100) });

  try {
    let context = '';
    const worker = await Worker.findOne({ phone }).catch(() => null);
    if (worker) {
      context = `\nWorker: ${worker.name}, Current city: ${worker.city}, Skill: ${worker.workType}, Score: ${worker.swarajScore}`;
    }

    // Check migration advisories
    const advisories = await MigrationAdvisory.find({}).sort({ demandCount: -1 }).limit(5).catch(() => []);
    if (advisories.length > 0) {
      context += '\n\nCurrent Migration Data:\n' + advisories.map(a =>
        `${a.city} — ${a.skill}: ${a.demandCount} openings, ₹${a.avgDailyWage}/day, ${a.hostels?.length || 0} hostels`
      ).join('\n');
    }

    const history = (session.conversationHistory || []).slice(-6).map(h => ({
      role: h.role, content: h.content,
    }));

    const response = await groq.chat(
      SYSTEM_PROMPT + context,
      [...history, { role: 'user', content: message }],
      { temperature: 0.7, maxTokens: 400 }
    );

    return response;
  } catch (err) {
    logAgent('MIGRATION_ADVISOR', phone, 'error', { error: err.message });
    return '🗺️ Migration advisor mein dikkat hai. Kripya thodi der mein dobara try karein.';
  }
}

module.exports = { handle };
