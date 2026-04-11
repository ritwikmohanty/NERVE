/**
 * Swaraj-ID — IVR Server
 * 
 * Handles Twilio Voice webhooks for toll-free IVR calls.
 * Worker can navigate agents via DTMF (keypad) or speech.
 * Port: 3003
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, isDBConnected } = require('../shared/config/db');
const { getAllActiveSessions } = require('../shared/services/conversationState');
const { logError } = require('../shared/utils/logger');

// Routes
const voiceRouter = require('./routes/voice');
const workerIvrRouter = require('./routes/workerIvr');
const grievanceRouter = require('./routes/grievance');
const internalRouter = require('./routes/internal');

const app = express();
const PORT = process.env.IVR_PORT || process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Health Check ────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Swaraj-ID IVR Server',
    timestamp: new Date().toISOString(),
    activeSessions: getAllActiveSessions().length,
    mongodb: isDBConnected(),
  });
});

// ── Twilio Voice Webhook — Main IVR ─────────────────────────────────
app.use('/voice', voiceRouter);

// ── Worker IVR — Mazdoor Sahayata ───────────────────────────────────
app.use('/worker', workerIvrRouter);

// ── Grievance Filing API ────────────────────────────────────────────
app.use('/grievance', grievanceRouter);

// ── Cross-Server Event Bridge ───────────────────────────────────────
app.use('/internal', internalRouter);

// ── Admin Dashboard ─────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Swaraj-ID IVR — Admin</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 20px; background: #f0f2f5; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #1a73e8; }
        .card { background: white; border-radius: 8px; padding: 20px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .badge { background: #e8f0fe; color: #1a73e8; padding: 2px 8px; border-radius: 12px; font-size: 0.9rem; }
      </style>
      <script>
        async function load() {
          const res = await fetch('/health');
          const data = await res.json();
          document.getElementById('status').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        }
        window.onload = load;
        setInterval(load, 5000);
      </script>
    </head>
    <body>
      <div class="container">
        <h1>📞 Swaraj-ID IVR — Admin Dashboard</h1>
        <div class="card" id="status">Loading...</div>
      </div>
    </body>
    </html>
  `);
});

// ── Root ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'Swaraj-ID IVR Server',
    version: '1.0.0',
    endpoints: {
      voice: '/voice (Twilio Voice webhook)',
      worker: '/worker (Worker IVR)',
      grievance: '/grievance (Grievance API)',
      admin: '/admin',
      health: '/health',
    },
  });
});

// Error handling
app.use((err, req, res, next) => {
  logError(null, 'IVR Server error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ── Start ────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  await connectDB();
  console.log(`📞 Swaraj-ID IVR Server running on port ${PORT}`);
  console.log(`   Voice webhook: http://localhost:${PORT}/voice`);
  console.log(`   Worker IVR:    http://localhost:${PORT}/worker`);
  console.log(`   Grievance:     http://localhost:${PORT}/grievance`);
  console.log(`   Admin:         http://localhost:${PORT}/admin`);
  console.log(`   Health:        http://localhost:${PORT}/health`);
});
