/**
 * Audio Transcription Service
 * Downloads Twilio voice notes → transcribes via Groq Whisper.
 */

const Groq = require('groq-sdk');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const WHISPER_MODEL = 'whisper-large-v3-turbo';

let groqClient = null;

function getClient() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

/**
 * Download a file from a URL (follows redirects, authenticates with Twilio).
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `twilio_audio_${Date.now()}.ogg`);
    const writeStream = fs.createWriteStream(tmpFile);

    const options = {};
    if (url.includes('api.twilio.com') || url.includes('media.twiliocdn.com')) {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      if (sid && token) {
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');
        const parsedUrl = new URL(url);
        options.hostname = parsedUrl.hostname;
        options.path = parsedUrl.pathname + parsedUrl.search;
        options.headers = { Authorization: `Basic ${auth}` };
      }
    }

    const makeRequest = (requestUrl, depth = 0) => {
      if (depth > 5) {
        reject(new Error('Too many redirects'));
        return;
      }
      const parsedUrl = new URL(requestUrl);
      const reqOptions = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: options.headers || {},
      };
      const reqProtocol = requestUrl.startsWith('https') ? https : http;
      reqProtocol.get(reqOptions, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          makeRequest(response.headers.location, depth + 1);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(writeStream);
        writeStream.on('finish', () => { writeStream.close(); resolve(tmpFile); });
        writeStream.on('error', (err) => { fs.unlink(tmpFile, () => {}); reject(err); });
      }).on('error', (err) => { fs.unlink(tmpFile, () => {}); reject(err); });
    };

    makeRequest(url);
  });
}

/**
 * Transcribe a Twilio voice note URL → text.
 * @param {string} mediaUrl - Twilio media URL
 * @returns {string|null} Transcription text
 */
async function transcribeVoiceNote(mediaUrl) {
  const client = getClient();
  if (!client) {
    console.warn('[Transcription] No GROQ_API_KEY — cannot transcribe.');
    return null;
  }

  let tmpFile = null;
  try {
    tmpFile = await downloadFile(mediaUrl);
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(tmpFile),
      model: WHISPER_MODEL,
      language: 'hi',         // primary: Hindi
      response_format: 'text',
    });
    const text = typeof transcription === 'string' ? transcription : transcription.text;
    console.log(`[Transcription] Result: "${text}"`);
    return text || null;
  } catch (err) {
    console.error('[Transcription] Error:', err.message);
    return null;
  } finally {
    if (tmpFile) {
      fs.unlink(tmpFile, () => {});
    }
  }
}

module.exports = { transcribeVoiceNote };
