const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
  const walletPath = path.join(__dirname, 'wallet');
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const ccp = JSON.parse(fs.readFileSync('connection-profile.json', 'utf8'));

  const gateway = new Gateway();
  await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });

  const network = await gateway.getNetwork('mychannel');
  const contract = network.getContract('bigdatacc');

  const result = await contract.evaluateTransaction('GetCatch', 'CATCH_123');
  console.log(result.toString());

  await gateway.disconnect();
}

main();
