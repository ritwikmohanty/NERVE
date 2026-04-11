/**
 * IVR Grievance Route — /grievance
 * 
 * Handles labour grievance filing via IVR.
 * PG Portal, CPGRAMS, RTI, and BMC/Labour Commission paths.
 */

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const Worker = require('../../shared/models/Worker');
const Grievance = require('../../shared/models/Grievance');
const groq = require('../../shared/services/groqService');
const blockchain = require('../../shared/services/blockchainService');
const { generateCaseId } = require('../../shared/services/caseGenerator');
const { getSession, createSession, updateSession } = require('../../shared/services/conversationState');
const { sanitizeForTwiML } = require('../../shared/utils/twimlHelpers');
const { logCall } = require('../../shared/utils/logger');

// ------------------------------------------------------------------
//  POST /grievance — Start grievance filing
// ------------------------------------------------------------------
router.post('/', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  const from = req.body.From || '';

  createSession(callSid, {
    type: 'voice',
    phone: from,
    flow: 'GRIEVANCE',
    step: 'CATEGORY',
  });

  const gather = response.gather({
    numDigits: 1,
    action: '/grievance/category',
    method: 'POST',
    timeout: 8,
    language: 'hi-IN',
    input: 'dtmf speech',
    speechTimeout: 'auto',
  });

  gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
    'Shikayat darj karne ke liye: ' +
    'Mazdoori ka masla ho toh 1 dabayein. ' +
    'Kaam ki jagah suraksha ke liye 2 dabayein. ' +
    'Sarkari yojana mein dikkat ke liye 3 dabayein. ' +
    'RTI lagaane ke liye 4 dabayein. ' +
    'Kuch aur shikayat ke liye 5 dabayein.'
  );

  response.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'Koi input nahi mila.');
  response.redirect({ method: 'POST' }, '/voice');

  res.type('text/xml').send(response.toString());
});

// ------------------------------------------------------------------
//  POST /grievance/category — Process category selection
// ------------------------------------------------------------------
router.post('/category', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  const digits = req.body.Digits;
  const speech = req.body.SpeechResult || '';
  const input = digits || speech;

  const categoryMap = {
    '1': 'WAGE',
    '2': 'SAFETY',
    '3': 'SCHEME',
    '4': 'RTI',
    '5': 'OTHER',
  };

  let category = categoryMap[digits] || 'OTHER';

  // Speech-based classification
  if (!digits && speech) {
    if (/mazdoori|paisa|wage|payment/i.test(speech)) category = 'WAGE';
    else if (/suraksha|safety|accident/i.test(speech)) category = 'SAFETY';
    else if (/yojana|scheme|ration|pension/i.test(speech)) category = 'SCHEME';
    else if (/rti|jaankari|information/i.test(speech)) category = 'RTI';
  }

  updateSession(callSid, { grievanceCategory: category, step: 'DETAILS' });

  const categoryNames = {
    WAGE: 'Mazdoori ka masla',
    SAFETY: 'Suraksha',
    SCHEME: 'Sarkari yojana',
    RTI: 'RTI',
    OTHER: 'Anya shikayat',
  };

  const gather = response.gather({
    input: 'speech',
    action: '/grievance/details',
    method: 'POST',
    timeout: 20,
    language: 'hi-IN',
    speechTimeout: 'auto',
  });

  gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
    `${categoryNames[category]} chunna gaya hai. ` +
    'Kripya apni poori shikayat bataiye. Dhyan se suniye, recording ho rahi hai.'
  );

  response.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'Koi jawab nahi mila.');
  response.redirect({ method: 'POST' }, '/voice');

  res.type('text/xml').send(response.toString());
});

// ------------------------------------------------------------------
//  POST /grievance/details — Record grievance details
// ------------------------------------------------------------------
router.post('/details', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  const from = req.body.From || '';
  const speech = req.body.SpeechResult || '';

  const session = getSession(callSid);
  if (!session) {
    response.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'Session expire ho gayi.');
    response.redirect({ method: 'POST' }, '/voice');
    return res.type('text/xml').send(response.toString());
  }

  logCall(callSid, 'grievance_details', { category: session.grievanceCategory, speech });

  const phone = from.replace('whatsapp:', '').replace('+91', '');
  let worker = await Worker.findOne({ phone });

  // Auto-register if new
  if (!worker) {
    worker = new Worker({ phone, name: 'IVR Worker', registeredVia: 'ivr' });
    await worker.save();
  }

  // Use AI to draft formal grievance
  const formalDraft = await groq.prompt(
    `You are a labour rights paralegal. Convert this worker's Hindi complaint into a formal grievance.
Return JSON: {"title": "brief title in English", "description": "detailed description in Hindi/English mix", "urgency": "HIGH/MEDIUM/LOW", "suggestedPortal": "PG_PORTAL/CPGRAMS/LABOUR_COMMISSION/BMC/RTI"}`,
    `Category: ${session.grievanceCategory}. Worker complaint: ${speech}`,
    { temperature: 0.3, maxTokens: 200 }
  );

  let parsed;
  try {
    parsed = JSON.parse(formalDraft);
  } catch {
    parsed = {
      title: `${session.grievanceCategory} Grievance`,
      description: speech,
      urgency: 'MEDIUM',
      suggestedPortal: 'LABOUR_COMMISSION',
    };
  }

  const caseId = generateCaseId('GRV');

  const grievance = new Grievance({
    caseId,
    workerId: worker._id,
    workerPhone: phone,
    category: session.grievanceCategory,
    title: parsed.title,
    description: parsed.description,
    urgency: parsed.urgency,
    suggestedPortal: parsed.suggestedPortal,
    rawTranscript: speech,
    status: 'FILED',
    filedVia: 'ivr',
    timeline: [{ action: 'FILED', detail: 'Filed via IVR', timestamp: new Date() }],
  });
  await grievance.save();

  // Anchor on blockchain
  try {
    await blockchain.fileGrievance(phone, caseId, parsed.title);
  } catch (err) {
    logCall(callSid, 'blockchain_grievance_error', { error: err.message });
  }

  // Read back the case ID letter by letter for clarity
  const spokenCaseId = caseId.split('').join(' ');

  response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
    `Aapki shikayat darj ho gayi hai. ` +
    `Case number: ${spokenCaseId}. ` +
    (parsed.urgency === 'HIGH'
      ? 'Yeh urgent case hai, jaldi action hoga. '
      : '') +
    `${parsed.suggestedPortal} mein file kiya jaayega. ` +
    'Blockchain pe proof save ho gaya hai. WhatsApp pe status milega. Dhanyavaad.'
  );

  response.redirect({ method: 'POST' }, '/voice');
  res.type('text/xml').send(response.toString());
});

// ------------------------------------------------------------------
//  GET /grievance/status/:caseId — Check grievance status (API)
// ------------------------------------------------------------------
router.get('/status/:caseId', async (req, res) => {
  try {
    const grievance = await Grievance.findOne({ caseId: req.params.caseId });
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }
    res.json({
      caseId: grievance.caseId,
      category: grievance.category,
      title: grievance.title,
      status: grievance.status,
      urgency: grievance.urgency,
      suggestedPortal: grievance.suggestedPortal,
      timeline: grievance.timeline,
      createdAt: grievance.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
//  GET /grievance/list — List all grievances (NGO dashboard API)
// ------------------------------------------------------------------
router.get('/list', async (req, res) => {
  try {
    const { status, category, urgency, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (urgency) filter.urgency = urgency;

    const grievances = await Grievance.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Grievance.countDocuments(filter);

    res.json({ grievances, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
