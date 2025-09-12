// ~/Documents/GitHub/GET-REECH/fabric-service/fabric.js
const { Gateway, Wallets } = require("fabric-network");
const fs = require("fs");
const path = require("path");

const WALLET_DIR = path.join(__dirname, "wallet", "org1admin");
const ID_LABEL = "org1admin";
const MSP_ID = "Org1MSP";
const CCP_PATH = path.join(__dirname, "connection-org1.json");
const CHANNEL_NAME = "mychannel";
const CHAINCODE_NAME = "bigdatacc";

async function ensureWalletIdentity() {
  const wallet = await Wallets.newFileSystemWallet(WALLET_DIR);
  const existing = await wallet.get(ID_LABEL);
  if (existing) return wallet;

  const certPath = path.join(WALLET_DIR, `${ID_LABEL}-cert.pem`);
  const keyPath = path.join(WALLET_DIR, `${ID_LABEL}-key.pem`);

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error(`[wallet] Missing cert or key. Place PEM files in ${WALLET_DIR}`);
  }

  const cert = fs.readFileSync(certPath, "utf8");
  const key = fs.readFileSync(keyPath, "utf8");

  await wallet.put(ID_LABEL, {
    credentials: { certificate: cert, privateKey: key },
    mspId: MSP_ID,
    type: "X.509",
  });

  return wallet;
}

async function connectToNetwork() {
  const ccp = JSON.parse(fs.readFileSync(CCP_PATH, "utf8"));
  const wallet = await ensureWalletIdentity();

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: ID_LABEL,
    discovery: { enabled: false, asLocalhost: true },
  });

  const network = await gateway.getNetwork(CHANNEL_NAME);
  const contract = network.getContract(CHAINCODE_NAME);
  return { gateway, contract };
}

async function logCatch(catchId, fisherId, species, weightKg, date) {
  const { gateway, contract } = await connectToNetwork();
  try {
    const tx = await contract.submitTransaction(
      "LogCatch",
      catchId,
      fisherId,
      species,
      weightKg.toString(),
      date
    );
    return tx.toString();
  } finally {
    gateway.disconnect();
  }
}

async function getCatch(catchId) {
  const { gateway, contract } = await connectToNetwork();
  try {
    const result = await contract.evaluateTransaction("GetCatch", catchId);
    return JSON.parse(result.toString());
  } finally {
    gateway.disconnect();
  }
}

module.exports = { logCatch, getCatch };
