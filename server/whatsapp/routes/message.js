/**
 * WhatsApp Message Route — /sms
 * 
 * Main Twilio webhook for incoming WhatsApp messages (text + voice notes).
 * Routes to the correct AI agent based on intent classification.
 */

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { transcribeVoiceNote } = require('../../shared/services/transcriptionService');
const groq = require('../../shared/services/groqService');
const {
  getSession, createSession, updateSession, addToHistory,
} = require('../../shared/services/conversationState');
const { logMessage, logAgent, logError } = require('../../shared/utils/logger');

// Agent handlers
const jobFinderAgent = require('../agents/jobFinder');
const wageProtectorAgent = require('../agents/wageProtector');
const safetyGuardianAgent = require('../agents/safetyGuardian');
const rightsAdvocateAgent = require('../agents/rightsAdvocate');
const skillBuilderAgent = require('../agents/skillBuilder');
const migrationAdvisorAgent = require('../agents/migrationAdvisor');
const schemeApplyAgent = require('../agents/schemeApply');
const registrationAgent = require('../agents/registration');

// Agent dispatcher map
const AGENT_HANDLERS = {
  JOB_FINDER: jobFinderAgent,
  WAGE_PROTECTOR: wageProtectorAgent,
  SAFETY_GUARDIAN: safetyGuardianAgent,
  RIGHTS_ADVOCATE: rightsAdvocateAgent,
  SKILL_BUILDER: skillBuilderAgent,
  MIGRATION_ADVISOR: migrationAdvisorAgent,
  SCHEME_APPLY: schemeApplyAgent,
  REGISTRATION: registrationAgent,
};

/**
 * POST /sms — Twilio WhatsApp/SMS webhook
 */
router.post('/', async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();

  try {
    const from = req.body.From || '';
    const body = req.body.Body || '';
    const numMedia = parseInt(req.body.NumMedia || '0', 10);
    const messageSid = req.body.MessageSid || '';

    logMessage(from, 'incoming', { body: body.substring(0, 100), numMedia });

    // ── 1. Handle voice notes: transcribe first ─────────────────────
    let userMessage = body;
    if (numMedia > 0) {
      const mediaUrl = req.body.MediaUrl0;
      const mediaType = req.body.MediaContentType0 || '';

      if (mediaType.startsWith('audio/')) {
        logMessage(from, 'voice_note_received', { mediaType });
        const transcript = await transcribeVoiceNote(mediaUrl);
        if (transcript) {
          userMessage = transcript;
          logMessage(from, 'voice_note_transcribed', { transcript: transcript.substring(0, 100) });
        } else {
          twiml.message('🎤 Maaf kijiye, aapki voice note samajh nahi aayi. Kripya dobara bhejein ya text mein likhein.');
          return res.type('text/xml').send(twiml.toString());
        }
      }
    }

    if (!userMessage || userMessage.trim().length === 0) {
      twiml.message('🙏 Namaste! Swaraj-ID mein aapka swagat hai. Kya madad chahiye?\n\n1️⃣ Kaam dhundo\n2️⃣ Paisa nahi mila\n3️⃣ Mera haq / Shikayat\n4️⃣ Scheme apply\n5️⃣ Naya kaam seekho\n6️⃣ Kahan jaaun (Migration)\n\nApna sawaal Hindi, Marathi ya English mein bhejein 🗣️');
      return res.type('text/xml').send(twiml.toString());
    }

    // ── 2. Get or create session ────────────────────────────────────
    let session = getSession(from);
    if (!session) {
      session = createSession(from, { type: 'message', phone: from });
    }

    // ── 3. If agent already active, route to that agent ─────────────
    if (session.activeAgent && AGENT_HANDLERS[session.activeAgent]) {
      // Check for "exit" / "menu" commands
      const lowerMsg = userMessage.toLowerCase().trim();
      if (['menu', 'exit', 'quit', 'back', 'wapas', 'vapas'].includes(lowerMsg)) {
        updateSession(from, { activeAgent: null, step: 'IDLE', data: {} });
        twiml.message('🏠 Main menu:\n\n1️⃣ Kaam dhundo\n2️⃣ Paisa nahi mila\n3️⃣ Mera haq / Shikayat\n4️⃣ Scheme apply\n5️⃣ Naya kaam seekho\n6️⃣ Kahan jaaun\n\nKya madad chahiye?');
        return res.type('text/xml').send(twiml.toString());
      }

      const handler = AGENT_HANDLERS[session.activeAgent];
      addToHistory(from, 'user', userMessage);
      const response = await handler.handle(from, userMessage, session);
      addToHistory(from, 'assistant', response);

      twiml.message(response);
      return res.type('text/xml').send(twiml.toString());
    }

    // ── 4. Classify intent → route to agent ─────────────────────────
    const intent = await groq.classifyIntent(userMessage);
    logAgent(intent.agent, from, 'intent_classified', intent);

    const agentName = intent.agent || 'GENERAL';
    const handler = AGENT_HANDLERS[agentName];

    if (handler) {
      updateSession(from, { activeAgent: agentName, step: 'START' });
      addToHistory(from, 'user', userMessage);
      const response = await handler.handle(from, userMessage, session);
      addToHistory(from, 'assistant', response);
      twiml.message(response);
    } else {
      // General / unrecognised → welcome + menu
      const generalResponse = await groq.prompt(
        `You are Swaraj-ID, a voice-first AI assistant for Indian informal workers.
You speak Hindi/Hinglish naturally. You help workers with:
1. Finding jobs (Chowk Smart Matcher)
2. Wage protection & disputes
3. Safety alerts
4. Rights & grievances
5. Skill building & certifications
6. Migration advice
7. Government scheme applications

Be warm, brief, and actionable. Always suggest the most relevant agent.`,
        userMessage,
        { temperature: 0.7, maxTokens: 300 }
      );

      addToHistory(from, 'user', userMessage);
      addToHistory(from, 'assistant', generalResponse);
      twiml.message(generalResponse + '\n\n💡 Type "menu" for options.');
    }

    return res.type('text/xml').send(twiml.toString());
  } catch (error) {
    logError(req.body?.MessageSid, 'Message handler error', error);
    twiml.message('Maaf kijiye, kuch gadbad ho gayi. Kripya thodi der mein dobara koshish karein. 🙏');
    return res.type('text/xml').send(twiml.toString());
  }
});

module.exports = router;
