/**
 * TwiML Helpers — Sanitize text for Twilio Say verb (XML/TTS-safe).
 */

const MIN_LENGTH = 10;

function sanitizeForTwiML(text, language = 'hi-IN') {
  if (text == null || typeof text !== 'string') {
    return getFallbackPhrase(language);
  }

  let out = text
    .replace(/&/g, ' and ')
    .replace(/</g, ' ')
    .replace(/>/g, ' ')
    .replace(/"/g, ' ')
    .replace(/'/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (out.length < MIN_LENGTH) {
    return getFallbackPhrase(language);
  }

  return out;
}

function getFallbackPhrase(language) {
  const fallbacks = {
    'hi-IN': 'Kripya dobara boliye.',
    'mr-IN': 'Krupya punha sanga.',
    'bn-IN': 'Onugroho kore abar bolun.',
    'kn-IN': 'Dayavittu matte heli.',
    'en-IN': 'Please say again.',
  };
  return fallbacks[language] || fallbacks['hi-IN'];
}

module.exports = { sanitizeForTwiML, getFallbackPhrase };
