/**
 * Twilio Webhook Auto-Updater
 *
 * Detects the current ngrok URL (via local API or CLI arg) and updates:
 *   1. Twilio Voice webhook on all phone numbers
 *   2. .env files in whatsapp/ and ivr/ with the new NGROK_URL
 *
 * Usage:
 *   node update-twilio-webhooks.js                       # auto-detect from ngrok API
 *   node update-twilio-webhooks.js https://xxxx.ngrok.io  # explicit URL
 *   NGROK_URL=https://xxxx.ngrok.io node update-twilio-webhooks.js
 */

require('dotenv').config({ path: './whatsapp/.env' });
const twilio = require('twilio');
const fs = require('fs');

async function main() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    console.error('❌ TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set in whatsapp/.env');
    process.exit(1);
  }

  // Resolve ngrok URL: CLI arg > env var > auto-detect
  let ngrokUrl = process.argv[2] || process.env.NGROK_URL;

  if (!ngrokUrl) {
    try {
      const resp = await fetch('http://localhost:4040/api/tunnels', {
        signal: AbortSignal.timeout(2000),
      });
      const data = await resp.json();
      const https = data.tunnels?.find((t) => t.proto === 'https');
      if (https) {
        ngrokUrl = https.public_url;
        console.log(`[auto-detected ngrok URL: ${ngrokUrl}]`);
      }
    } catch {
      console.error('❌ Could not detect ngrok URL. Is ngrok running on port 3000?');
      console.error('   Usage: node update-twilio-webhooks.js https://YOUR-URL.ngrok-free.app');
      process.exit(1);
    }
  }

  ngrokUrl = ngrokUrl.replace(/\/$/, '');
  console.log(`\n🔗 Updating Twilio webhooks → ${ngrokUrl}\n`);

  const client = twilio(sid, token);

  // ── 1. Update Voice phone number webhooks ─────────────────────────
  try {
    const numbers = await client.incomingPhoneNumbers.list();
    for (const n of numbers) {
      await client.incomingPhoneNumbers(n.sid).update({
        voiceUrl: `${ngrokUrl}/voice`,
        voiceMethod: 'POST',
        statusCallback: `${ngrokUrl}/voice/call-status`,
        statusCallbackMethod: 'POST',
      });
      console.log(`✓ Voice IVR     ${n.phoneNumber} → ${ngrokUrl}/voice`);
    }
  } catch (e) {
    console.error('❌ Failed to update voice webhook:', e.message);
  }

  // ── 2. WhatsApp Sandbox (manual — console only) ──────────────────
  console.log(`\n✓ WhatsApp      Update in Twilio Console → Sandbox Settings:`);
  console.log(`                "When a message comes in" → ${ngrokUrl}/sms  (POST)`);

  // ── 3. Update .env files ──────────────────────────────────────────
  const updateEnv = (filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        // Create .env with just the ngrok URL
        fs.writeFileSync(filePath, `NGROK_URL=${ngrokUrl}\n`);
        console.log(`✓ Created       ${filePath}`);
        return;
      }
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.match(/^NGROK_URL=.*/m)) {
        content = content.replace(/^NGROK_URL=.*/m, `NGROK_URL=${ngrokUrl}`);
      } else {
        content += `\nNGROK_URL=${ngrokUrl}\n`;
      }
      fs.writeFileSync(filePath, content);
      console.log(`✓ Updated       ${filePath}`);
    } catch (e) {
      console.warn(`⚠ Could not update ${filePath}: ${e.message}`);
    }
  };

  updateEnv('./server/whatsapp/.env');
  updateEnv('./server/ivr/.env');

  console.log('\n✅ Done! Twilio webhooks updated.\n');
  console.log('Voice IVR:  Call your Twilio number to test');
  console.log(`WhatsApp:   Send "Hi" to your sandbox number`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
