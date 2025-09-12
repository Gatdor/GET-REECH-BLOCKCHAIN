<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FabricService
{
    protected $endpoint;

    public function __construct()
    {
        $this->endpoint = config('fabric.endpoint', 'http://localhost:3000'); // configurable
        Log::info('FabricService instantiated, endpoint: ' . $this->endpoint);
    }

    /**
     * Log a new catch to the blockchain.
     */
    public function logCatch(string $catchId, string $fisherId, string $species, float $weightKg, string $date): array
    {
        try {
            $response = Http::post("{$this->endpoint}/submit-catch", [
                'catchId' => $catchId,
                'fisherId' => $fisherId,
                'species' => $species,
                'weightKg' => $weightKg,
                'date' => $date,
            ]);

            $result = $response->json();

            if ($response->successful() && isset($result['success']) && $result['success'] === true) {
                Log::info('FabricService@logCatch succeeded', ['catch_id' => $catchId, 'result' => $result]);
                return [
                    'transaction_hash' => $result['transactionId'] ?? 'hash_' . $catchId,
                    'block_number' => $result['blockNumber'] ?? 1,
                ];
            }

            Log::error('FabricService@logCatch failed', ['catch_id' => $catchId, 'response' => $result]);
            throw new \Exception('Failed to log catch to blockchain');

        } catch (\Exception $e) {
            Log::error('FabricService@logCatch exception', [
                'catch_id' => $catchId,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Approve or reject a catch on the blockchain.
     */
    public function logCatchApproval(string $catchId, string $fisherId, string $status): array
    {
        try {
            $response = Http::post("{$this->endpoint}/update-catch-status", [
                'catchId' => $catchId,
                'fisherId' => $fisherId,
                'status' => $status,
            ]);

            $result = $response->json();

            if ($response->successful() && isset($result['success']) && $result['success'] === true) {
                Log::info('FabricService@logCatchApproval succeeded', ['catch_id' => $catchId, 'status' => $status]);
                return [
                    'transaction_hash' => $result['transactionId'] ?? 'hash_approval_' . $catchId,
                    'block_number' => $result['blockNumber'] ?? 1,
                ];
            }

            Log::error('FabricService@logCatchApproval failed', ['catch_id' => $catchId, 'response' => $result]);
            throw new \Exception('Failed to update catch status');

        } catch (\Exception $e) {
            Log::error('FabricService@logCatchApproval exception', [
                'catch_id' => $catchId,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Retrieve catch details from the blockchain.
     */
    public function getCatch(string $catchId): array
    {
        try {
            $response = Http::get("{$this->endpoint}/get-catch/{$catchId}");
            $result = $response->json();

            if ($response->successful() && isset($result['success']) && $result['success'] === true) {
                Log::info('FabricService@getCatch succeeded', ['catch_id' => $catchId, 'result' => $result]);
                return $result['result'] ?? [];
            }

            Log::error('FabricService@getCatch failed', ['catch_id' => $catchId, 'response' => $result]);
            throw new \Exception('Failed to retrieve catch');

        } catch (\Exception $e) {
            Log::error('FabricService@getCatch exception', [
                'catch_id' => $catchId,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}
