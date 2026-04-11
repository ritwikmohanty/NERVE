/**
 * Worker API Routes — /api/worker
 * REST endpoints for worker profiles (used by dashboards).
 */

const express = require('express');
const router = express.Router();
const Worker = require('../../shared/models/Worker');
const blockchain = require('../../shared/services/blockchainService');

// GET /api/worker — List all workers (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const city = req.query.city;
    const skill = req.query.skill;

    const filter = {};
    if (city) filter.city = new RegExp(city, 'i');
    if (skill) filter.workType = new RegExp(skill, 'i');

    const workers = await Worker.find(filter)
      .sort({ swarajScore: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-workLog -ratings');

    const total = await Worker.countDocuments(filter);

    res.json({ success: true, count: workers.length, total, page, workers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/worker/:id — Get worker by ID or phone
router.get('/:id', async (req, res) => {
  try {
    const worker = await Worker.findOne({
      $or: [{ workerId: req.params.id }, { phone: req.params.id }],
    });
    if (!worker) return res.status(404).json({ success: false, error: 'Worker not found' });
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/worker/:id/blockchain — Get on-chain profile
router.get('/:id/blockchain', async (req, res) => {
  try {
    const worker = await Worker.findOne({
      $or: [{ workerId: req.params.id }, { phone: req.params.id }],
    });
    if (!worker) return res.status(404).json({ success: false, error: 'Worker not found' });

    const profile = await blockchain.getWorkerProfile(worker.phone);
    res.json({ success: true, blockchain: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/worker/stats/overview — Aggregate stats
router.get('/stats/overview', async (req, res) => {
  try {
    const totalWorkers = await Worker.countDocuments();
    const avgScore = await Worker.aggregate([
      { $group: { _id: null, avg: { $avg: '$swarajScore' } } },
    ]);
    const byCity = await Worker.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      totalWorkers,
      avgSwarajScore: avgScore[0]?.avg || 0,
      topCities: byCity,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
