/**
 * Registration Agent
 * 
 * New worker registration flow via WhatsApp.
 */

const groq = require('../../shared/services/groqService');
const { updateSession } = require('../../shared/services/conversationState');
const { logAgent } = require('../../shared/utils/logger');
const { generateWorkerId } = require('../../shared/services/caseGenerator');
const blockchain = require('../../shared/services/blockchainService');
const Worker = require('../../shared/models/Worker');

const SYSTEM_PROMPT = `You are the Registration Agent for Swaraj-ID — you help Indian workers create their digital identity.
You speak Hindi/Hinglish naturally.

Registration flow:
1. Ask worker's name
2. Ask city/area
3. Ask type of work (construction, driving, domestic, vendor, etc.)
4. Ask preferred language
5. Confirm all details
6. Create profile → Issue Swaraj Score of 500 (starting score)
7. If blockchain enabled, register on-chain

Be warm and welcoming. This is the worker's first step to a professional digital history.
Ask one question at a time. Be patient.`;

async function handle(phone, message, session) {
  logAgent('REGISTRATION', phone, 'processing', { message: message.substring(0, 100) });

  try {
    // Check if already registered
    const existing = await Worker.findOne({ phone }).catch(() => null);
    if (existing) {
      return `🎉 ${existing.name}, aap pehle se registered hain!\n\nWorker ID: ${existing.workerId}\nSwaraj Score: ${existing.swarajScore}/1000\nCity: ${existing.city}\nWork: ${existing.workType}\n\nType "menu" for options.`;
    }

    const history = (session.conversationHistory || []).slice(-8).map(h => ({
      role: h.role, content: h.content,
    }));

    const response = await groq.chat(
      SYSTEM_PROMPT + `\nThis worker's phone: ${phone}`,
      [...history, { role: 'user', content: message }],
      { temperature: 0.6, maxTokens: 300 }
    );

    return response;
  } catch (err) {
    logAgent('REGISTRATION', phone, 'error', { error: err.message });
    return '📝 Registration mein dikkat hai. Kripya thodi der mein dobara try karein.';
  }
}

module.exports = { handle };
