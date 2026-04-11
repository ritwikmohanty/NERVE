/**
 * Contractor Mongoose Model
 * Contractor profiles with Trust Score + hiring history.
 */

const mongoose = require('mongoose');

const contractorSchema = new mongoose.Schema({
  contractorId: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  company: { type: String, default: null },
  city: { type: String, required: true },

  // Thekedar Trust Score (0–100)
  trustScore: { type: Number, default: 50 },
  trustScoreFactors: {
    avgWorkerRating: { type: Number, default: 0 },       // from workers
    grievanceCount: { type: Number, default: 0 },         // anonymised
    paymentConsistency: { type: Number, default: 100 },   // % on-time
    retentionRate: { type: Number, default: 0 },          // % high-score workers retained
  },

  // Badge system
  badge: { type: String, default: null, enum: [null, 'Trusted', 'Verified', 'Premium'] },
  verifiedByWorkers: { type: Number, default: 0 },

  // Funding eligibility (based on Trust Score)
  fundingEligible: { type: Boolean, default: false },
  creditLimit: { type: Number, default: 0 },

  // Active workers (toli management)
  activeWorkers: [{
    workerId: { type: String },
    phone: { type: String },
    name: { type: String },
    swarajScore: { type: Number },
    hiredAt: { type: Date, default: Date.now },
    status: { type: String, default: 'active', enum: ['active', 'completed', 'released'] },
  }],

  // Payment tracking
  totalWagesPaid: { type: Number, default: 0 },
  pendingPayments: { type: Number, default: 0 },
  paymentHistory: [{
    workerId: { type: String },
    amount: { type: Number },
    date: { type: Date },
    status: { type: String, enum: ['paid', 'pending', 'overdue'] },
  }],

  walletAddress: { type: String, default: null },
  registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

contractorSchema.index({ city: 1, trustScore: -1 });
contractorSchema.index({ phone: 1 });

module.exports = mongoose.model('Contractor', contractorSchema);
