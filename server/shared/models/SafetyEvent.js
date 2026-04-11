/**
 * SafetyEvent Model
 * Covers: heat complaints, SOS, accidents, housing grievances, BOCW claims.
 */

const mongoose = require('mongoose');

const safetyEventSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['heat_complaint', 'symptom_report', 'sos', 'accident', 'safety_check', 'housing_grievance', 'bocw_claim'],
  },
  phone: { type: String, required: true, index: true },
  workerId: { type: String, default: null },
  workerName: { type: String, default: null },
  site: { type: String, default: null },
  pinCode: { type: String, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  severity: { type: String, enum: ['mild', 'moderate', 'severe', 'critical', null], default: null },
  alertLevel: { type: String, enum: ['SAFE', 'YELLOW', 'ORANGE', 'RED', null], default: null },
  status: { type: String, default: 'recorded', enum: ['recorded', 'in_progress', 'resolved', 'escalated'] },
  resolvedAt: { type: Date, default: null },
  mediaUrls: [{ type: String }],
  pdfUrl: { type: String, default: null },
  escalatedToAgent4: { type: Boolean, default: false },
}, { timestamps: true });

safetyEventSchema.index({ type: 1, createdAt: -1 });
safetyEventSchema.index({ site: 1, type: 1, createdAt: -1 });
safetyEventSchema.index({ pinCode: 1, type: 1 });

module.exports = mongoose.model('SafetyEvent', safetyEventSchema);
