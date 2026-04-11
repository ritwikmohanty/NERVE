/**
 * Internal Event Bridge — /internal
 * Receives cross-server events (IVR → WhatsApp).
 */

const express = require('express');
const router = express.Router();
const { logMessage } = require('../../shared/utils/logger');

// POST /internal/event — Receive event from IVR or other servers
router.post('/event', (req, res) => {
  try {
    const { type, phone, data, source, timestamp } = req.body;
    logMessage(phone || 'system', `bridge_event:${type}`, { source, data });

    // TODO: Process events (e.g., IVR call completed → update WhatsApp session)
    // For now, just acknowledge
    res.json({ success: true, received: type, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
