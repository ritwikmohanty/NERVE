/**
 * IVR Worker Route — /worker
 * 
 * Worker-specific IVR flows: registration, daily work log,
 * dispute filing, profile summary.
 */

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const Worker = require('../../shared/models/Worker');
const Job = require('../../shared/models/Job');
const Dispute = require('../../shared/models/Dispute');
const groq = require('../../shared/services/groqService');
const blockchain = require('../../shared/services/blockchainService');
const { generateCaseId } = require('../../shared/services/caseGenerator');
const {
  getSession, createSession, updateSession, addToHistory,
} = require('../../shared/services/conversationState');
const { sanitizeForTwiML } = require('../../shared/utils/twimlHelpers');
const { logCall } = require('../../shared/utils/logger');

// ------------------------------------------------------------------
//  POST /worker/register — Voice-based worker registration
// ------------------------------------------------------------------
router.post('/register', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  const from = req.body.From || '';
  const speech = req.body.SpeechResult || '';
  const digits = req.body.Digits || '';

  let session = getSession(callSid);
  if (!session) {
    session = createSession(callSid, {
      type: 'voice',
      phone: from,
      flow: 'REGISTRATION',
      step: 'ASK_NAME',
    });
  }

  logCall(callSid, 'register_step', { step: session.step, speech, digits });

  switch (session.step) {
    case 'ASK_NAME': {
      updateSession(callSid, { step: 'WAIT_NAME' });
      const gather = response.gather({
        input: 'speech',
        action: '/worker/register',
        method: 'POST',
        timeout: 8,
        language: 'hi-IN',
        speechTimeout: 'auto',
      });
      gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
        'Apka Swaraj ID mein swagat hai. Pehle apna naam bataiye.'
      );
      break;
    }

    case 'WAIT_NAME': {
      updateSession(callSid, { name: speech, step: 'WAIT_SKILL' });
      const gather = response.gather({
        input: 'speech',
        action: '/worker/register',
        method: 'POST',
        timeout: 8,
        language: 'hi-IN',
        speechTimeout: 'auto',
      });
      gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
        `Dhanyavaad ${speech}. Aap kya kaam karte hain? Jaise mistri, carpenter, painter.`
      );
      break;
    }

    case 'WAIT_SKILL': {
      updateSession(callSid, { skill: speech, step: 'WAIT_LOCATION' });
      const gather = response.gather({
        input: 'speech',
        action: '/worker/register',
        method: 'POST',
        timeout: 8,
        language: 'hi-IN',
        speechTimeout: 'auto',
      });
      gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
        'Aap kahan rehte hain? Apna shehar ya ilaka bataiye.'
      );
      break;
    }

    case 'WAIT_LOCATION': {
      updateSession(callSid, { location: speech, step: 'CONFIRM' });
      const s = getSession(callSid);
      const gather = response.gather({
        numDigits: 1,
        action: '/worker/register',
        method: 'POST',
        timeout: 8,
        language: 'hi-IN',
      });
      gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
        `Naam: ${s.name}. Kaam: ${s.skill}. Jagah: ${s.location}. ` +
        'Sahi hai toh 1 dabayein. Dobara shuru karne ke liye 2 dabayein.'
      );
      break;
    }

    case 'CONFIRM': {
      if (digits === '2') {
        updateSession(callSid, { step: 'ASK_NAME' });
        response.redirect({ method: 'POST' }, '/worker/register');
        break;
      }

      const s = getSession(callSid);
      try {
        const phone = s.phone.replace('whatsapp:', '').replace('+91', '');

        let worker = await Worker.findOne({ phone });
        if (!worker) {
          worker = new Worker({
            phone,
            name: s.name,
            skills: [s.skill],
            location: s.location,
            language: 'hi',
            registeredVia: 'ivr',
          });
        } else {
          worker.name = s.name;
          if (!worker.skills.includes(s.skill)) worker.skills.push(s.skill);
          worker.location = s.location;
        }
        await worker.save();

        // Register on blockchain
        try {
          await blockchain.registerWorker(phone, s.name, [s.skill]);
        } catch (err) {
          logCall(callSid, 'blockchain_error', { error: err.message });
        }

        response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
          `${s.name}, aapka Swaraj ID ban gaya hai! ` +
          'Aap ab WhatsApp pe bhi madad le sakte hain. Dhanyavaad.'
        );
      } catch (err) {
        logCall(callSid, 'register_error', { error: err.message });
        response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
          'Maaf kijiye, registration mein dikkat aayi. Kripya dobara call karein.'
        );
      }
      break;
    }

    default:
      updateSession(callSid, { step: 'ASK_NAME' });
      response.redirect({ method: 'POST' }, '/worker/register');
  }

  res.type('text/xml').send(response.toString());
});

