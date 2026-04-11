/**
 * Swaraj-ID Gateway Proxy Server
 *
 * Single public entry point (port 3000) exposed via ngrok.
 * Routes requests to:
 *   - WhatsApp Server → localhost:3001
 *   - IVR Server      → localhost:3003
 *
 * Route mapping:
 *   /sms/*          → WhatsApp (Twilio messaging webhook — all agents)
 *   /voice/*        → IVR     (Twilio Voice webhook — worker IVR)
 *   /worker/*       → IVR     (Worker IVR module — Mazdoor Sahayata)
 *   /verify/*       → WhatsApp (Blockchain verification page)
 *   /qr/*           → WhatsApp (QR code generation)
 *   /contractor/*   → WhatsApp (Contractor dashboard API)
 *   /ngo/*          → WhatsApp (NGO dashboard API)
 *   /internal/*     → WhatsApp (Cross-server event bridge)
 *   /grievance/*    → IVR     (Labour union grievance API)
 *   /admin/*        → WhatsApp (Admin dashboard)
 *   /api/*          → WhatsApp (REST API — dashboard backend)
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

const GATEWAY_PORT = process.env.GATEWAY_PORT || 3000;
const WHATSAPP_PORT = process.env.WHATSAPP_PORT || 3001;
const IVR_PORT = process.env.IVR_PORT || 3003;

const WHATSAPP_TARGET = `http://localhost:${WHATSAPP_PORT}`;
const IVR_TARGET = `http://localhost:${IVR_PORT}`;

app.use(cors());

// ── Log every incoming request ──────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[Gateway] ← ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

// ── Proxy Options Builder ───────────────────────────────────────────
function proxyTo(target, label) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    prependPath: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // Restore the full original URL (Express strips mount prefix)
        if (req.originalUrl && req.originalUrl !== req.url) {
          proxyReq.path = req.originalUrl;
        }
        console.log(`[Gateway] → Proxying to ${label}: ${req.method} ${proxyReq.path}`);

        // Re-stream parsed body if express already consumed it
        if (req.body && Object.keys(req.body).length > 0) {
          const contentType = req.headers['content-type'] || '';
          let bodyData;
          if (contentType.includes('application/json')) {
            bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
          } else {
            bodyData = new URLSearchParams(req.body).toString();
            proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
          }
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      proxyRes: (proxyRes, req) => {
        console.log(`[Gateway] ✓ ${label} responded ${proxyRes.statusCode} for ${req.method} ${req.originalUrl}`);
      },
      error: (err, req, res) => {
        console.error(`[Gateway] ✗ Proxy error → ${label}:`, err.message);
        if (res && !res.headersSent) {
          res.status(502).json({ error: `${label} server unavailable` });
        }
      },
    },
  });
}

// ── Route to WhatsApp Server (port 3001) ────────────────────────────
app.use('/sms', proxyTo(WHATSAPP_TARGET, 'WhatsApp'));
app.use('/verify', proxyTo(WHATSAPP_TARGET, 'WhatsApp'));
app.use('/qr', proxyTo(WHATSAPP_TARGET, 'WhatsApp'));
app.use('/contractor', proxyTo(WHATSAPP_TARGET, 'WhatsApp'));
app.use('/ngo', proxyTo(WHATSAPP_TARGET, 'WhatsApp'));
app.use('/internal', proxyTo(WHATSAPP_TARGET, 'WhatsApp'));
app.use('/admin', proxyTo(WHATSAPP_TARGET, 'WhatsApp'));
app.use('/api', proxyTo(WHATSAPP_TARGET, 'WhatsApp'));

// ── Route to IVR Server (port 3003) ─────────────────────────────────
app.use('/voice', proxyTo(IVR_TARGET, 'IVR'));
app.use('/worker', proxyTo(IVR_TARGET, 'IVR'));
app.use('/grievance', proxyTo(IVR_TARGET, 'IVR'));

// ── Gateway Health Check ────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const check = async (url, name) => {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(2000) });
      const data = await resp.json();
      return { name, status: 'up', ...data };
    } catch {
      return { name, status: 'down' };
    }
  };

  const [ivr, wa] = await Promise.all([
    check(`${IVR_TARGET}/health`, 'IVR Server'),
    check(`${WHATSAPP_TARGET}/health`, 'WhatsApp Server'),
  ]);

  res.json({
    gateway: 'ok',
    port: GATEWAY_PORT,
    timestamp: new Date().toISOString(),
    servers: { ivr, whatsapp: wa },
  });
});

// ── Root Info ───────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'Swaraj-ID — Voice-First Labour Rights Platform — Gateway',
    version: '1.0.0',
    gateway_port: GATEWAY_PORT,
    routing: {
      whatsapp: {
        port: WHATSAPP_PORT,
        paths: ['/sms/*', '/verify/*', '/qr/*', '/contractor/*', '/ngo/*', '/internal/*', '/admin/*', '/api/*'],
      },
      ivr: {
        port: IVR_PORT,
        paths: ['/voice/*', '/worker/*', '/grievance/*'],
      },
    },
  });
});

// ── Start ───────────────────────────────────────────────────────────
app.listen(GATEWAY_PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        🌉 Swaraj-ID — Gateway Proxy                     ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Gateway     → http://localhost:${GATEWAY_PORT}                      ║`);
  console.log(`║  WhatsApp    → http://localhost:${WHATSAPP_PORT}  (5 AI agents)          ║`);
  console.log(`║  IVR Server  → http://localhost:${IVR_PORT}  (voice IVR)             ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  WhatsApp routes: /sms /verify /qr /contractor /ngo     ║');
  console.log('║  IVR routes:     /voice /worker /grievance              ║');
  console.log('║  Bridge:         /internal (cross-server events)        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Point ngrok to this port:  ngrok http 3000');
});
