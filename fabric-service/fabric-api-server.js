// fabric-api-server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Gateway, Wallets } = require('fabric-network');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// -----------------------------
// Load connection profile (Org1)
// -----------------------------
const ccpPath = path.resolve(
  __dirname,
  '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json'
);
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

// -----------------------------
// Helper: connect and get contract
// -----------------------------
async function getContract() {
  const walletPath = path.join(process.cwd(), 'wallet');
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  // ⚠️ Make sure "appUser" is enrolled in this wallet already
  const identity = await wallet.get('appUser');
  if (!identity) {
    throw new Error('No identity for "appUser" found in wallet. Run registerUser.js first!');
  }

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: 'appUser',
    discovery: { enabled: true, asLocalhost: true },
  });

  const network = await gateway.getNetwork('mychannel');
  const contract = network.getContract('bigdatacc'); // ⚠️ replace with your chaincode name

  return { contract, gateway };
}

// -----------------------------
// Submit new catch
// -----------------------------
app.post('/submit-catch', async (req, res) => {
  const { catchId, fisherId, species, weightKg, date } = req.body;

  try {
    const { contract, gateway } = await getContract();
    const result = await contract.submitTransaction(
      'createCatch',
      catchId,
      fisherId,
      species,
      weightKg.toString(),
      date
    );

    await gateway.disconnect();
    res.json({ status: 'success', transaction: result.toString() });
  } catch (err) {
    console.error('[submit-catch] Error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// -----------------------------
// Update catch status
// -----------------------------
app.post('/update-catch-status', async (req, res) => {
  const { catchId, fisherId, status } = req.body;

  try {
    const { contract, gateway } = await getContract();
    const result = await contract.submitTransaction(
      'updateCatchStatus',
      catchId,
      fisherId,
      status
    );

    await gateway.disconnect();
    res.json({ status: 'success', transaction: result.toString() });
  } catch (err) {
    console.error('[update-catch-status] Error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// -----------------------------
// Query catch by ID
// -----------------------------
app.get('/get-catch/:catchId', async (req, res) => {
  const { catchId } = req.params;

  try {
    const { contract, gateway } = await getContract();
    const result = await contract.evaluateTransaction('getCatch', catchId);

    await gateway.disconnect();
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    console.error('[get-catch] Error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// -----------------------------
// Start server
// -----------------------------
app.listen(3001, () => {
  console.log('✅ Fabric API server running on http://localhost:3001');
});
