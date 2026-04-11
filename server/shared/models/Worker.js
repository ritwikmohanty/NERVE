/**
 * Worker Mongoose Model
 * Core worker profile with Swaraj Score, work log, ratings, and zk-proof references.
 */

const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  skillTag: { type: String, default: 'General' },
  skillScore: { type: Number, required: true },
  safetyScore: { type: Number, default: null },
  date: { type: String, required: true },
  supervisorPhone: { type: String, default: null },
  toliName: { type: String, default: null },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const workLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  hours: { type: Number, required: true },
  rate: { type: Number, required: true },
  earned: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  contractorId: { type: String, default: null },
  loggedAt: { type: Date, default: Date.now },
}, { _id: false });

const schemeApplicationSchema = new mongoose.Schema({
  schemeName: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'submitted', 'approved', 'rejected'] },
  zkProofHash: { type: String, default: null },
  appliedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
}, { _id: false });

const workerSchema = new mongoose.Schema({
  workerId: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true, default: 'Unknown' },
  city: { type: String, required: true, default: 'Unknown' },
  pinCode: { type: String, default: null },
  workType: { type: String, required: true, default: 'general' },
  skills: [{ type: String }],
  languages: [{ type: String, default: ['hindi'] }],
  walletAddress: { type: String, default: null },
  supervisorPhone: { type: String, default: null },
  toliName: { type: String, default: null },
  aadhaarLast4: { type: String, default: null },

  // Swaraj Score — on-chain mirrored, 0–1000
  swarajScore: { type: Number, default: 500 },

  // Availability for Chowk Smart Matcher
  available: { type: Boolean, default: false },
  availableFrom: { type: Date, default: null },
  preferredLocation: { type: String, default: null },

  // Work history
  ratings: [ratingSchema],
  workLog: [workLogSchema],
  disputes: [{ type: String }],
  schemeApplications: [schemeApplicationSchema],

  lastJobDate: { type: Date, default: null },
  registeredAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes for Chowk Smart Matcher: city + availability + score
workerSchema.index({ city: 1, available: 1, swarajScore: -1 });
workerSchema.index({ pinCode: 1, available: 1, swarajScore: -1 });
workerSchema.index({ city: 1, lastJobDate: 1, swarajScore: -1 });
workerSchema.index({ 'ratings.skillTag': 1 });
workerSchema.index({ phone: 1 });

module.exports = mongoose.model('Worker', workerSchema);
