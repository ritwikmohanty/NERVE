/**
 * Job Mongoose Model
 * Contractor demand / Chowk Smart Matcher allocation records.
 */

const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
  workerId: { type: String, required: true },
  phone: { type: String, required: true },
  name: { type: String, required: true },
  swarajScore: { type: Number, default: 0 },
  scoreMatch: { type: Number, default: 0 },  // match percentage
  status: { type: String, default: 'pending', enum: ['pending', 'accepted', 'rejected', 'aadhaar_verified'] },
  notifiedAt: { type: Date, default: Date.now },
  repliedAt: { type: Date, default: null },
}, { _id: false });

const jobSchema = new mongoose.Schema({
  contractorId: { type: String, required: true },
  contractorPhone: { type: String, default: null },
  contractorName: { type: String, default: null },
  city: { type: String, required: true },
  pinCode: { type: String, default: null },
  site: { type: String, default: null },
  skill: { type: String, required: true },
  budget: { type: Number, required: true },    // daily wage offered ₹
  count: { type: Number, required: true },      // workers needed
  workers: [allocationSchema],
  status: { type: String, default: 'active', enum: ['active', 'filled', 'cancelled', 'completed'] },
  jobDate: { type: String, default: null },     // YYYY-MM-DD
  supervisorPhone: { type: String, default: null },
  toliGroupCreated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

jobSchema.index({ contractorId: 1 });
jobSchema.index({ status: 1, city: 1, skill: 1 });
jobSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
