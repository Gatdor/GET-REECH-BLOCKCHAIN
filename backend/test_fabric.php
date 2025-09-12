<?php

require 'vendor/autoload.php';

use App\Services\FabricService;

try {
    $fabricService = app(FabricService::class);
    $result = $fabricService->createCatch([
        'batch_id' => 'TEST_001',
        'user_id' => 'dff1bf21-1bcf-4082-a705-c8e66487c2da',
        'species' => 'Tilapia',
        'drying_method' => 'Sun',
        'batch_size' => 100.0,
        'weight' => 50.0,
        'harvest_date' => '2025-09-05',
        'location' => ['lat' => 1.23, 'lng' => 36.78],
        'shelf_life' => 30,
        'price' => 10.0,
        'quality_score' => 80.0,
        'status' => 'pending',
    ]);
    echo "CreateCatch Result: " . json_encode($result, JSON_PRETTY_PRINT) . "\n";

    $result = $fabricService->getCatch('TEST_001');
    echo "GetCatch Result: " . json_encode($result, JSON_PRETTY_PRINT) . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}