/**
 * Dispute Mongoose Model
 * Wage dispute / missing wages records.
 */

const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  disputeId: { type: String, required: true, unique: true },
  workerId: { type: String, required: true },
  workerName: { type: String, required: true },
  phone: { type: String, required: true },
  contractorId: { type: String, default: null },
  contractorPhone: { type: String, default: null },
  unpaidDays: { type: Number, required: true },
  totalDues: { type: Number, required: true },
  avgRate: { type: Number, required: true },
  status: { type: String, default: 'open', enum: ['open', 'notice_sent', 'escalated', 'resolved', 'closed'] },
  complaintDraft: { type: String, default: null },
  pdfUrl: { type: String, default: null },

  // Collective grievance linking
  isCollective: { type: Boolean, default: false },
  collectiveGrievanceId: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

disputeSchema.index({ status: 1 });
disputeSchema.index({ contractorId: 1, status: 1 });
disputeSchema.index({ phone: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);
