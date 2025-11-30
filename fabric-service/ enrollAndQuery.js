// enrollAndQuery.js
const FabricCAServices = require('fabric-ca-client');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, 'connection-profile.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // CA setup
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: true });

        // Wallet setup
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Enroll admin if not already enrolled
        const adminIdentity = await wallet.get('Org1admin');
        if (!adminIdentity) {
            console.log('Enrolling admin...');
            const enrollment = await ca.enroll({ enrollmentID: 'Org1admin', enrollmentSecret: 'adminpw' });
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
            await wallet.put('admin', x509Identity);
            console.log('✅ Admin enrolled successfully');
        } else {
            console.log('Admin already exists in the wallet');
        }

        // Connect to gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });

        // Access channel and chaincode
        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('bigdatacc');

        // Query example
        const result = await contract.evaluateTransaction('GetCatch', 'CATCH_1234567890');
        console.log(`✅ Chaincode result: ${result.toString()}`);

        await gateway.disconnect();
    } catch (error) {
        console.error(`❌ Error: ${error}`);
    }
}

main();
