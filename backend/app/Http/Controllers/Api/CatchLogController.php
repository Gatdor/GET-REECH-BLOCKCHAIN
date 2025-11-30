<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatchLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CatchLogController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    // ========================================================================
    // STORE – CREATE CATCH + UPLOAD IMAGES
    // ========================================================================
    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'catch_id'      => 'nullable|string|max:255|unique:catch_logs,catch_id',
                'species'       => 'required|string|max:255|regex:/^[a-zA-Z\s]+$/',
                'drying_method' => 'required|in:sun,smoke,freeze',
                'batch_size'    => 'required|numeric|min:0.01|max:10000',
                'weight'        => 'required|numeric|min:0.01|max:10000',
                'harvest_date'  => 'required|date|before_or_equal:today',
                'lat'           => 'required|numeric|between:-90,90',
                'lng'           => 'required|numeric|between:-180,180',
                'shelf_life'    => 'required|integer|min:1|max:365',
                'price'         => 'required|numeric|min:0.01|max:10000',
                'images'        => ['required', 'array', 'min:1', 'max:5'],
                'images.*'      => ['file', 'mimes:jpeg,png,jpg', 'max:5120'], // 5MB
                'quality_score' => 'nullable|numeric|min:0|max:100',
                'status'        => 'nullable|in:pending,approved,rejected',
            ]);

            $userId = Auth::id();
            $catchId = $data['catch_id'] ?? 'CATCH_' . Str::uuid();

            // Upload images
            $imageUrls = [];
            foreach ($request->file('images') as $image) {
                $path = $image->store('catch_images', 'public');
                $imageUrls[] = asset('storage/' . $path);
            }

            // Save to DB
            $log = CatchLog::create([
                'catch_id'   => $catchId,
                'user_id'    => $userId,
                'species'    => $data['species'],
                'drying_method' => $data['drying_method'],
                'batch_size'   => floatval($data['batch_size']),
                'weight'       => floatval($data['weight']),
                'harvest_date' => $data['harvest_date'],
                'location'     => ['lat' => floatval($data['lat']), 'lng' => floatval($data['lng'])],
                'shelf_life'   => (int) $data['shelf_life'],
                'price'        => floatval($data['price']),
                'image_urls'   => $imageUrls,
                'quality_score'=> floatval($data['quality_score'] ?? 0),
                'status'       => $data['status'] ?? 'pending',
            ]);

            return response()->json([
                'catch_id'   => $log->catch_id,
                'image_urls' => $imageUrls,
                'status'     => 'success',
            ], 201);

        } catch (ValidationException $e) {
            Log::error('API CatchLog validation error', ['errors' => $e->errors()]);
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('API CatchLog store error: ' . $e->getMessage());
            return response()->json(['error' => 'Server error'], 500);
        }
    }

    // ========================================================================
    // INDEX – LIST CATCHES
    // ========================================================================
    public function index(Request $request)
    {
        Log::info('CatchLogController@index called', ['user_id' => (string) Auth::id()]);

        try {
            $query = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(NULLIF(location->>'lat', '') AS double precision) AS lat"),
                DB::raw("CAST(NULLIF(location->>'lng', '') AS double precision) AS lng"),
            ])->where('user_id', (string) Auth::id());

            if ($request->filled('status') && in_array($request->status, ['pending', 'approved', 'rejected'])) {
                $query->where('status', $request->status);
            }

            $catches = $query->get()->map(function ($catch) {
                return [
                    'catch_id' => $catch->catch_id,
                    'user_id' => (string) $catch->user_id,
                    'species' => $catch->species,
                    'drying_method' => $catch->drying_method,
                    'batch_size' => floatval($catch->batch_size),
                    'weight' => floatval($catch->weight),
                    'harvest_date' => $catch->harvest_date,
                    'lat' => floatval($catch->lat ?? 0),
                    'lng' => floatval($catch->lng ?? 0),
                    'shelf_life' => (int) $catch->shelf_life,
                    'price' => floatval($catch->price),
                    'image_urls' => $catch->image_urls ?? [],
                    'quality_score' => floatval($catch->quality_score ?? 0),
                    'status' => $catch->status ?? 'pending',
                    'blockchain_transaction_hash' => $catch->blockchain_transaction_hash,
                    'blockchain_block_number' => $catch->blockchain_block_number, // Fixed
                    'created_at' => $catch->created_at,
                    'updated_at' => $catch->updated_at,
                ];
            });

            Log::info('Catches fetched successfully', ['count' => $catches->count()]);
            return response()->json($catches);

        } catch (\Exception $e) {
            Log::error('Error fetching catches', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Error fetching catch logs'], 500);
        }
    }

    // ========================================================================
    // SHOW – GET SINGLE CATCH
    // ========================================================================
    public function show(Request $request, $id)
    {
        Log::info('CatchLogController@show called', ['catch_id' => $id]);

        try {
            $request->validate(['id' => 'required|string']);

            $catch = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(NULLIF(location->>'lat', '') AS double precision) AS lat"),
                DB::raw("CAST(NULLIF(location->>'lng', '') AS double precision) AS lng"),
            ])
                ->where('user_id', (string) Auth::id())
                ->where('catch_id', $id)
                ->firstOrFail();

            Log::info('Catch fetched successfully', ['catch_id' => $catch->catch_id]);

            return response()->json([
                'catch_id' => $catch->catch_id,
                'user_id' => (string) $catch->user_id,
                'species' => $catch->species,
                'drying_method' => $catch->drying_method,
                'batch_size' => floatval($catch->batch_size),
                'weight' => floatval($catch->weight),
                'harvest_date' => $catch->harvest_date,
                'lat' => floatval($catch->lat ?? 0),
                'lng' => floatval($catch->lng ?? 0),
                'shelf_life' => (int) $catch->shelf_life,
                'price' => floatval($catch->price),
                'image_urls' => $catch->image_urls ?? [],
                'quality_score' => floatval($catch->quality_score ?? 0),
                'status' => $catch->status ?? 'pending',
                'blockchain_transaction_hash' => $catch->blockchain_transaction_hash,
                'blockchain_block_number' => $catch->blockchain_block_number, // Fixed
                'created_at' => $catch->created_at,
                'updated_at' => $catch->updated_at,
            ]);

        } catch (ValidationException $e) {
            Log::error('Validation error in show', ['catch_id' => $id, 'errors' => $e->errors()]);
            return response()->json(['message' => 'Invalid catch ID', 'errors' => $e->errors()], 400);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Catch not found', ['catch_id' => $id, 'user_id' => (string) Auth::id()]);
            return response()->json(['message' => 'Catch log not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching catch', [
                'catch_id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Error fetching catch log'], 500);
        }
    }

    // ========================================================================
    // APPROVE – UPDATE STATUS + FABRIC
    // ========================================================================
    public function approve(Request $request, $id)
    {
        Log::info('CatchLogController@approve called', ['catch_id' => $id]);

        try {
            $request->validate(['id' => 'required|string']);

            $catch = CatchLog::where('user_id', (string) Auth::id())
                ->where('catch_id', $id)
                ->firstOrFail();

            $catch->update(['status' => 'approved']);

            // Example: call external Fabric service
            // $fabricData = $this->fabricService->logCatchApproval(...);

            // Simulate response
            $fabricData = [
                'transaction_hash' => '0x_fake_hash_123',
                'block_number' => 12345,
            ];

            $catch->update([
                'blockchain_transaction_hash' => $fabricData['transaction_hash'],
                'blockchain_block_number' => $fabricData['block_number'],
            ]);

            Log::info('Catch approved successfully', ['catch_id' => $catch->catch_id]);

            return response()->json([
                'catch_id' => $catch->catch_id,
                'status' => $catch->status,
                'blockchain_transaction_hash' => $catch->blockchain_transaction_hash,
                'blockchain_block_number' => $catch->blockchain_block_number,
            ]);

        } catch (ValidationException $e) {
            Log::error('Validation error in approve', ['catch_id' => $id, 'errors' => $e->errors()]);
            return response()->json(['message' => 'Invalid catch ID', 'errors' => $e->errors()], 400);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Catch not found for approval', ['catch_id' => $id]);
            return response()->json(['message' => 'Catch log not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error approving catch', [
                'catch_id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Error approving catch log'], 500);
        }
    }
}