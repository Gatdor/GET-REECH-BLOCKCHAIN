const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const winston = require('winston');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: path.join(__dirname, 'server.log') }),
        new winston.transports.Console()
    ]
});

async function connectToNetwork(walletPath, identityLabel, mspId) {
    try {
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        if (!(await wallet.list()).includes(identityLabel)) {
            const certPath = path.join(walletPath, `${identityLabel}-cert.pem`);
            const keyPath = path.join(walletPath, `${identityLabel}-key.pem`);
            if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
                throw new Error(`Certificate or key file not found at ${certPath}, ${keyPath}`);
            }
            const cert = fs.readFileSync(certPath).toString();
            const key = fs.readFileSync(keyPath).toString();
            const identity = {
                credentials: { certificate: cert, privateKey: key },
                mspId: mspId,
                type: 'X.509',
            };
            await wallet.put(identityLabel, identity);
            logger.info(`Imported ${identityLabel} into wallet`);
        }

        const connectionProfilePath = path.join(__dirname, '..', 'backend', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        if (!fs.existsSync(connectionProfilePath)) {
            throw new Error(`Connection profile not found at ${connectionProfilePath}`);
        }
        const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
        const gateway = new Gateway();
        await gateway.connect(connectionProfile, {
            wallet,
            identity: identityLabel,
            discovery: { enabled: true, asLocalhost: true },
        });
        logger.info('Connected to Fabric network');
        return { gateway, network: await gateway.getNetwork('mychannel') };
    } catch (error) {
        logger.error('Failed to connect to network:', { message: error.message, stack: error.stack });
        throw error;
    }
}

app.post('/register-fisher', async (req, res) => {
    try {
        const { fisherId, name, govtId } = req.body;
        if (!fisherId || !name || !govtId) {
            throw new Error('Missing required fields: fisherId, name, govtId');
        }
        const { gateway, network } = await connectToNetwork(
            path.join(__dirname, 'wallet', 'org1admin'),
            'org1admin',
            'Org1MSP'
        );
        const contract = network.getContract('bigdatacc');
        await contract.submitTransaction('RegisterFisher', fisherId, name, govtId);
        await gateway.disconnect();
        logger.info(`Registered fisher ${fisherId}`);
        res.json({ status: 'success', fisherId });
    } catch (error) {
        logger.error('Register fisher error:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

app.post('/submit-catch', async (req, res) => {
    try {
        const { catchId, fisherId, species, weightKg, date, dryingMethod, batchSize, shelfLife, price, lat, lng } = req.body;
        if (!catchId || !fisherId || !species || !weightKg || !date || !dryingMethod || !batchSize || !shelfLife || !price || !lat || !lng) {
            throw new Error('Missing required fields: catchId, fisherId, species, weightKg, date, dryingMethod, batchSize, shelfLife, price, lat, lng');
        }
        const { gateway, network } = await connectToNetwork(
            path.join(__dirname, 'wallet', 'org1admin'),
            'org1admin',
            'Org1MSP'
        );
        const contract = network.getContract('bigdatacc');
        await contract.submitTransaction(
            'LogCatch',
            catchId,
            fisherId,
            species,
            weightKg.toString(),
            date,
            dryingMethod,
            batchSize.toString(),
            shelfLife.toString(),
            price.toString(),
            lat.toString(),
            lng.toString()
        );
        await gateway.disconnect();
        logger.info(`Submitted catch ${catchId} for fisher ${fisherId}`);
        res.json({ status: 'success', catchId });
    } catch (error) {
        logger.error('Submit catch error:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

app.get('/get-catch/:fisherId/:catchId', async (req, res) => {
    try {
        const { fisherId, catchId } = req.params;
        const { gateway, network } = await connectToNetwork(
            path.join(__dirname, 'wallet', 'org1admin'),
            'org1admin',
            'Org1MSP'
        );
        const contract = network.getContract('bigdatacc');
        const result = await contract.evaluateTransaction('GetCatch', fisherId, catchId);
        await gateway.disconnect();
        logger.info(`Retrieved catch ${catchId} for fisher ${fisherId}`);
        res.json(JSON.parse(result.toString()));
    } catch (error) {
        logger.error('Get catch error:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

app.get('/get-catches/:fisherId', async (req, res) => {
    try {
        const { fisherId } = req.params;
        const { gateway, network } = await connectToNetwork(
            path.join(__dirname, 'wallet', 'org1admin'),
            'org1admin',
            'Org1MSP'
        );
        const contract = network.getContract('bigdatacc');
        const result = await contract.evaluateTransaction('QueryCatchesByFisher', fisherId);
        await gateway.disconnect();
        logger.info(`Retrieved catches for fisher ${fisherId}`);
        res.json(JSON.parse(result.toString()));
    } catch (error) {
        logger.error('Get catches error:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

app.post('/create-batch', async (req, res) => {
    try {
        const { batchId, catchIds, processorId, date } = req.body;
        if (!batchId || !catchIds || !processorId || !date) {
            throw new Error('Missing required fields: batchId, catchIds, processorId, date');
        }
        const { gateway, network } = await connectToNetwork(
            path.join(__dirname, 'wallet', 'org1admin'),
            'org1admin',
            'Org1MSP'
        );
        const contract = network.getContract('bigdatacc');
        await contract.submitTransaction('CreateBatch', batchId, JSON.stringify(catchIds), processorId, date);
        await gateway.disconnect();
        logger.info(`Created batch ${batchId}`);
        res.json({ status: 'success', batchId });
    } catch (error) {
        logger.error('Create batch error:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

app.get('/track-batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const { gateway, network } = await connectToNetwork(
            path.join(__dirname, 'wallet', 'org1admin'),
            'org1admin',
            'Org1MSP'
        );
        const contract = network.getContract('bigdatacc');
        const result = await contract.evaluateTransaction('TrackBatch', batchId);
        await gateway.disconnect();
        logger.info(`Tracked batch ${batchId}`);
        res.json(JSON.parse(result.toString()));
    } catch (error) {
        logger.error('Track batch error:', { message: error.message, stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

app.listen(3001, () => logger.info('Server running on port 3001'));