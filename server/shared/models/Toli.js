/**
 * Toli (Worker Gang / Group) Mongoose Model
 * Maps supervisor toli to workers for collective operations.
 */

const mongoose = require('mongoose');

const toliSchema = new mongoose.Schema({
  supervisorPhone: { type: String, required: true },
  toliName: { type: String, required: true },
  workerPhones: [{ type: String }],
  siteLocation: { type: String, default: null },
  city: { type: String, default: null },
  pinCode: { type: String, default: null },
  avgSwarajScore: { type: Number, default: 0 },
  isVirtualSabha: { type: Boolean, default: false },   // Virtual Toli Sabha for collective bargaining
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

toliSchema.index({ toliName: 1, supervisorPhone: 1 });
toliSchema.index({ supervisorPhone: 1 });
toliSchema.index({ pinCode: 1 });

module.exports = mongoose.model('Toli', toliSchema);
