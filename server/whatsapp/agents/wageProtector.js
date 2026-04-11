/**
 * Agent 2: Wage Protector + Silent Grievance Engine
 * 
 * Logs daily wages, detects underpayment, auto-generates disputes,
 * and triggers collective grievances when threshold met.
 */

const groq = require('../../shared/services/groqService');
const { updateSession } = require('../../shared/services/conversationState');
const { logAgent } = require('../../shared/utils/logger');
const { generateDisputeId, generateGrievanceId } = require('../../shared/services/caseGenerator');
const Worker = require('../../shared/models/Worker');
const Dispute = require('../../shared/models/Dispute');
const Grievance = require('../../shared/models/Grievance');

const SYSTEM_PROMPT = `You are the Wage Protector (Paisa Agent) — an AI that fights wage theft for Indian workers.
You speak Hindi/Hinglish naturally.

Your capabilities:
1. LOG daily wages: Worker says "Aaj ₹480 mila, 8 ghante kaam" → record & compare against Labour Code minimums
2. DETECT underpayment: Auto-compare against ₹520-780/day minimum for construction in Maharashtra
3. DISPUTE: If wages missing, create dispute draft with evidence → notify contractor via WhatsApp
4. COLLECTIVE: If 10+ similar reports in same pin code → auto-file collective grievance on PG Portal/CPGRAMS

Flow:
- Ask: How much did you earn today? How many hours?
- Compare against minimum wage
- If short: "Aapko ₹X zyada milna chahiye. Kya dispute file karein?"
- Track unpaid days, generate payslips

Be empathetic, brief, and empowering. This is about worker dignity.`;

async function handle(phone, message, session) {
  logAgent('WAGE_PROTECTOR', phone, 'processing', { message: message.substring(0, 100) });

  try {
    let workerContext = '';
    const worker = await Worker.findOne({ phone }).catch(() => null);
    if (worker) {
      const recentLogs = (worker.workLog || []).slice(-5);
      const unpaidDays = recentLogs.filter(l => !l.paid).length;
      const totalEarned = recentLogs.reduce((sum, l) => sum + l.earned, 0);
      workerContext = `\nWorker: ${worker.name}, ${worker.city}, Score: ${worker.swarajScore}
Recent work: ${recentLogs.length} days logged, ₹${totalEarned} earned, ${unpaidDays} unpaid days.`;
    }

    // Check for existing disputes
    const openDisputes = await Dispute.find({ phone, status: 'open' }).limit(3).catch(() => []);
    if (openDisputes.length > 0) {
      workerContext += `\nOpen disputes: ${openDisputes.map(d => `${d.disputeId} (₹${d.totalDues})`).join(', ')}`;
    }

    const history = (session.conversationHistory || []).slice(-6).map(h => ({
      role: h.role, content: h.content,
    }));

    const response = await groq.chat(
      SYSTEM_PROMPT + workerContext,
      [...history, { role: 'user', content: message }],
      { temperature: 0.6, maxTokens: 400 }
    );

    return response;
  } catch (err) {
    logAgent('WAGE_PROTECTOR', phone, 'error', { error: err.message });
    return '⚖️ Wage protector mein dikkat hai. Kripya thodi der mein dobara try karein.';
  }
}

module.exports = { handle };
