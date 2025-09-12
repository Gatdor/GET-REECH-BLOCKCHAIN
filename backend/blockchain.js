const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

const ccpPath = path.resolve(__dirname, '..', '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
const caCertPath = path.resolve(__dirname, '..', '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'ca', 'ca.org1.example.com-cert.pem');
const walletPath = path.resolve(__dirname, 'wallet');

async function connectToNetwork() {
    try {
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            const ca = new FabricCAServices('ca.org1.example.com', { trustedRoots: [fs.readFileSync(caCertPath)], verify: true }, 'ca-org1');
            const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
            await wallet.put('admin', x509Identity);
        }
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin',
            discovery: { enabled: true, asLocalhost: true },
        });
        return gateway;
    } catch (error) {
        console.error(`Failed to connect to network: ${error}`);
        throw error;
    }
}

async function invokeChaincode(functionName, ...args) {
    try {
        const gateway = await connectToNetwork();
        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('bigdatacc');
        const result = await contract.submitTransaction(functionName, ...args);
        await gateway.disconnect();
        return result.toString();
    } catch (error) {
        console.error(`Failed to invoke ${functionName}: ${error}`);
        throw error;
    }
}

async function queryChaincode(functionName, ...args) {
    try {
        const gateway = await connectToNetwork();
        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('bigdatacc');
        const result = await contract.evaluateTransaction(functionName, ...args);
        await gateway.disconnect();
        return JSON.parse(result.toString());
    } catch (error) {
        console.error(`Failed to query ${functionName}: ${error}`);
        throw error;
    }
}

module.exports = { invokeChaincode, queryChaincode };