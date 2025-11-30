<?php

namespace App\Http\Controllers;

use App\Models\CatchLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Http;

class CatchLogController extends Controller
{
    public function store(Request $request)
    {
        try {
            // Validate request
            $data = $request->validate([
                'catch_id'      => ['nullable', 'string', 'max:255', 'unique:catch_logs,catch_id'],
                'user_id'       => ['nullable', 'string', 'exists:users,id'],
                'species'       => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s]+$/'],
                'drying_method' => ['required', 'string', 'in:sun,smoke,freeze'],
                'batch_size'    => ['required', 'numeric', 'min:0.01', 'max:10000'],
                'weight'        => ['required', 'numeric', 'min:0.01', 'max:10000'],
                'harvest_date'  => ['required', 'date', 'before_or_equal:today'],
                'lat'           => ['required', 'numeric', 'between:-90,90'],
                'lng'           => ['required', 'numeric', 'between:-180,180'],
                'shelf_life'    => ['required', 'integer', 'min:1', 'max:365'],
                'price'         => ['required', 'numeric', 'min:0.01', 'max:10000'],
                'images'        => ['required', 'array', 'min:1', 'max:5'],           // REQUIRED
                'images.*'      => ['file', 'mimes:jpeg,png,jpg', 'max:5120'],       // 5MB
                'quality_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'status'        => ['nullable', 'in:pending,approved,rejected'],
            ]);

            $userId = $data['user_id'] ?? Auth::id();
            if (!$userId) {
                Log::warning('CatchLogController::store: Unauthenticated user', [
                    'headers' => $request->headers->all(),
                    'ip' => $request->ip(),
                ]);
                return response()->json(['error' => __('auth.unauthenticated')], 401);
            }

            // Generate catch_id if not provided
            $catchId = $data['catch_id'] ?? 'CATCH_' . Str::uuid();

            // Handle image uploads
            $imageUrls = [];
            foreach ($request->file('images') as $image) {
                try {
                    $path = $image->store('catch_images', 'public');
                    $imageUrls[] = asset('storage/' . $path);
                } catch (\Exception $e) {
                    Log::error('Image upload failed: ' . $e->getMessage(), [
                        'file' => $image->getClientOriginalName(),
                        'catch_id' => $catchId,
                    ]);
                    return response()->json(['error' => 'Failed to store image'], 500);
                }
            }

            // Create catch log
            $log = CatchLog::create([
                'catch_id' => $catchId,
                'user_id' => $userId,
                'species' => $data['species'],
                'drying_method' => $data['drying_method'],
                'batch_size' => floatval($data['batch_size']),
                'weight' => floatval($data['weight']),
                'harvest_date' => $data['harvest_date'],
                'location' => ['lat' => floatval($data['lat']), 'lng' => floatval($data['lng'])],
                'shelf_life' => (int) $data['shelf_life'],
                'price' => floatval($data['price']),
                'image_urls' => $imageUrls,
                'quality_score' => floatval($data['quality_score'] ?? null),
                'status' => $data['status'] ?? 'pending',
                'blockchain_transaction_hash' => null,
                'blockchain_block_number' => null,
            ]);

            // Submit to Hyperledger Fabric
            try {
                $fabricResponse = Http::post('http://localhost:3001/api/catches', [
                    'catch_id' => $catchId,
                    'fisher_id' => $userId,
                    'species' => $data['species'],
                    'weight' => (string) $data['weight'],
                    'harvest_date' => $data['harvest_date'],
                    'drying_method' => $data['drying_method'],
                    'batch_size' => (string) $data['batch_size'],
                    'shelf_life' => (string) $data['shelf_life'],
                    'price' => (string) $data['price'],
                    'lat' => (string) $data['lat'],
                    'lng' => (string) $data['lng'],
                    'images' => $imageUrls,  // SEND IMAGE URLS TO FABRIC
                ])->json();

                if ($fabricResponse['error'] ?? false) {
                    Log::error('Fabric API error: ' . $fabricResponse['error'], [
                        'catch_id' => $catchId,
                        'payload' => $fabricResponse,
                    ]);
                } else {
                    $log->update([
                        'blockchain_transaction_hash' => $fabricResponse['transaction_id'] ?? null,
                        'blockchain_block_number' => $fabricResponse['block_number'] ?? null,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('CatchLogController::store Fabric error: ' . $e->getMessage(), [
                    'catch_id' => $catchId,
                    'user_id' => $userId,
                    'payload' => [
                        'catch_id' => $catchId,
                        'fisher_id' => $userId,
                        'species' => $data['species'],
                        'weight' => (string) $data['weight'],
                        'harvest_date' => $data['harvest_date'],
                        'drying_method' => $data['drying_method'],
                        'batch_size' => (string) $data['batch_size'],
                        'shelf_life' => (string) $data['shelf_life'],
                        'price' => (string) $data['price'],
                        'lat' => (string) $data['lat'],
                        'lng' => (string) $data['lng'],
                        'images' => $imageUrls,
                    ],
                ]);
            }

            // Re-select with lat/lng projection
            $created = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(NULLIF(location->>'lng', '') AS FLOAT) AS lng"),
                DB::raw("CAST(NULLIF(location->>'lat', '') AS FLOAT) AS lat"),
            ])
                ->where('catch_id', $catchId)
                ->first();

            Log::info('Catch created successfully', ['catch_id' => $catchId, 'data' => $created->toArray()]);

            return response()->json([
                'catch_id' => $created->catch_id,
                'user_id' => (string) $created->user_id,
                'species' => $created->species,
                'drying_method' => $created->drying_method,
                'batch_size' => floatval($created->batch_size),
                'weight' => floatval($created->weight),
                'harvest_date' => $created->harvest_date,
                'lat' => floatval($created->lat ?? 0),
                'lng' => floatval($created->lng ?? 0),
                'shelf_life' => (int) $created->shelf_life,
                'price' => floatval($created->price),
                'image_urls' => $created->image_urls ?? [],
                'quality_score' => floatval($created->quality_score ?? 0),
                'status' => $created->status ?? 'pending',
                'blockchain_transaction_hash' => $created->blockchain_transaction_hash,
                'blockchain_block_number' => $created->blockchain_block_number,
                'created_at' => $created->created_at,
                'updated_at' => $created->updated_at,
            ], 201);

        } catch (ValidationException $e) {
            Log::error('Validation error in store', [
                'errors' => $e->errors(),
                'request' => $request->all(),
            ]);
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('CatchLogController::store error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'user_id' => $request->user() ? $request->user()->id : null,
            ]);
            return response()->json(['error' => 'Failed to store catch log'], 500);
        }
    }
}