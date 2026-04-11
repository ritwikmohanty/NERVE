/**
 * Agent 1: Chowk Smart Matcher — Job Finder
 * 
 * Matches workers to contractor demands using Swaraj Score,
 * skills, location, and real-time availability.
 */

const groq = require('../../shared/services/groqService');
const { updateSession } = require('../../shared/services/conversationState');
const { logAgent } = require('../../shared/utils/logger');
const Worker = require('../../shared/models/Worker');
const Job = require('../../shared/models/Job');
const Contractor = require('../../shared/models/Contractor');

const SYSTEM_PROMPT = `You are the Chowk Smart Matcher (Kaam Dhundo Agent) — an AI job finder for Indian informal workers.
You speak Hindi/Hinglish naturally and warmly. You help workers find verified daily-wage jobs.

Your flow:
1. Ask what type of work they want (construction, painting, plumbing, driving, etc.)
2. Ask their location / preferred area
3. Match them against available jobs using their Swaraj Score
4. Present 3-5 best matches with: site name, daily wage, contractor info, score match %
5. If they say "Accept" → confirm the booking

Always mention the wage rate is locked (Labour Code compliant).
Be brief, warm, and actionable. Use emojis sparingly.
If no jobs found, say you'll alert them when matching jobs appear.`;

async function handle(phone, message, session) {
  logAgent('JOB_FINDER', phone, 'processing', { message: message.substring(0, 100) });

  try {
    // Build context from worker profile
    let workerContext = '';
    const worker = await Worker.findOne({ phone }).catch(() => null);
    if (worker) {
      workerContext = `\nWorker Profile: ${worker.name}, ${worker.city}, Skills: ${worker.workType}, Swaraj Score: ${worker.swarajScore}/1000`;
    }

    // Check available jobs
    let jobContext = '';
    const activeJobs = await Job.find({ status: 'active' }).limit(10).catch(() => []);
    if (activeJobs.length > 0) {
      jobContext = '\nAvailable Jobs:\n' + activeJobs.map((j, i) =>
        `${i + 1}. ${j.skill} at ${j.site || j.city} — ₹${j.budget}/day, ${j.count} workers needed`
      ).join('\n');
    }

    // Get conversation history
    const history = (session.conversationHistory || []).slice(-6).map(h => ({
      role: h.role, content: h.content,
    }));

    const response = await groq.chat(
      SYSTEM_PROMPT + workerContext + jobContext,
      [...history, { role: 'user', content: message }],
      { temperature: 0.7, maxTokens: 400 }
    );

    return response;
  } catch (err) {
    logAgent('JOB_FINDER', phone, 'error', { error: err.message });
    return '🔧 Job finder mein dikkat hai. Kripya "menu" type karein aur dobara try karein.';
  }
}

module.exports = { handle };
