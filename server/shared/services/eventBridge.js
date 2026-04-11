/**
 * Event Bridge Service
 * Cross-server event communication (IVR → WhatsApp and vice versa).
 */

const EVENT_LOG = [];

/**
 * Send an event to another server via HTTP POST.
 * @param {string} targetUrl - Full URL (e.g., http://localhost:3001/internal/event)
 * @param {object} eventData - { type, phone, data }
 */
async function sendEvent(targetUrl, eventData) {
  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...eventData,
        timestamp: new Date().toISOString(),
        source: eventData.source || 'unknown',
      }),
    });
    const result = await resp.json();
    EVENT_LOG.push({ ...eventData, status: 'sent', timestamp: new Date() });
    return result;
  } catch (err) {
    console.error('[EventBridge] Send error:', err.message);
    EVENT_LOG.push({ ...eventData, status: 'failed', error: err.message, timestamp: new Date() });
    return null;
  }
}

/**
 * Bridge an event from IVR to WhatsApp server.
 */
async function bridgeToWhatsApp(eventData) {
  const port = process.env.WHATSAPP_PORT || 3001;
  return sendEvent(`http://localhost:${port}/internal/event`, {
    ...eventData,
    source: 'ivr',
  });
}

/**
 * Bridge an event from WhatsApp to IVR server.
 */
async function bridgeToIVR(eventData) {
  const port = process.env.IVR_PORT || 3003;
  return sendEvent(`http://localhost:${port}/internal/event`, {
    ...eventData,
    source: 'whatsapp',
  });
}

function getEventLog() {
  return EVENT_LOG.slice(-100); // last 100 events
}

module.exports = { sendEvent, bridgeToWhatsApp, bridgeToIVR, getEventLog };
