const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function importIdentity() {
    const walletPath = path.join(__dirname, 'wallet', 'org1admin');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const certPath = path.join(__dirname, 'wallet', 'org1admin', 'org1admin-cert.pem');
    const keyPath = path.join(__dirname, 'wallet', 'org1admin', 'org1admin-key.pem');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        throw new Error('Certificate or private key not found');
    }

    const cert = fs.readFileSync(certPath).toString();
    const key = fs.readFileSync(keyPath).toString();

    const identity = {
        credentials: {
            certificate: cert,
            privateKey: key,
        },
        mspId: 'Org1MSP',
        type: 'X.509',
    };

    await wallet.put('org1admin', identity);
    console.log('Identity org1admin imported to wallet');
}

importIdentity().catch(console.error);
