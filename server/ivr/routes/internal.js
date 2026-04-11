/**
 * IVR Internal Route — /internal
 * 
 * Cross-server event bridge for IVR ↔ WhatsApp communication.
 */

const express = require('express');
const router = express.Router();
const Worker = require('../../shared/models/Worker');
const Dispute = require('../../shared/models/Dispute');
const Grievance = require('../../shared/models/Grievance');
const { logEvent } = require('../../shared/utils/logger');

/**
 * POST /internal/event — Receive events from gateway / WhatsApp server
 */
router.post('/event', async (req, res) => {
  const { type, data } = req.body;

  logEvent('ivr_internal_event', { type, data });

  try {
    switch (type) {
      // WhatsApp notifies IVR that a dispute was filed
      case 'DISPUTE_FILED': {
        const { caseId, phone, amount } = data;
        logEvent('ivr_dispute_notification', { caseId, phone, amount });
        // Could trigger outbound IVR confirmation call here
        break;
      }

      // WhatsApp notifies IVR of worker registration
      case 'WORKER_REGISTERED': {
        const { phone, name } = data;
        logEvent('ivr_worker_registered', { phone, name });
        break;
      }

      // Score update from blockchain
      case 'SCORE_UPDATED': {
        const { phone, score } = data;
        await Worker.findOneAndUpdate(
          { phone: phone.replace('+91', '') },
          { swarajScore: score }
        );
        logEvent('ivr_score_synced', { phone, score });
        break;
      }

      // Grievance status update
      case 'GRIEVANCE_UPDATE': {
        const { caseId, status, detail } = data;
        await Grievance.findOneAndUpdate(
          { caseId },
          {
            status,
            $push: {
              timeline: { action: status, detail, timestamp: new Date() },
            },
          }
        );
        logEvent('ivr_grievance_updated', { caseId, status });
        break;
      }

      // Job match notification (from WhatsApp job finder)
      case 'JOB_MATCH': {
        const { phone: jobPhone, jobId, description } = data;
        logEvent('ivr_job_match', { phone: jobPhone, jobId, description });
        // Could trigger outbound IVR call for urgent job matches
        break;
      }

      // SOS alert from safety module
      case 'SOS_ALERT': {
        const { phone: sosPhone, location, description: sosDesc } = data;
        logEvent('ivr_sos_alert', { phone: sosPhone, location, description: sosDesc });
        // High priority — could trigger immediate outbound alerts
        break;
      }

      default:
        logEvent('ivr_unknown_event', { type, data });
    }

    res.json({ success: true, type, received: true });
  } catch (err) {
    logEvent('ivr_internal_error', { type, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /internal/health — IVR health check
 */
router.get('/health', async (req, res) => {
  const workerCount = await Worker.countDocuments().catch(() => 0);
  const disputeCount = await Dispute.countDocuments().catch(() => 0);
  const grievanceCount = await Grievance.countDocuments().catch(() => 0);

  res.json({
    service: 'ivr',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats: { workers: workerCount, disputes: disputeCount, grievances: grievanceCount },
  });
});

module.exports = router;
