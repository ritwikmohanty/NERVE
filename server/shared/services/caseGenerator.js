/**
 * Case ID Generator
 * Generates unique case IDs for disputes, grievances, etc.
 */

function generateDisputeId() {
  const prefix = 'DSP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function generateGrievanceId() {
  const prefix = 'GRV';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function generateWorkerId() {
  const prefix = 'SWJ';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function generateContractorId() {
  const prefix = 'CTR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

module.exports = {
  generateDisputeId,
  generateGrievanceId,
  generateWorkerId,
  generateContractorId,
};