// ------------------------------------------------------------------
//  POST /worker/log — Daily work log
// ------------------------------------------------------------------
router.post('/log', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  const from = req.body.From || '';
  const speech = req.body.SpeechResult || '';
  const digits = req.body.Digits || '';

  let session = getSession(callSid);
  if (!session || session.flow !== 'WORK_LOG') {
    createSession(callSid, {
      type: 'voice',
      phone: from,
      flow: 'WORK_LOG',
      step: 'ASK_HOURS',
    });
    session = getSession(callSid);
  }

  logCall(callSid, 'work_log_step', { step: session.step, speech, digits });

  const phone = from.replace('whatsapp:', '').replace('+91', '');
  const worker = await Worker.findOne({ phone });

  if (!worker) {
    response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
      'Pehle apna registration karein. Main aapko registration pe le ja raha hoon.'
    );
    response.redirect({ method: 'POST' }, '/worker/register');
    return res.type('text/xml').send(response.toString());
  }

  switch (session.step) {
    case 'ASK_HOURS': {
      updateSession(callSid, { step: 'WAIT_HOURS' });
      const gather = response.gather({
        input: 'speech dtmf',
        action: '/worker/log',
        method: 'POST',
        timeout: 8,
        language: 'hi-IN',
        speechTimeout: 'auto',
      });
      gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
        `Namaste ${worker.name}! Aaj kitne ghante kaam kiya?`
      );
      break;
    }

    case 'WAIT_HOURS': {
      const hours = parseInt(digits || speech.replace(/[^\d]/g, '')) || 0;
      updateSession(callSid, { hours, step: 'WAIT_WAGE' });
      const gather = response.gather({
        input: 'speech dtmf',
        action: '/worker/log',
        method: 'POST',
        timeout: 8,
        language: 'hi-IN',
        speechTimeout: 'auto',
      });
      gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
        `${hours} ghante. Kitni mazdoori mili? Rupees mein bataiye.`
      );
      break;
    }

    case 'WAIT_WAGE': {
      const wage = parseInt(digits || speech.replace(/[^\d]/g, '')) || 0;
      const s = getSession(callSid);

      // Log work entry
      worker.workLog.push({
        date: new Date(),
        hoursWorked: s.hours,
        wageEarned: wage,
        verified: false,
      });
      await worker.save();

      // Log on blockchain
      try {
        await blockchain.logJobCompletion(phone, 'daily-work', wage, s.hours);
      } catch (err) {
        logCall(callSid, 'blockchain_log_error', { error: err.message });
      }

      response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
        `Darz kiya gaya: ${s.hours} ghante, ₹${wage}. ` +
        'Aapka record safe hai. Dhanyavaad!'
      );
      response.redirect({ method: 'POST' }, '/voice');
      break;
    }

    default:
      updateSession(callSid, { step: 'ASK_HOURS' });
      response.redirect({ method: 'POST' }, '/worker/log');
  }

  res.type('text/xml').send(response.toString());
});

