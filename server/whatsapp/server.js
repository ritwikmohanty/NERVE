/**
 * Swaraj-ID — WhatsApp Server
 * 
 * Handles all WhatsApp message webhooks (text + voice notes).
 * Routes to the 5 AI agents + contractor/NGO APIs.
 * Port: 3001
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, isDBConnected } = require('../shared/config/db');
const blockchain = require('../shared/services/blockchainService');
const { getAllActiveSessions } = require('../shared/services/conversationState');
const { logError } = require('../shared/utils/logger');

// Routes
const messageRouter = require('./routes/message');
const workerApiRouter = require('./routes/workerApi');
const contractorApiRouter = require('./routes/contractorApi');
const ngoApiRouter = require('./routes/ngoApi');
const verifyRouter = require('./routes/verify');
const internalRouter = require('./routes/internal');

const app = express();
const PORT = process.env.WHATSAPP_PORT || process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve generated PDFs
app.use('/pdfs', express.static(path.join(__dirname, '..', 'public', 'pdfs')));

// ── Health Check ────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Swaraj-ID WhatsApp Server',
    timestamp: new Date().toISOString(),
    activeSessions: getAllActiveSessions().length,
    mongodb: isDBConnected(),
    blockchain: {
      enabled: blockchain.isEnabled(),
      contract: blockchain.CONTRACT_ADDRESS,
    },
  });
});

// ── Twilio WhatsApp/SMS Webhook — All 5 Agents ─────────────────────
app.use('/sms', messageRouter);

// ── REST APIs — Dashboard backends ──────────────────────────────────
app.use('/api/worker', workerApiRouter);
app.use('/api/contractor', contractorApiRouter);
app.use('/api/ngo', ngoApiRouter);

// Legacy routes (backward compat)
app.use('/contractor', contractorApiRouter);
app.use('/ngo', ngoApiRouter);

// ── Blockchain Verification ─────────────────────────────────────────
app.use('/verify', verifyRouter);
app.use('/qr', verifyRouter);

// ── Cross-Server Event Bridge ───────────────────────────────────────
app.use('/internal', internalRouter);

// ── Admin Monitoring ────────────────────────────────────────────────
app.get('/admin/active-sessions', (req, res) => {
  try {
    const sessions = getAllActiveSessions();
    res.json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    logError(null, 'Error fetching active sessions', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

// ── Root ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'Swaraj-ID WhatsApp Server',
    version: '1.0.0',
    agents: [
      'Agent 1: Chowk Smart Matcher (Job Finder)',
      'Agent 2: Wage Protector + Grievance Engine',
      'Agent 3: Safety Guardian',
      'Agent 4: Rights Advocate + Scheme Apply',
      'Agent 5: Skill Builder',
    ],
    endpoints: {
      sms: '/sms (Twilio webhook)',
      workerApi: '/api/worker',
      contractorApi: '/api/contractor',
      ngoApi: '/api/ngo',
      verify: '/verify/:address',
      internal: '/internal/event',
      admin: '/admin/active-sessions',
    },
  });
});

// Error handling
app.use((err, req, res, next) => {
  logError(null, 'WhatsApp Server error', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ── Start ────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  const dbOk = await connectDB();
  if (!dbOk) {
    console.warn('⚠️  MongoDB not connected — some features disabled');
  }

  // Initialise blockchain
  blockchain.init();

  console.log(`💬 Swaraj-ID WhatsApp Server running on port ${PORT}`);
  console.log(`   SMS/WhatsApp webhook: http://localhost:${PORT}/sms`);
  console.log(`   Worker API:          http://localhost:${PORT}/api/worker`);
  console.log(`   Contractor API:      http://localhost:${PORT}/api/contractor`);
  console.log(`   NGO API:             http://localhost:${PORT}/api/ngo`);
  console.log(`   Verify:              http://localhost:${PORT}/verify/:address`);
  console.log(`   Health:              http://localhost:${PORT}/health`);
});
