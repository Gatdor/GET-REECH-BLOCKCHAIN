<?php

namespace App\Services;

class BlockchainService
{
    protected $basePath;
    protected $envPath;
    protected $channel = 'mychannel';
    protected $chaincode = 'bigdatacc';

    public function __construct()
    {
        $this->basePath = base_path('../fabric-samples/test-network');
        $this->envPath = base_path('../fabric-samples/test-network/scripts/envVar.sh');
    }

    public function invokeLogCatch($catchID, $fisherID, $species, $weightKg, $date)
    {
        $command = "cd {$this->basePath} && . {$this->envPath} && setGlobals 1 && " .
                   "peer chaincode invoke " .
                   "-o localhost:7050 " .
                   "--ordererTLSHostnameOverride orderer.example.com " .
                   "--tls --cafile {$this->basePath}/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem " .
                   "-C {$this->channel} " .
                   "-n {$this->chaincode} " .
                   "--peerAddresses localhost:7051 --tlsRootCertFiles {$this->basePath}/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem " .
                   "--peerAddresses localhost:9051 --tlsRootCertFiles {$this->basePath}/organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem " .
                   "-c '{\"function\":\"LogCatch\",\"Args\":[\"{$catchID}\",\"{$fisherID}\",\"{$species}\",\"{$weightKg}\",\"{$date}\"]}' 2>&1";

        exec($command, $output, $returnCode);

        if ($returnCode !== 0) {
            throw new \Exception('Failed to invoke LogCatch: ' . implode("\n", $output));
        }

        return ['message' => 'Catch logged successfully', 'output' => $output];
    }

    public function queryCatch($catchID)
    {
        $command = "cd {$this->basePath} && . {$this->envPath} && setGlobals 1 && " .
                   "peer chaincode query " .
                   "-C {$this->channel} " .
                   "-n {$this->chaincode} " .
                   "-c '{\"function\":\"GetCatch\",\"Args\":[\"{$catchID}\"]}' 2>&1";

        exec($command, $output, $returnCode);

        if ($returnCode !== 0) {
            throw new \Exception('Failed to query GetCatch: ' . implode("\n", $output));
        }

        return json_decode(implode("\n", $output), true);
    }
}