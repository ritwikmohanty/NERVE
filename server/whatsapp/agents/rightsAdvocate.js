/**
 * Agent 4: Rights Advocate
 * 
 * Labour rights education, RTI filing, grievance submission,
 * collective complaint mode, Virtual Toli Sabha.
 */

const groq = require('../../shared/services/groqService');
const { logAgent } = require('../../shared/utils/logger');
const Worker = require('../../shared/models/Worker');
const Grievance = require('../../shared/models/Grievance');
const labourRights = require('../../shared/data/labour_rights.json');

const SYSTEM_PROMPT = `You are the Rights Advocate (Haq Agent) — an AI that empowers Indian workers with legal knowledge.
You speak Hindi/Hinglish naturally.

Your capabilities:
1. RIGHTS EDUCATION: 60-second voice lessons on 2025 Labour Codes
2. SCHEME ELIGIBILITY: Check if worker qualifies for PMAY, e-Shram, PDS, Ayushman
3. RTI FILING: Help draft and file RTI applications
4. GRIEVANCE: File grievance on PG Portal / CPGRAMS
5. COLLECTIVE COMPLAINT: If 10+ similar reports in pin code → auto-file collective grievance
6. VIRTUAL TOLI SABHA: Aggregate toli scores for collective wage negotiation

Key Labour Code Facts:
- Minimum wage: ₹520-780/day for construction in Maharashtra
- Working hours: 8 hrs/day, 48 hrs/week max
- Overtime: Double normal rate
- Weekly off: Mandatory 1 day/week
- Safety: Employer must provide PPE, first aid, water

Flow:
- "Mera haq" → Ask what right they need help with
- "Scheme" → Ask basic details, check eligibility
- "Shikayat" / "Complaint" → Collect details, file grievance
- "RTI" → Draft RTI application

Be empowering and knowledgeable. Workers have rights — help them use them.`;

async function handle(phone, message, session) {
  logAgent('RIGHTS_ADVOCATE', phone, 'processing', { message: message.substring(0, 100) });

  try {
    let context = '';
    const worker = await Worker.findOne({ phone }).catch(() => null);
    if (worker) {
      context = `\nWorker: ${worker.name}, ${worker.city}, Score: ${worker.swarajScore}`;
    }

    // Check existing grievances
    const grievances = await Grievance.find({ filedByPhone: phone }).limit(3).catch(() => []);
    if (grievances.length > 0) {
      context += `\nExisting grievances: ${grievances.map(g => `${g.grievanceId} (${g.type}, ${g.status})`).join(', ')}`;
    }

    context += `\n\nLabour Rights Reference:\n${JSON.stringify(labourRights.labour_codes_2025)}`;

    const history = (session.conversationHistory || []).slice(-6).map(h => ({
      role: h.role, content: h.content,
    }));

    const response = await groq.chat(
      SYSTEM_PROMPT + context,
      [...history, { role: 'user', content: message }],
      { temperature: 0.6, maxTokens: 400 }
    );

    return response;
  } catch (err) {
    logAgent('RIGHTS_ADVOCATE', phone, 'error', { error: err.message });
    return '⚖️ Rights advocate mein dikkat hai. Labour helpline: 14434';
  }
}

module.exports = { handle };
