const express = require('express');
const { create } = require('ipfs-http-client');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// IPFS Upload Endpoint
app.post('/api/upload-ipfs', async (req, res) => {
  try {
    const ipfs = await create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
    // Assuming file is sent via multipart/form-data; use a middleware like `multer` for file uploads
    const file = req.files.file; // Requires `multer` or similar
    const { cid } = await ipfs.add(file);
    res.json({ url: `https://ipfs.io/ipfs/${cid.toString()}` });
  } catch (error) {
    res.status(500).json({ error: `IPFS upload failed: ${error.message}` });
  }
});

// BlockchainService (adapted from your code)
class BlockchainService {
  constructor() {
    this.network = null;
    this.contract = null;
  }

  async connect() {
    try {
      const ccpPath = path.resolve(__dirname, 'path/to/connection-org1.json'); // Update path
      const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
      const walletPath = path.join(__dirname, 'wallet');
      const wallet = await Wallets.newFileSystemWallet(walletPath);

      const gateway = new Gateway();
      await gateway.connect(ccp, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true },
      });

      this.network = await gateway.getNetwork('mychannel');
      this.contract = this.network.getContract('catchtraceability');
    } catch (error) {
      console.error('Failed to connect to Fabric:', error);
      throw error;
    }
  }

  async createCatch(fishermanID, species, weight, location, timestamp) {
    if (!this.contract) await this.connect();
    const id = uuidv4();
    try {
      await this.contract.submitTransaction('CreateCatch', id, fishermanID, species, weight.toString(), location, timestamp);
      return id;
    } catch (error) {
      console.error('Create catch error:', error);
      throw error;
    }
  }
}

const blockchainService = new BlockchainService();

// Example endpoint for creating a catch
app.post('/api/create-catch', async (req, res) => {
  const { fishermanID, species, weight, location, timestamp } = req.body;
  try {
    const catchId = await blockchainService.createCatch(fishermanID, species, weight, location, timestamp);
    res.json({ catchId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));