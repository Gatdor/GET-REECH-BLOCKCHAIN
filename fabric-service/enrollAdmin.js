const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const connectionProfile = JSON.parse(fs.readFileSync('connection-profile.json', 'utf8'));
        const caInfo = connectionProfile.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false });

        // Use org1admin instead of admin
        const adminExists = await wallet.get('org1admin');
        if (adminExists) {
            console.log('✅ org1admin already enrolled');
            return;
        }

        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });

        const identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put('org1admin', identity);
        console.log('✅ org1admin enrolled and imported into wallet');
    } catch (error) {
        console.error('❌ Error enrolling admin:', error.message);
    }
}

main();
