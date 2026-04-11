/**
 * Session Mongoose Model
 * Persists conversation state (WhatsApp / IVR) across restarts.
 */

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['message', 'voice'] },
  step: { type: String, default: 'IDLE' },
  activeAgent: { type: String, default: null },  // Which of the 5 agents is active
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  conversationHistory: [{ role: String, content: String, timestamp: Date }],
  lastActivity: { type: Date, default: Date.now },
  ttl: { type: Number, default: 30 * 60 * 1000 },  // 30 min
}, { timestamps: true });

sessionSchema.index({ lastActivity: 1 });

module.exports = mongoose.model('Session', sessionSchema);
