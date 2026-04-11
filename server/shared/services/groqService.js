/**
 * Groq AI Service
 * Uses Llama 3.3 70B Versatile for all AI agent interactions.
 */

const Groq = require('groq-sdk');

const MODEL = 'llama-3.3-70b-versatile';
const MAX_RESPONSE_CHARS = 500;

let groqClient = null;

function getClient() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

/**
 * Generic chat completion with system prompt + conversation history.
 * @param {string} systemPrompt - System instructions
 * @param {Array} messages - [{ role: 'user'|'assistant', content: '...' }]
 * @param {object} options - { temperature, maxTokens }
 * @returns {string} AI response text
 */
async function chat(systemPrompt, messages, options = {}) {
  const client = getClient();
  if (!client) {
    return 'AI service is not configured. Please set GROQ_API_KEY.';
  }

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 512,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    let response = completion.choices?.[0]?.message?.content || '';

    // Trim to max chars for WhatsApp/voice readability
    if (response.length > MAX_RESPONSE_CHARS) {
      response = response.substring(0, MAX_RESPONSE_CHARS).replace(/\s+\S*$/, '') + '...';
    }

    return response;
  } catch (err) {
    console.error('[Groq] Chat error:', err.message);
    return 'Maaf kijiye, abhi AI service mein dikkat hai. Kripya thodi der baad koshish karein.';
  }
}

/**
 * Single-shot prompt (no history).
 */
async function prompt(systemPrompt, userMessage, options = {}) {
  return chat(systemPrompt, [{ role: 'user', content: userMessage }], options);
}

/**
 * Classify intent from user message using Groq.
 * Returns { agent, intent, confidence, language }.
 */
async function classifyIntent(userMessage) {
  const systemPrompt = `You are an intent classifier for an Indian labour platform.
Given a worker's message (in Hindi, Marathi, Bhojpuri, Bengali, Kannada, or English), classify it into one of these agents:

1. JOB_FINDER — "Kaam chahiye", "Job batao", "Aaj free hoon", "Kaam dhundo"
2. WAGE_PROTECTOR — "Paisa nahi mila", "Mazdoori nahi di", "Wages due", "Hisaab"
3. SAFETY_GUARDIAN — "Help", "Khatra", "Unsafe", "SOS", "Garmi", "Accident"
4. RIGHTS_ADVOCATE — "Mera haq", "Scheme", "RTI", "Shikayat", "Grievance", "Law"
5. SKILL_BUILDER — "Naya kaam seekhna hai", "Training", "Certificate", "Skill"
6. MIGRATION_ADVISOR — "Kahan jaaun", "Pune mein kaam", "Migration", "Hostel"
7. SCHEME_APPLY — "Bima chahiye", "Scheme apply", "Ayushman", "e-Shram", "BOCW"
8. REGISTRATION — "Register", "Naam likho", "New worker"
9. GENERAL — Greetings, unclear, or general queries

Respond ONLY in JSON: {"agent":"AGENT_NAME","intent":"specific_intent","confidence":0.0-1.0,"language":"detected_language"}`;

  try {
    const response = await prompt(systemPrompt, userMessage, { temperature: 0.1, maxTokens: 100 });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { agent: 'GENERAL', intent: 'unknown', confidence: 0.3, language: 'hindi' };
  } catch (err) {
    console.error('[Groq] Intent classification error:', err.message);
    return { agent: 'GENERAL', intent: 'error', confidence: 0, language: 'hindi' };
  }
}

module.exports = {
  chat,
  prompt,
  classifyIntent,
  getClient,
  MODEL,
};
