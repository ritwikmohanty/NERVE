/**
 * NGO API Routes — /api/ngo
 * Impact Command Centre dashboard backend.
 */

const express = require('express');
const router = express.Router();
const Worker = require('../../shared/models/Worker');
const Grievance = require('../../shared/models/Grievance');
const Dispute = require('../../shared/models/Dispute');
const SafetyEvent = require('../../shared/models/SafetyEvent');
const Contractor = require('../../shared/models/Contractor');

// GET /api/ngo/dashboard — Impact Command Centre
router.get('/dashboard', async (req, res) => {
  try {
    const totalWorkers = await Worker.countDocuments();
    const totalGrievances = await Grievance.countDocuments();
    const totalDisputes = await Dispute.countDocuments();
    const totalSafetyEvents = await SafetyEvent.countDocuments();
    const resolvedDisputes = await Dispute.countDocuments({ status: 'resolved' });

    const wagesRecovered = await Dispute.aggregate([
      { $match: { status: 'resolved' } },
      { $group: { _id: null, total: { $sum: '$totalDues' } } },
    ]);

    const avgScore = await Worker.aggregate([
      { $group: { _id: null, avg: { $avg: '$swarajScore' } } },
    ]);

    res.json({
      success: true,
      metrics: {
        totalWorkers,
        totalGrievances,
        totalDisputes,
        resolvedDisputes,
        totalSafetyEvents,
        wagesRecovered: wagesRecovered[0]?.total || 0,
        avgSwarajScore: Math.round(avgScore[0]?.avg || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ngo/skill-disparity — Skill Gap Radar
router.get('/skill-disparity', async (req, res) => {
  try {
    const byPinCode = await Worker.aggregate([
      { $group: { _id: { pinCode: '$pinCode', workType: '$workType' }, count: { $sum: 1 }, avgScore: { $avg: '$swarajScore' } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    // Calculate skill surplus vs shortage
    const disparity = byPinCode.map(item => ({
      pinCode: item._id.pinCode || 'Unknown',
      skill: item._id.workType,
      workerCount: item.count,
      avgScore: Math.round(item.avgScore),
      status: item.count > 100 ? 'surplus' : item.count < 20 ? 'shortage' : 'balanced',
    }));

    res.json({ success: true, disparity });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ngo/anomalies — Anomaly Auditor
router.get('/anomalies', async (req, res) => {
  try {
    // Contractors with low trust scores but high active workers
    const suspiciousContractors = await Contractor.find({
      trustScore: { $lt: 40 },
      'activeWorkers.0': { $exists: true },
    }).select('contractorId name city trustScore');

    // Pin codes with high safety violations
    const safetyHotspots = await SafetyEvent.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: '$pinCode', count: { $sum: 1 }, types: { $push: '$type' } } },
      { $match: { count: { $gte: 5 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    // Collective grievances
    const collectiveGrievances = await Grievance.find({ isCollective: true, status: { $ne: 'closed' } })
      .sort({ reportCount: -1 })
      .limit(10);

    res.json({
      success: true,
      anomalies: {
        suspiciousContractors,
        safetyHotspots,
        collectiveGrievances,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ngo/heatmap — Heatmap data for visualization
router.get('/heatmap', async (req, res) => {
  try {
    const type = req.query.type || 'safety';  // safety | disputes | workers

    let data;
    if (type === 'safety') {
      data = await SafetyEvent.aggregate([
        { $group: { _id: { pinCode: '$pinCode', type: '$type' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
    } else if (type === 'disputes') {
      data = await Dispute.aggregate([
        { $lookup: { from: 'workers', localField: 'workerId', foreignField: 'workerId', as: 'worker' } },
        { $unwind: { path: '$worker', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$worker.pinCode', count: { $sum: 1 }, totalDues: { $sum: '$totalDues' } } },
        { $sort: { count: -1 } },
      ]);
    } else {
      data = await Worker.aggregate([
        { $group: { _id: '$pinCode', count: { $sum: 1 }, avgScore: { $avg: '$swarajScore' } } },
        { $sort: { count: -1 } },
      ]);
    }

    res.json({ success: true, type, heatmap: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
