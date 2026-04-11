/**
 * Grievance Mongoose Model
 * Labour rights grievances — individual + collective (auto-filed).
 */

const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
  grievanceId: { type: String, required: true, unique: true },
  type: {
    type: String,
    required: true,
    enum: ['wage_theft', 'unsafe_site', 'harassment', 'rights_violation', 'scheme_denial', 'collective', 'rti'],
  },

  // Filed by (anonymised for collective)
  filedByPhone: { type: String, default: null },
  filedByWorkerId: { type: String, default: null },
  anonymous: { type: Boolean, default: false },

  // Collective grievance
  isCollective: { type: Boolean, default: false },
  pinCode: { type: String, default: null },
  reportCount: { type: Number, default: 1 },
  linkedDisputeIds: [{ type: String }],

  // Target
  contractorId: { type: String, default: null },
  site: { type: String, default: null },

  // Content
  description: { type: String, required: true },
  evidenceBundle: { type: mongoose.Schema.Types.Mixed, default: {} },
  pdfUrl: { type: String, default: null },

  // Filing status
  filedToPGPortal: { type: Boolean, default: false },
  filedToCPGRAMS: { type: Boolean, default: false },
  filedRTI: { type: Boolean, default: false },
  filedToLabourCommissioner: { type: Boolean, default: false },

  status: { type: String, default: 'open', enum: ['open', 'filed', 'in_progress', 'resolved', 'closed'] },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

grievanceSchema.index({ pinCode: 1, type: 1, status: 1 });
grievanceSchema.index({ contractorId: 1 });
grievanceSchema.index({ isCollective: 1, status: 1 });

module.exports = mongoose.model('Grievance', grievanceSchema);
