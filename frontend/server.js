// ~/Documents/GitHub/GET-REECH/frontend/server.js
const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
const PORT = 3000;

// CONFIG
const WALLET_DIR = path.join(__dirname, 'wallet', 'org1admin'); // wallet folder that contains org1admin-cert.pem & org1admin-key.pem
const ID_LABEL = 'org1admin'; // label we will import (or use if existing)
const MSP_ID = 'Org1MSP';
const CCP_PATH = path.join(__dirname, 'connection-org1.json');
const CHANNEL_NAME = 'mychannel';
const CHAINCODE_NAME = 'bigdatacc';

// Ensure wallet identity exists; if not, import from PEM files found in WALLET_DIR
async function ensureWalletIdentity() {
  const wallet = await Wallets.newFileSystemWallet(WALLET_DIR);
  const existing = await wallet.get(ID_LABEL);
  if (existing) {
    console.log(`[wallet] identity "${ID_LABEL}" already present (msp:${existing.mspId || 'n/a'})`);
    return wallet;
  }

  const certPath = path.join(WALLET_DIR, `${ID_LABEL}-cert.pem`);
  const keyPath = path.join(WALLET_DIR, `${ID_LABEL}-key.pem`);
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error(`[wallet] missing cert or key at ${certPath}, ${keyPath}. Please place PEMs there or run enroll scripts.`);
  }

  const cert = fs.readFileSync(certPath, 'utf8');
  const key = fs.readFileSync(keyPath, 'utf8');

  const identity = {
    credentials: { certificate: cert, privateKey: key },
    mspId: MSP_ID,
    type: 'X.509',
  };

  await wallet.put(ID_LABEL, identity);
  console.log(`[wallet] imported identity "${ID_LABEL}" with mspId "${MSP_ID}"`);
  return wallet;
}

// Connect to network (discovery disabled for local dev)
async function connectToNetwork() {
  if (!fs.existsSync(CCP_PATH)) throw new Error(`Connection profile not found at ${CCP_PATH}`);
  const ccp = JSON.parse(fs.readFileSync(CCP_PATH, 'utf8'));

  const wallet = await ensureWalletIdentity();

  // Log wallet contents for debugging
  const list = await wallet.list();
  console.log('[wallet] identities:', list.map(i => i.label));

  const gateway = new Gateway();
  const connectOptions = {
    wallet,
    identity: ID_LABEL,
    // IMPORTANT: discovery disabled for local/dev networks if discovery causes access denied
    discovery: { enabled: false, asLocalhost: true },
    // reasonable timeouts for slower local machines
    timeout: { endorsement: 60000, submit: 60000, commit: 60000 }
  };

  console.log(`[gateway] connecting as "${ID_LABEL}" (msp: ${MSP_ID}) - discovery disabled`);
  await gateway.connect(ccp, connectOptions);

  // debug: show the identity used by gateway (no private key printed)
  try {
    const identity = await wallet.get(ID_LABEL);
    if (identity && identity.credentials && identity.credentials.certificate) {
      // log subject CN from cert
      const cert = identity.credentials.certificate;
      const cnMatch = cert.match(/CN\s?=\s?([^,\n\/]+)/) || cert.match(/subject=.*CN=([^,\n]+)/);
      console.log(`[gateway] using cert CN: ${cnMatch ? cnMatch[1].trim() : 'unknown'}`);
    }
  } catch (e) {
    console.warn('[gateway] failed to introspect wallet identity', e.message);
  }

  const network = await gateway.getNetwork(CHANNEL_NAME);
  const contract = network.getContract(CHAINCODE_NAME);
  return { gateway, network, contract };
}

// POST /submit-catch
app.post('/submit-catch', async (req, res) => {
  let gateway;
  try {
    const { catchId, fisherId, species, weightKg, date } = req.body || {};
    if (!catchId || !fisherId || !species || !weightKg || !date) {
      return res.status(400).json({ error: 'Missing required fields: catchId, fisherId, species, weightKg, date' });
    }

    const conn = await connectToNetwork();
    gateway = conn.gateway;
    const contract = conn.contract;
    console.log('[submit-catch] submitting:', { catchId, fisherId, species, weightKg, date });

    const tx = await contract.submitTransaction('LogCatch', catchId, fisherId, species, weightKg.toString(), date);
    console.log('[submit-catch] tx committed:', tx ? tx.toString() : '<no payload>');
    return res.json({ status: 'success', result: tx ? tx.toString() : '' });
  } catch (err) {
    console.error('[submit-catch] ERROR:', err && err.message ? err.message : err);
    return res.status(500).json({ error: err.message || String(err), stack: err.stack });
  } finally {
    if (gateway) {
      try { await gateway.disconnect(); } catch (e) { console.warn('gateway disconnect error', e.message); }
    }
  }
});

// GET /get-catch/:catchId
app.get('/get-catch/:catchId', async (req, res) => {
  let gateway;
  try {
    const catchId = req.params.catchId;
    if (!catchId) return res.status(400).json({ error: 'Missing catchId' });

    const conn = await connectToNetwork();
    gateway = conn.gateway;
    const contract = conn.contract;

    const result = await contract.evaluateTransaction('GetCatch', catchId);
    const payload = result && result.length ? result.toString() : null;
    console.log('[get-catch] result:', payload);
    return res.json(payload ? JSON.parse(payload) : {});
  } catch (err) {
    console.error('[get-catch] ERROR:', err && err.message ? err.message : err);
    return res.status(500).json({ error: err.message || String(err), stack: err.stack });
  } finally {
    if (gateway) {
      try { await gateway.disconnect(); } catch (e) { console.warn('gateway disconnect error', e.message); }
    }
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
