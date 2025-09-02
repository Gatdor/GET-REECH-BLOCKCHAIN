import express from 'express';
import { create } from 'ipfs-http-client';
import { ethers } from 'ethers';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// Ethereum configuration
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_NODE_URL || 'http://localhost:8545');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Replace with your deployed smart contract address and ABI
const contractAddress = process.env.CONTRACT_ADDRESS || 'YOUR_CONTRACT_ADDRESS';
const contractABI = [
  {
    "inputs": [
      { "name": "batchId", "type": "string" },
      { "name": "fishermanID", "type": "string" },
      { "name": "species", "type": "string" },
      { "name": "weight", "type": "uint256" },
      { "name": "location", "type": "string" },
      { "name": "timestamp", "type": "string" },
      { "name": "dryingMethod", "type": "string" },
      { "name": "batchSize", "type": "uint256" },
      { "name": "shelfLife", "type": "uint256" },
      { "name": "price", "type": "uint256" },
      { "name": "imageUrls", "type": "string[]" }
    ],
    "name": "createCatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// IPFS Upload Endpoint
app.post('/api/upload-ipfs', upload.single('file'), async (req, res) => {
  try {
    const ipfs = await create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: `Basic ${Buffer.from(`${process.env.INFURA_IPFS_PROJECT_ID}:${process.env.INFURA_IPFS_PROJECT_SECRET}`).toString('base64')}`
      }
    });
    const { cid } = await ipfs.add(req.file.buffer);
    res.json({ url: `https://ipfs.io/ipfs/${cid.toString()}` });
  } catch (error) {
    console.error('IPFS upload error:', error);
    res.status(500).json({ error: `IPFS upload failed: ${error.message}` });
  }
});

// Create Catch Endpoint
app.post('/api/create-catch', async (req, res) => {
  const { batchId, fishermanID, species, weight, location, timestamp, dryingMethod, batchSize, shelfLife, price, imageUrls } = req.body;
  try {
    const tx = await contract.createCatch(
      batchId,
      fishermanID,
      species,
      Math.floor(weight * 1000), // Convert to grams
      location,
      timestamp,
      dryingMethod,
      Math.floor(batchSize * 1000), // Convert to grams
      shelfLife,
      Math.floor(price * 100), // Convert to cents
      imageUrls
    );
    const receipt = await tx.wait();
    res.json({ transactionHash: receipt.transactionHash });
  } catch (error) {
    console.error('Create catch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));