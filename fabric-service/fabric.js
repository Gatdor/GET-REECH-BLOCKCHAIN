import path from "path";
import fs from "fs";
import { Wallets, Gateway, X509Identity } from "fabric-network";

const ccpPath = path.resolve(process.cwd(), "fabric", "connection-org1.json");
const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

async function getContract() {
  // setup wallet
  const walletPath = path.join(process.cwd(), "fabric", "wallets");
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  // check if identity exists
  const identity = await wallet.get("appUser");
  if (!identity) {
    // load cert + key into wallet
    const credPath = path.join(walletPath, "appUser");
    const cert = fs.readFileSync(path.join(credPath, "cert.pem")).toString();
    const key = fs.readFileSync(path.join(credPath, "key.pem")).toString();

    const x509Identity = {
      credentials: {
        certificate: cert,
        privateKey: key,
      },
      mspId: "Org1MSP",   // ⚠️ must match your org MSP
      type: "X.509",
    };
    await wallet.put("appUser", x509Identity);
  }

  // connect gateway
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: "appUser",
    discovery: { enabled: true, asLocalhost: true },
  });

  // get contract
  const network = await gateway.getNetwork("mychannel");
  const contract = network.getContract("bigdatacc");

  return { contract, gateway };
}

export default getContract;