// ------------------------------------------------------------------
//  POST /worker/dispute — File wage dispute via voice
// ------------------------------------------------------------------
router.post('/dispute', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const callSid = req.body.CallSid;
  const from = req.body.From || '';
  const speech = req.body.SpeechResult || '';

  let session = getSession(callSid);
  if (!session || session.flow !== 'DISPUTE') {
    createSession(callSid, {
      type: 'voice',
      phone: from,
      flow: 'DISPUTE',
      step: 'ASK_ISSUE',
    });
    session = getSession(callSid);
  }

  const phone = from.replace('whatsapp:', '').replace('+91', '');
  const worker = await Worker.findOne({ phone });

  if (!worker) {
    response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
      'Pehle registration karein.'
    );
    response.redirect({ method: 'POST' }, '/worker/register');
    return res.type('text/xml').send(response.toString());
  }

  switch (session.step) {
    case 'ASK_ISSUE': {
      updateSession(callSid, { step: 'WAIT_ISSUE' });
      const gather = response.gather({
        input: 'speech',
        action: '/worker/dispute',
        method: 'POST',
        timeout: 15,
        language: 'hi-IN',
        speechTimeout: 'auto',
      });
      gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
        `${worker.name}, apni shikayat bataiye. Kya hua? Kitne paise baki hain?`
      );
      break;
    }

    case 'WAIT_ISSUE': {
      // Use AI to extract dispute details from speech
      const extraction = await groq.prompt(
        'Extract dispute details from this Hindi speech. Return JSON: {"amount": number, "days": number, "description": "brief Hindi summary"}. If info unclear, estimate.',
        speech,
        { temperature: 0.3, maxTokens: 100 }
      );

      let details;
      try {
        details = JSON.parse(extraction);
      } catch {
        details = { amount: 0, days: 0, description: speech };
      }

      const caseId = generateCaseId('DSP');

      const dispute = new Dispute({
        caseId,
        workerId: worker._id,
        workerPhone: phone,
        description: details.description || speech,
        amount: details.amount || 0,
        unpaidDays: details.days || 0,
        status: 'FILED',
        filedVia: 'ivr',
      });
      await dispute.save();

      // Anchor on blockchain
      try {
        await blockchain.anchorWageProof(phone, caseId, details.amount || 0, details.days || 0);
      } catch (err) {
        logCall(callSid, 'blockchain_dispute_error', { error: err.message });
      }

      response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
        `Aapki shikayat darj ho gayi hai. Case ID: ${caseId.split('').join(' ')}. ` +
        'Blockchain pe proof save hua hai. Aapko WhatsApp pe update milega.'
      );
      response.redirect({ method: 'POST' }, '/voice');
      break;
    }

    default:
      updateSession(callSid, { step: 'ASK_ISSUE' });
      response.redirect({ method: 'POST' }, '/worker/dispute');
  }

  res.type('text/xml').send(response.toString());
});

// ------------------------------------------------------------------
//  POST /worker/summary — Get worker profile summary
// ------------------------------------------------------------------
router.post('/summary', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const from = req.body.From || '';
  const phone = from.replace('whatsapp:', '').replace('+91', '');

  const worker = await Worker.findOne({ phone });
  if (!worker) {
    response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
      'Aapka account nahi mila. Pehle registration karein.'
    );
    response.redirect({ method: 'POST' }, '/worker/register');
    return res.type('text/xml').send(response.toString());
  }

  const totalWage = (worker.workLog || []).reduce((s, e) => s + (e.wageEarned || 0), 0);
  const totalDays = (worker.workLog || []).length;
  const score = worker.swarajScore || 0;

  response.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
    `${worker.name}, aapka Swaraj Score ${score} hai. ` +
    `Aapne ${totalDays} din kaam kiya hai aur kul ₹${totalWage} kamaya hai. ` +
    `Aapki skills: ${(worker.skills || []).join(', ') || 'koi skill nahi'}. ` +
    'Menu ke liye koi bhi button dabayein.'
  );
  response.redirect({ method: 'POST' }, '/voice');

  res.type('text/xml').send(response.toString());
});

module.exports = router;
