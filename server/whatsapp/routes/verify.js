/**
 * Blockchain Verification Routes — /verify, /qr
 * Public verification pages for worker profiles.
 */

const express = require('express');
const router = express.Router();
const blockchain = require('../../shared/services/blockchainService');
const Worker = require('../../shared/models/Worker');

// GET /verify/:address — Public worker verification page
router.get('/:address', async (req, res) => {
  try {
    const address = req.params.address;
    const onChain = blockchain.isEnabled() ? await blockchain.getWorkerProfile(address).catch(() => null) : null;

    // Try to find worker by wallet address
    const worker = await Worker.findOne({ walletAddress: address }).catch(() => null);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Swaraj-ID — Worker Verification</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #f7f7f7; }
          .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          h1 { color: #1a73e8; font-size: 1.5rem; }
          .score { font-size: 3rem; font-weight: bold; color: #137333; text-align: center; margin: 20px 0; }
          .field { margin: 12px 0; }
          .label { color: #666; font-size: 0.85rem; }
          .value { font-weight: 600; font-size: 1.1rem; }
          .badge { display: inline-block; background: #e8f0fe; color: #1a73e8; padding: 4px 12px; border-radius: 12px; margin: 4px; }
          .footer { text-align: center; color: #999; font-size: 0.8rem; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🪪 Swaraj-ID Verification</h1>
          <div class="field"><span class="label">Address</span><br><span class="value" style="font-size:0.9rem; word-break:break-all;">${address}</span></div>
          ${onChain ? `
            <div class="score">${onChain.swarajScore} / 1000</div>
            <div class="field"><span class="label">Registered</span><br><span class="value">${onChain.isRegistered ? '✅ Yes' : '❌ No'}</span></div>
            <div class="field"><span class="label">Jobs Completed</span><br><span class="value">${onChain.jobsCompleted}</span></div>
            <div class="field"><span class="label">Segment</span><br><span class="value">${onChain.segment}</span></div>
          ` : '<p>Blockchain data not available.</p>'}
          ${worker ? `
            <div class="field"><span class="label">Name</span><br><span class="value">${worker.name}</span></div>
            <div class="field"><span class="label">City</span><br><span class="value">${worker.city}</span></div>
            <div class="field"><span class="label">Skills</span><br>${(worker.skills || [worker.workType]).map(s => `<span class="badge">${s}</span>`).join('')}</div>
          ` : ''}
        </div>
        <div class="footer">Verified on Ethereum Sepolia · Powered by Swaraj-ID</div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
