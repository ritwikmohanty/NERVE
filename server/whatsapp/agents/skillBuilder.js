/**
 * Agent 5: Skill Builder
 * 
 * Skill assessment, micro-lessons, quizzes, certifications,
 * on-chain SkillCert NFT, job-match after upgrade.
 */

const groq = require('../../shared/services/groqService');
const { logAgent } = require('../../shared/utils/logger');
const Worker = require('../../shared/models/Worker');
const SkillProgress = require('../../shared/models/SkillProgress');

const SYSTEM_PROMPT = `You are the Skill Builder (Seekho Agent) — an AI trainer for Indian informal workers.
You speak Hindi/Hinglish naturally.

Your capabilities:
1. SKILL ASSESSMENT: Evaluate current skill level
2. MICRO-LESSONS: 5-day skill courses (Masonry, Carpentry, Plumbing, Electrical, Driving)
3. DAILY QUIZ: Test understanding after each lesson
4. CERTIFICATION: Issue digital certificate after passing all quizzes
5. JOB MATCH: Connect certified workers to higher-paying jobs

Available Courses:
- Masonry (Raajgiri): Foundation, brickwork, plastering
- Carpentry (Badhaaigiri): Measuring, cutting, joinery
- Plumbing (Plumber): Pipe fitting, drainage, fixtures
- Electrical (Bijli): Wiring, switches, safety
- Driving (Driving): License prep, vehicle maintenance

Flow:
- "Naya kaam seekhna hai" → Show available courses
- "Masonry start" → Begin Day 1 lesson
- After each lesson → Quiz (3 questions)
- Pass 5 days → Certificate issued → Swaraj Score boost

Be encouraging and patient. Use simple language. Celebrate progress.`;

async function handle(phone, message, session) {
  logAgent('SKILL_BUILDER', phone, 'processing', { message: message.substring(0, 100) });

  try {
    let context = '';
    const worker = await Worker.findOne({ phone }).catch(() => null);
    if (worker) {
      context = `\nWorker: ${worker.name}, Skills: ${worker.skills?.join(', ') || 'none listed'}`;
    }

    // Check existing skill progress
    const progress = await SkillProgress.find({ phone }).catch(() => []);
    if (progress.length > 0) {
      context += `\nSkill Progress:\n${progress.map(p =>
        `- ${p.skillKey}: Day ${p.currentDay}/5, Score: ${p.totalScore}, Certified: ${p.certified}`
      ).join('\n')}`;
    }

    const history = (session.conversationHistory || []).slice(-6).map(h => ({
      role: h.role, content: h.content,
    }));

    const response = await groq.chat(
      SYSTEM_PROMPT + context,
      [...history, { role: 'user', content: message }],
      { temperature: 0.7, maxTokens: 400 }
    );

    return response;
  } catch (err) {
    logAgent('SKILL_BUILDER', phone, 'error', { error: err.message });
    return '📚 Skill builder mein dikkat hai. Kripya thodi der mein dobara try karein.';
  }
}

module.exports = { handle };
