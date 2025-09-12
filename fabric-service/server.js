const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

async function connectToNetwork(walletPath, identityLabel, mspId) {
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log('Identity labels:', await wallet.list());

    if (!(await wallet.list()).includes(identityLabel)) {
        const certPath = path.join(walletPath, `${identityLabel}-cert.pem`);
        const keyPath = path.join(walletPath, `${identityLabel}-key.pem`);
        if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
            throw new Error(`Certificate or key file not found for ${identityLabel}`);
        }
        const cert = fs.readFileSync(certPath).toString();
        const key = fs.readFileSync(keyPath).toString();
        const identity = {
            credentials: {
                certificate: cert,
                privateKey: key,
            },
            mspId: mspId,
            type: 'X.509',
        };
        await wallet.put(identityLabel, identity);
        console.log(`${identityLabel} identity imported into wallet`);
    } else {
        console.log(`${identityLabel} identity found in wallet`);
    }

    const connectionProfilePath = path.join(__dirname, 'connection-profile.json');
    console.log('Connection profile path:', connectionProfilePath);
    console.log('Connection profile exists:', fs.existsSync(connectionProfilePath));
    if (!fs.existsSync(connectionProfilePath)) {
        throw new Error('Connection profile not found');
    }
    const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
    console.log('Connection profile peers:', Object.keys(connectionProfile.peers));
    console.log('Connection profile orderers:', Object.keys(connectionProfile.orderers));
    console.log('Connection profile CAs:', Object.keys(connectionProfile.certificateAuthorities));

    const gateway = new Gateway();
    const connectOptions = {
        wallet,
        identity: identityLabel,
        discovery: { enabled: false }
    };
    console.log('Connecting with options:', JSON.stringify(connectOptions, null, 2));
    await gateway.connect(connectionProfile, connectOptions);
    console.log('Connected to gateway');
    return { gateway, network: await gateway.getNetwork('mychannel') };
}

app.post('/submit-catch', async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new Error('Request body is empty or invalid');
        }
        console.log('Request body:', req.body);

        const { gateway, network } = await connectToNetwork(
            path.join(__dirname, 'wallet/org1admin'),
            'org1admin',
            'Org1MSP'
        );
        const contract = network.getContract('bigdatacc');
        console.log('Contract retrieved: bigdatacc');
        console.log('Submitting transaction with args:', Object.values(req.body));
        const result = await contract.submitTransaction('LogCatch', ...Object.values(req.body));
        console.log('Transaction result:', result.toString());
        await gateway.disconnect();
        res.json({ status: 'success', result: result.toString() });
    } catch (error) {
        console.error('Submit catch error:', error.message, error.stack);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

app.get('/get-catch/:catchId', async (req, res) => {
    try {
        const { gateway, network } = await connectToNetwork(
            path.join(__dirname, 'wallet/org1admin'),
            'org1admin',
            'Org1MSP'
        );
        const contract = network.getContract('bigdatacc');
        console.log('Contract retrieved: bigdatacc');
        console.log('Evaluating transaction for catchId:', req.params.catchId);
        const result = await contract.evaluateTransaction('GetCatch', req.params.catchId);
        console.log('Query result:', result.toString());
        await gateway.disconnect();
        res.json(JSON.parse(result.toString()));
    } catch (error) {
        console.error('Get catch error:', error.message, error.stack);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
