/**
 * Blockchain Service — SwarajID Smart Contract Integration
 *
 * Connects to deployed SwarajID.sol on Ethereum Sepolia.
 * Backend relayer wallet signs & pays all gas — workers never touch crypto.
 * Deterministic wallets from phone numbers.
 */

const { ethers } = require('ethers');
const crypto = require('crypto');

// ── Contract Config ──────────────────────────────────────────────────

const CONTRACT_ADDRESS = '0xaf606abd76f9581c02762ba0cb2851215abd328c';

const CONTRACT_ABI = [
  'function registerWorker(address _workerAddr, string memory _segment) external',
  'function updateScore(address _workerAddr, uint256 _newScore) external',
  'function logJobCompletion(address _workerAddr) external',
  'function anchorWageProof(address _workerAddr, bytes32 _docHash, uint256 _amount, string memory _employerId) external',
  'function fileGrievance(address _workerAddr) external',
  'function issueSkillCert(address _workerAddr, string memory _skillName, bytes32 _certHash, string memory _issuer) external',
  'function getWorkerProfile(address _workerAddr) external view returns (tuple(bool isRegistered, uint256 swarajScore, uint256 jobsCompleted, uint256 grievanceCount, uint256 lastUpdated, string segment))',
  'function getWageHistoryCount(address _workerAddr) external view returns (uint256)',
  'function getSkillCount(address _workerAddr) external view returns (uint256)',
];

// ── Singleton Instances ──────────────────────────────────────────────

let provider = null;
let relayerWallet = null;
let contract = null;
let isInitialised = false;

function init() {
  if (isInitialised) return true;
  const rpcUrl = process.env.ETH_RPC_URL;
  const privateKey = process.env.RELAYER_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.warn('[Blockchain] ETH_RPC_URL or RELAYER_PRIVATE_KEY not set — blockchain features disabled.');
    return false;
  }

  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    relayerWallet = new ethers.Wallet(privateKey, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, relayerWallet);
    isInitialised = true;
    console.log(`[Blockchain] Connected. Relayer: ${relayerWallet.address}`);
    return true;
  } catch (err) {
    console.error('[Blockchain] Init failed:', err.message);
    return false;
  }
}

function isEnabled() {
  return isInitialised;
}

// ── Deterministic Wallet from Phone ──────────────────────────────────

const phoneWallets = new Map();

function getWalletForPhone(phone) {
  if (phoneWallets.has(phone)) return phoneWallets.get(phone);
  const secret = process.env.WALLET_DERIVATION_SECRET || 'swaraj-id-default-secret-change-me';
  const seed = crypto.createHmac('sha256', secret).update(phone).digest('hex');
  const wallet = new ethers.Wallet('0x' + seed);
  phoneWallets.set(phone, wallet);
  return wallet;
}

function getAddressForPhone(phone) {
  return getWalletForPhone(phone).address;
}

// ── On-Chain Operations ──────────────────────────────────────────────

async function registerWorker(phone, segment = 'general') {
  if (!isInitialised) return null;
  try {
    const addr = getAddressForPhone(phone);
    const tx = await contract.registerWorker(addr, segment);
    await tx.wait();
    console.log(`[Blockchain] Registered worker ${addr} (${segment})`);
    return { address: addr, txHash: tx.hash };
  } catch (err) {
    console.error('[Blockchain] registerWorker error:', err.message);
    return null;
  }
}

async function updateScore(phone, newScore) {
  if (!isInitialised) return null;
  try {
    const addr = getAddressForPhone(phone);
    const tx = await contract.updateScore(addr, newScore);
    await tx.wait();
    return { address: addr, txHash: tx.hash, score: newScore };
  } catch (err) {
    console.error('[Blockchain] updateScore error:', err.message);
    return null;
  }
}

async function logJobCompletion(phone) {
  if (!isInitialised) return null;
  try {
    const addr = getAddressForPhone(phone);
    const tx = await contract.logJobCompletion(addr);
    await tx.wait();
    return { address: addr, txHash: tx.hash };
  } catch (err) {
    console.error('[Blockchain] logJobCompletion error:', err.message);
    return null;
  }
}

async function anchorWageProof(phone, docHash, amount, employerId) {
  if (!isInitialised) return null;
  try {
    const addr = getAddressForPhone(phone);
    const hash = ethers.id(docHash);
    const tx = await contract.anchorWageProof(addr, hash, amount, employerId);
    await tx.wait();
    return { address: addr, txHash: tx.hash };
  } catch (err) {
    console.error('[Blockchain] anchorWageProof error:', err.message);
    return null;
  }
}

async function fileGrievance(phone) {
  if (!isInitialised) return null;
  try {
    const addr = getAddressForPhone(phone);
    const tx = await contract.fileGrievance(addr);
    await tx.wait();
    return { address: addr, txHash: tx.hash };
  } catch (err) {
    console.error('[Blockchain] fileGrievance error:', err.message);
    return null;
  }
}

async function issueSkillCert(phone, skillName, certHash, issuer = 'SwarajID') {
  if (!isInitialised) return null;
  try {
    const addr = getAddressForPhone(phone);
    const hash = ethers.id(certHash);
    const tx = await contract.issueSkillCert(addr, skillName, hash, issuer);
    await tx.wait();
    return { address: addr, txHash: tx.hash };
  } catch (err) {
    console.error('[Blockchain] issueSkillCert error:', err.message);
    return null;
  }
}

async function getWorkerProfile(phone) {
  if (!isInitialised) return null;
  try {
    const addr = getAddressForPhone(phone);
    const profile = await contract.getWorkerProfile(addr);
    return {
      address: addr,
      isRegistered: profile.isRegistered,
      swarajScore: Number(profile.swarajScore),
      jobsCompleted: Number(profile.jobsCompleted),
      grievanceCount: Number(profile.grievanceCount),
      lastUpdated: Number(profile.lastUpdated),
      segment: profile.segment,
    };
  } catch (err) {
    console.error('[Blockchain] getWorkerProfile error:', err.message);
    return null;
  }
}

module.exports = {
  init,
  isEnabled,
  CONTRACT_ADDRESS,
  getAddressForPhone,
  getWalletForPhone,
  registerWorker,
  updateScore,
  logJobCompletion,
  anchorWageProof,
  fileGrievance,
  issueSkillCert,
  getWorkerProfile,
};
