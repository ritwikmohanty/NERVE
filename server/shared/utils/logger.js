/**
 * Logger Utility
 * Structured logging for calls, messages, and errors.
 */

function logCall(callSid, event, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[CALL] ${timestamp} | ${callSid} | ${event}`, JSON.stringify(data));
}

function logMessage(from, event, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[MSG] ${timestamp} | ${from} | ${event}`, JSON.stringify(data));
}

function logTranscript(sessionId, role, text) {
  const timestamp = new Date().toISOString();
  console.log(`[TRANSCRIPT] ${timestamp} | ${sessionId} | ${role.toUpperCase()}: ${text}`);
}

function logError(contextId, error, err = null) {
  const timestamp = new Date().toISOString();
  console.error(`[ERROR] ${timestamp} | ${contextId || 'SYSTEM'} | ${error}`);
  if (err) console.error(err.stack || err);
}

function logAgent(agentName, phone, action, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[AGENT:${agentName}] ${timestamp} | ${phone} | ${action}`, JSON.stringify(data));
}

module.exports = { logCall, logMessage, logTranscript, logError, logAgent };
