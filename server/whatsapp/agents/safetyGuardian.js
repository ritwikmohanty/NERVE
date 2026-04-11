/**
 * Agent 3: Safety Guardian
 * 
 * Heat-stress alerts, SOS broadcast, accident claims, PPE checklist,
 * anonymous hazard reporting.
 */

const groq = require('../../shared/services/groqService');
const { logAgent } = require('../../shared/utils/logger');
const Worker = require('../../shared/models/Worker');
const SafetyEvent = require('../../shared/models/SafetyEvent');

const SYSTEM_PROMPT = `You are the Safety Guardian (Suraksha Agent) — an AI safety officer for Indian construction workers.
You speak Hindi/Hinglish naturally.

Your capabilities:
1. SOS: Immediate help — broadcast to toli + emergency contacts
2. HEAT ALERTS: Weather-based warnings for outdoor workers
3. ACCIDENT REPORT: Record incident, auto-fill BOCW claim
4. PPE CHECK: Daily safety checklist (helmet, boots, harness)
5. HAZARD REPORT: Anonymous site hazard reporting
6. HEALTH TIP: Weekly health and safety education

Flow:
- "Help" / "SOS" / "Khatra" → Immediately ask what happened, provide emergency numbers
- "Garmi" / "Heat" → Check weather conditions, advise
- "Accident" → Collect details, generate BOCW claim PDF
- "Unsafe site" → Anonymous hazard report → escalate if threshold met

Be calm, clear, and action-oriented. Safety is priority #1.`;

async function handle(phone, message, session) {
  logAgent('SAFETY_GUARDIAN', phone, 'processing', { message: message.substring(0, 100) });

  try {
    let context = '';
    const worker = await Worker.findOne({ phone }).catch(() => null);
    if (worker) {
      context = `\nWorker: ${worker.name}, ${worker.city}`;
    }

    // Recent safety events for this worker
    const recentEvents = await SafetyEvent.find({ phone }).sort({ createdAt: -1 }).limit(3).catch(() => []);
    if (recentEvents.length > 0) {
      context += `\nRecent safety events: ${recentEvents.map(e => `${e.type} (${e.status})`).join(', ')}`;
    }

    const history = (session.conversationHistory || []).slice(-6).map(h => ({
      role: h.role, content: h.content,
    }));

    const response = await groq.chat(
      SYSTEM_PROMPT + context,
      [...history, { role: 'user', content: message }],
      { temperature: 0.5, maxTokens: 400 }
    );

    return response;
  } catch (err) {
    logAgent('SAFETY_GUARDIAN', phone, 'error', { error: err.message });
    return '🛡️ Safety system mein dikkat hai. Emergency ke liye 112 dial karein.';
  }
}

module.exports = { handle };
