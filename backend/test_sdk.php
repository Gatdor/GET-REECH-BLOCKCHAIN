<?php
require 'vendor/autoload.php';
use AmericanExpress\HyperledgerFabricClient\Connection;

try {
    $connection = new Connection(base_path('connection-profile.yaml'));
    $client = $connection->getClient();
    $channel = $client->getChannel('mychannel');
    $contract = $channel->getContract('bigdatacc');
    $result = $contract->evaluateTransaction('GetCatch', 'CATCH_1234567890');
    echo $result . PHP_EOL;
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
