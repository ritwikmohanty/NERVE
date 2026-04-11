/**
 * SkillProgress Mongoose Model
 * Tracks worker progress through micro-lessons, quizzes, and certifications (Agent 5).
 */

const mongoose = require('mongoose');

const quizScoreSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  score: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const skillProgressSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  skillKey: { type: String, required: true },
  currentDay: { type: Number, default: 1 },
  quizScores: [quizScoreSchema],
  totalScore: { type: Number, default: 0 },
  certified: { type: Boolean, default: false },
  certHash: { type: String, default: null },    // on-chain cert hash
  certIssuedAt: { type: Date, default: null },
}, { timestamps: true });

skillProgressSchema.index({ phone: 1, skillKey: 1 }, { unique: true });

module.exports = mongoose.model('SkillProgress', skillProgressSchema);
