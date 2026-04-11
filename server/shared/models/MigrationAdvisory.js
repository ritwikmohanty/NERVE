/**
 * MigrationAdvisory Mongoose Model
 * Stores migration predictions and labour hostel data.
 */

const mongoose = require('mongoose');

const migrationAdvisorySchema = new mongoose.Schema({
  city: { type: String, required: true },
  pinCode: { type: String, default: null },
  skill: { type: String, required: true },
  demandCount: { type: Number, default: 0 },        // verified openings
  avgDailyWage: { type: Number, default: 0 },
  topContractors: [{ contractorId: String, name: String, trustScore: Number }],
  hostels: [{
    name: { type: String },
    address: { type: String },
    pricePerNight: { type: Number },
    verified: { type: Boolean, default: false },
    ashaLinked: { type: Boolean, default: false },
    capacity: { type: Number, default: 0 },
  }],
  alerts: [{ type: String }],    // heat wave, pollution, etc.
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date },
}, { timestamps: true });

migrationAdvisorySchema.index({ city: 1, skill: 1 });

module.exports = mongoose.model('MigrationAdvisory', migrationAdvisorySchema);
