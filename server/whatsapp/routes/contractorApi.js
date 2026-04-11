/**
 * Contractor API Routes — /api/contractor
 * Dashboard backend for contractors.
 */

const express = require('express');
const router = express.Router();
const Contractor = require('../../shared/models/Contractor');
const Job = require('../../shared/models/Job');
const Worker = require('../../shared/models/Worker');
const Dispute = require('../../shared/models/Dispute');

// GET /api/contractor — List contractors
router.get('/', async (req, res) => {
  try {
    const contractors = await Contractor.find()
      .sort({ trustScore: -1 })
      .limit(50)
      .select('-paymentHistory');
    res.json({ success: true, count: contractors.length, contractors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/contractor/:id — Contractor profile + trust score
router.get('/:id', async (req, res) => {
  try {
    const contractor = await Contractor.findOne({
      $or: [{ contractorId: req.params.id }, { phone: req.params.id }],
    });
    if (!contractor) return res.status(404).json({ success: false, error: 'Contractor not found' });
    res.json({ success: true, contractor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/contractor/:id/dashboard — Unified dashboard data
router.get('/:id/dashboard', async (req, res) => {
  try {
    const contractor = await Contractor.findOne({
      $or: [{ contractorId: req.params.id }, { phone: req.params.id }],
    });
    if (!contractor) return res.status(404).json({ success: false, error: 'Contractor not found' });

    const activeJobs = await Job.find({ contractorId: contractor.contractorId, status: 'active' });
    const disputes = await Dispute.find({ contractorId: contractor.contractorId, status: { $ne: 'closed' } });

    // Active workers across all jobs
    const activeWorkerIds = [];
    activeJobs.forEach(j => j.workers.forEach(w => {
      if (w.status === 'accepted') activeWorkerIds.push(w.workerId);
    }));

    res.json({
      success: true,
      trustScore: contractor.trustScore,
      badge: contractor.badge,
      activeJobs: activeJobs.length,
      activeWorkers: activeWorkerIds.length,
      openDisputes: disputes.length,
      totalWagesPaid: contractor.totalWagesPaid,
      pendingPayments: contractor.pendingPayments,
      fundingEligible: contractor.fundingEligible,
      creditLimit: contractor.creditLimit,
      jobs: activeJobs,
      workers: contractor.activeWorkers,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/contractor/:id/job — Post a new job requirement
router.post('/:id/job', async (req, res) => {
  try {
    const contractor = await Contractor.findOne({
      $or: [{ contractorId: req.params.id }, { phone: req.params.id }],
    });
    if (!contractor) return res.status(404).json({ success: false, error: 'Contractor not found' });

    const job = new Job({
      contractorId: contractor.contractorId,
      contractorPhone: contractor.phone,
      contractorName: contractor.name,
      city: req.body.city || contractor.city,
      pinCode: req.body.pinCode,
      site: req.body.site,
      skill: req.body.skill,
      budget: req.body.budget,
      count: req.body.count || 1,
      jobDate: req.body.jobDate,
      supervisorPhone: req.body.supervisorPhone,
    });

    await job.save();
    res.json({ success: true, message: 'Job posted', job });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/contractor/:id/payments — Payment history
router.get('/:id/payments', async (req, res) => {
  try {
    const contractor = await Contractor.findOne({
      $or: [{ contractorId: req.params.id }, { phone: req.params.id }],
    });
    if (!contractor) return res.status(404).json({ success: false, error: 'Contractor not found' });

    res.json({
      success: true,
      totalPaid: contractor.totalWagesPaid,
      pending: contractor.pendingPayments,
      history: contractor.paymentHistory || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
