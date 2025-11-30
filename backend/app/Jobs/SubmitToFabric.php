<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class SubmitToFabric implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $catchId;
    protected string $userId;
    protected array $data;

    // Max attempts and backoff
    public $tries = 5;
    public $backoff = [10, 30, 60, 120, 300]; // seconds

    /**
     * Create a new job instance.
     */
    public function __construct(string $catchId, string $userId, array $data)
    {
        $this->catchId = $catchId;
        $this->userId = $userId;

        // Only store URLs for images to avoid serialization issues
        if (isset($data['images'])) {
            $data['images'] = array_map(fn($img) => is_string($img) ? $img : null, $data['images']);
        }

        $this->data = $data;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $fabricBaseUrl = config('services.fabric.url', 'http://localhost:3001/api');

        try {
            // 1️⃣ Check if catch already exists
            $existingCatch = Http::timeout(10)->get("{$fabricBaseUrl}/catches/{$this->userId}/{$this->catchId}")->json();
            if (!empty($existingCatch)) {
                Log::info("Catch {$this->catchId} already exists on Fabric, skipping submission.");
                return;
            }

            // 2️⃣ Check if fisher exists
            $checkFisher = Http::timeout(10)->post("{$fabricBaseUrl}/fishers/check", [
                'fisher_id' => $this->userId,
            ])->json();

            if (!($checkFisher['exists'] ?? false)) {
                $createFisher = Http::timeout(10)->post("{$fabricBaseUrl}/fishers", [
                    'fisher_id' => $this->userId,
                    'name' => $this->data['fisher_name'] ?? 'Unknown',
                    'email' => $this->data['fisher_email'] ?? null,
                ])->json();

                if ($createFisher['error'] ?? false) {
                    Log::error("Failed to create fisher on Fabric", [
                        'fisher_id' => $this->userId,
                        'response' => $createFisher,
                    ]);
                    return; // Stop if fisher creation fails
                }

                Log::info("Fisher created on Fabric", ['fisher_id' => $this->userId]);
            }

            // 3️⃣ Submit the catch
            $catchResponse = Http::timeout(10)->post("{$fabricBaseUrl}/catches", [
                'catch_id' => $this->catchId,
                'fisher_id' => $this->userId,
                'species' => $this->data['species'],
                'weight' => (string) $this->data['weight'],
                'harvest_date' => $this->data['harvest_date'],
                'drying_method' => $this->data['drying_method'],
                'batch_size' => (string) $this->data['batch_size'],
                'shelf_life' => (string) $this->data['shelf_life'],
                'price' => (string) $this->data['price'],
                'lat' => (string) $this->data['lat'],
                'lng' => (string) $this->data['lng'],
            ])->json();

            if (($catchResponse['error'] ?? false) && !str_contains($catchResponse['error'], 'already exists')) {
                Log::error("SubmitToFabric failed for catch {$this->catchId}", ['response' => $catchResponse]);
                // Trigger a retry if it's a temporary error
                throw new \Exception("Temporary Fabric error: " . ($catchResponse['error'] ?? 'Unknown'));
            }

            Log::info("SubmitToFabric succeeded (or already exists) for catch {$this->catchId}", ['response' => $catchResponse]);

        } catch (Throwable $e) {
            // Handle duplicates gracefully
            if (str_contains($e->getMessage(), 'already exists')) {
                Log::warning("Catch {$this->catchId} already exists on Fabric, skipping.", ['exception' => $e->getMessage()]);
                return;
            }

            // Throw to let Laravel queue retry with backoff
            Log::error("SubmitToFabric exception for catch {$this->catchId}, retrying...", [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e; // Laravel will handle retries automatically
        }
    }
}
