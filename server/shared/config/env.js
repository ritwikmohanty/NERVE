/**
 * Environment Configuration
 */

module.exports = {
  // Server Ports
  GATEWAY_PORT: process.env.GATEWAY_PORT || 3000,
  WHATSAPP_PORT: process.env.WHATSAPP_PORT || 3001,
  IVR_PORT: process.env.IVR_PORT || 3003,

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/swarajid',

  // Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,

  // AI / LLM
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  BHASHINI_API_KEY: process.env.BHASHINI_API_KEY,

  // Blockchain
  ETH_RPC_URL: process.env.ETH_RPC_URL,
  RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY,
  WALLET_DERIVATION_SECRET: process.env.WALLET_DERIVATION_SECRET || 'swaraj-id-default-secret-change-me',

  // External APIs
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,

  // Ngrok
  NGROK_URL: process.env.NGROK_URL,
};
