/**
 * Conversation State Manager
 * In-memory session state for active calls/messages.
 */

const activeSessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

function getSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session && Date.now() - session.lastActivity > SESSION_TTL) {
    activeSessions.delete(sessionId);
    return null;
  }
  if (session) session.lastActivity = Date.now();
  return session || null;
}

function createSession(sessionId, data = {}) {
  const session = {
    sessionId,
    step: 'IDLE',
    activeAgent: null,
    data: {},
    conversationHistory: [],
    lastActivity: Date.now(),
    ...data,
  };
  activeSessions.set(sessionId, session);
  return session;
}

function updateSession(sessionId, updates) {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  Object.assign(session, updates, { lastActivity: Date.now() });
  return session;
}

function deleteSession(sessionId) {
  activeSessions.delete(sessionId);
}

function addToHistory(sessionId, role, content) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.conversationHistory.push({ role, content, timestamp: new Date() });
    session.lastActivity = Date.now();
  }
}

function getAllActiveSessions() {
  const now = Date.now();
  const active = [];
  for (const [id, session] of activeSessions) {
    if (now - session.lastActivity > SESSION_TTL) {
      activeSessions.delete(id);
    } else {
      active.push({ ...session, duration: Math.floor((now - session.lastActivity) / 1000) });
    }
  }
  return active;
}

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeSessions) {
    if (now - session.lastActivity > SESSION_TTL) {
      activeSessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  getSession,
  createSession,
  updateSession,
  deleteSession,
  addToHistory,
  getAllActiveSessions,
};
