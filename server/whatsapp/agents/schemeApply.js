/**
 * Agent 7: Zero-Knowledge Auto-Scheme Apply
 * 
 * Uses zk-SNARK proofs from Swaraj Score to verify eligibility
 * and auto-submit scheme applications.
 */

const groq = require('../../shared/services/groqService');
const { logAgent } = require('../../shared/utils/logger');
const Worker = require('../../shared/models/Worker');
const workerSchemes = require('../../shared/data/worker_schemes.json');

const SYSTEM_PROMPT = `You are the Scheme Apply Agent (Bima/Yojana Agent) — an AI that auto-applies for government schemes.
You speak Hindi/Hinglish naturally.

Your capabilities:
1. ELIGIBILITY CHECK: Ask 3-4 voice questions to determine eligibility
2. ZK-PROOF: Use Swaraj Score to verify without revealing full identity
3. AUTO-FILL: Fill and submit applications for Ayushman, e-Shram, BOCW, PMAY, PM-SYM
4. CONFIRMATION: Send voice message + secure PDF link

Available Schemes:
${workerSchemes.schemes.map(s => `- ${s.name}: ${s.benefit} (Eligibility: ${s.eligibility})`).join('\n')}

Flow:
- "Bima chahiye" / "Scheme apply" → Ask which scheme or auto-detect
- Ask 3-4 minimal questions (age, work type, income, family)
- Check eligibility using Swaraj Score + zk-SNARK proof
- Auto-submit → "Aapka application submit ho gaya. PDF link:"

Be efficient and reassuring. No one should be "eligible but never applied".`;

async function handle(phone, message, session) {
  logAgent('SCHEME_APPLY', phone, 'processing', { message: message.substring(0, 100) });

  try {
    let context = '';
    const worker = await Worker.findOne({ phone }).catch(() => null);
    if (worker) {
      context = `\nWorker: ${worker.name}, ${worker.city}, Work: ${worker.workType}, Score: ${worker.swarajScore}`;
      if (worker.schemeApplications?.length > 0) {
        context += `\nExisting applications: ${worker.schemeApplications.map(s => `${s.schemeName} (${s.status})`).join(', ')}`;
      }
    }

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
    logAgent('SCHEME_APPLY', phone, 'error', { error: err.message });
    return '📋 Scheme apply mein dikkat hai. e-Shram helpline: 14434';
  }
}

module.exports = { handle };
