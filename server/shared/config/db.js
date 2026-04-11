/**
 * MongoDB Connection — Swaraj-ID
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swarajid';

let isConnected = false;

async function connectDB() {
  if (isConnected) return true;
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('[DB] MongoDB connected:', mongoose.connection.name);
    return true;
  } catch (err) {
    console.error('[DB] MongoDB connection error:', err.message);
    return false;
  }
}

function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDBConnected };
