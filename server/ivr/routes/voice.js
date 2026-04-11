/**
 * IVR Voice Route — /voice
 * 
 * Main Twilio Voice webhook. Handles incoming calls with IVR menu.
 * Workers navigate via DTMF keypad or speech recognition.
 */

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const groq = require('../../shared/services/groqService');
const {
  getSession, createSession, updateSession, addToHistory,
} = require('../../shared/services/conversationState');
const { sanitizeForTwiML } = require('../../shared/utils/twimlHelpers');
const { logCall } = require('../../shared/utils/logger');

/**
 * POST /voice — Initial call handler
 */
router.post('/', (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  const from = req.body.From || '';

  logCall(callSid, 'call_started', { from });

  // Create session for this call
  createSession(callSid, { type: 'voice', phone: from, callSid });

  // Welcome message + menu
  const gather = response.gather({
    numDigits: 1,
    action: '/voice/menu',
    method: 'POST',
    timeout: 8,
    language: 'hi-IN',
    input: 'dtmf speech',
    speechTimeout: 'auto',
  });

  gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
    'Swaraj ID mein aapka swagat hai. ' +
    'Kaam dhundne ke liye 1 dabayein. ' +
    'Mazdoori ki shikayat ke liye 2 dabayein. ' +
    'Suraksha madad ke liye 3 dabayein. ' +
    'Apne haq jaanein ke liye 4 dabayein. ' +
    'Naya kaam seekhne ke liye 5 dabayein.'
  );

  // If no input
  response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
    'Koi input nahi mila. Kripya dobara call karein.'
  );

  res.type('text/xml').send(response.toString());
});

/**
 * POST /voice/menu — Process menu selection
 */
router.post('/menu', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  const digits = req.body.Digits;
  const speech = req.body.SpeechResult;
  const input = digits || speech || '';

  logCall(callSid, 'menu_selection', { digits, speech });

  // Map input to agent
  let agent = 'GENERAL';
  if (input === '1' || /kaam|job|dhundo/i.test(input)) agent = 'JOB_FINDER';
  else if (input === '2' || /paisa|mazdoori|wages/i.test(input)) agent = 'WAGE_PROTECTOR';
  else if (input === '3' || /suraksha|help|sos|khatra/i.test(input)) agent = 'SAFETY_GUARDIAN';
  else if (input === '4' || /haq|rights|scheme|shikayat/i.test(input)) agent = 'RIGHTS_ADVOCATE';
  else if (input === '5' || /seekh|skill|training/i.test(input)) agent = 'SKILL_BUILDER';

  updateSession(callSid, { activeAgent: agent, step: 'AGENT_START' });

  // AI-generated welcome for the selected agent
  const agentPrompts = {
    JOB_FINDER: 'Worker wants job. Ask them: What kind of work? Where? When? Be brief, in Hindi.',
    WAGE_PROTECTOR: 'Worker has wage issue. Ask: How much should you have been paid? How many days unpaid? In Hindi.',
    SAFETY_GUARDIAN: 'Worker needs safety help. Ask: What happened? Are you safe? Where is the site? In Hindi.',
    RIGHTS_ADVOCATE: 'Worker wants to know rights. Ask: What issue? Scheme, RTI, or complaint? In Hindi.',
    SKILL_BUILDER: 'Worker wants to learn new skill. Ask: What skill interests you? Masonry, carpentry, etc.? In Hindi.',
    GENERAL: 'Greet the worker warmly in Hindi and ask how you can help.',
  };

  const aiResponse = await groq.prompt(
    `You are Swaraj-ID voice assistant. Respond in natural Hindi. Keep it under 2 sentences.`,
    agentPrompts[agent] || agentPrompts.GENERAL,
    { temperature: 0.7, maxTokens: 100 }
  );

  const gather = response.gather({
    input: 'speech',
    action: '/voice/conversation',
    method: 'POST',
    timeout: 10,
    language: 'hi-IN',
    speechTimeout: 'auto',
  });

  gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
    sanitizeForTwiML(aiResponse, 'hi-IN')
  );

  response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
    'Koi jawab nahi mila. Main menu pe wapas ja raha hoon.'
  );
  response.redirect({ method: 'POST' }, '/voice');

  res.type('text/xml').send(response.toString());
});

/**
 * POST /voice/conversation — Ongoing conversation with AI agent
 */
router.post('/conversation', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  const speech = req.body.SpeechResult || '';

  const session = getSession(callSid);
  if (!session) {
    response.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'Session expire ho gayi. Kripya dobara call karein.');
    return res.type('text/xml').send(response.toString());
  }

  logCall(callSid, 'speech_input', { speech, agent: session.activeAgent });
  addToHistory(callSid, 'user', speech);

  // Check for exit commands
  if (/menu|wapas|exit|quit/i.test(speech)) {
    updateSession(callSid, { activeAgent: null, step: 'IDLE' });
    response.redirect({ method: 'POST' }, '/voice');
    return res.type('text/xml').send(response.toString());
  }

  // Get AI response
  const systemPrompt = `You are Swaraj-ID voice assistant (${session.activeAgent} agent).
Respond in natural Hindi. Keep responses under 3 sentences — this is a phone call.
Be warm, helpful, and actionable.`;

  const history = (session.conversationHistory || []).slice(-4).map(h => ({
    role: h.role, content: h.content,
  }));

  const aiResponse = await groq.chat(
    systemPrompt,
    [...history, { role: 'user', content: speech }],
    { temperature: 0.7, maxTokens: 150 }
  );

  addToHistory(callSid, 'assistant', aiResponse);

  const gather = response.gather({
    input: 'speech',
    action: '/voice/conversation',
    method: 'POST',
    timeout: 10,
    language: 'hi-IN',
    speechTimeout: 'auto',
  });

  gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
    sanitizeForTwiML(aiResponse, 'hi-IN')
  );

  // Timeout → return to menu
  response.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'Main menu pe wapas ja raha hoon.');
  response.redirect({ method: 'POST' }, '/voice');

  res.type('text/xml').send(response.toString());
});

/**
 * POST /voice/call-status — Call status callback
 */
router.post('/call-status', (req, res) => {
  const callSid = req.body.CallSid;
  const status = req.body.CallStatus;
  logCall(callSid, 'call_status', { status });
  res.sendStatus(200);
});

module.exports = router;
