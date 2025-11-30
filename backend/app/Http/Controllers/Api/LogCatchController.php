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
use Illuminate\Support\Facades\Http;
use App\Jobs\SubmitToFabric;

class LogCatchController extends Controller
{
    protected $fabricUrl = 'http://localhost:3001/api/catches';
    

    public function store(Request $request)
    {
        try {
            Log::info('LogCatchController::store called', ['request' => $request->all()]);

            // Map frontend's camelCase to snake_case
            $requestData = $request->all();
            if (isset($requestData['catchId'])) {
                $requestData['catch_id'] = $requestData['catchId'];
                unset($requestData['catchId']);
            }
            if (isset($requestData['fisherId'])) {
                $requestData['user_id'] = $requestData['fisherId'];
                unset($requestData['fisherId']);
            }
            $request->merge($requestData);

            $data = $request->validate([
                'catch_id' => ['nullable', 'string', 'max:255', 'unique:catch_logs,catch_id'],
                'user_id' => ['nullable', 'string', 'exists:users,id'],
                'species' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s]+$/'],
                'drying_method' => ['required', 'string', 'in:sun,smoke,freeze'],
                'batch_size' => ['required', 'numeric', 'min:0.01', 'max:10000'],
                'weight' => ['required', 'numeric', 'min:0.01', 'max:10000'],
                'harvest_date' => ['required', 'date', 'before_or_equal:today'],
                'lat' => ['required', 'numeric', 'between:-90,90'],
                'lng' => ['required', 'numeric', 'between:-180,180'],
                'shelf_life' => ['required', 'integer', 'min:1', 'max:365'],
                'price' => ['required', 'numeric', 'min:0.01', 'max:10000'],
                'images' => ['nullable', 'array', 'max:5'],
                'images.*' => ['file', 'mimes:jpeg,png,jpg', 'max:5120'],
                'quality_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'status' => ['nullable', 'in:pending,approved,rejected'],
            ]);

            $userId = $data['user_id'] ?? Auth::id();
            if (!$userId) {
                Log::warning('LogCatchController::store: Unauthenticated user', [
                    'headers' => $request->headers->all(),
                    'ip' => $request->ip(),
                ]);
                return response()->json(['error' => __('auth.unauthenticated')], 401);
            }

            $catchId = $data['catch_id'] ?? 'CATCH_' . Str::uuid();

            $imageUrls = [];
            if ($request->hasFile('images')) {
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
            }

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

            try {
                $fabricResponse = Http::withOptions(['verify' => false])->post($this->fabricUrl, [
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
                ])->json();

                if ($fabricResponse['error'] ?? false) {
                    Log::error('Fabric API error: ' . $fabricResponse['error'], [
                        'catch_id' => $catchId,
                        'payload' => $fabricResponse,
                    ]);
                    SubmitToFabric::dispatch($catchId, $userId, $data)->delay(now()->addMinutes(5));
                } else {
                    $log->update([
                        'blockchain_transaction_hash' => $fabricResponse['transaction_id'] ?? null,
                        'blockchain_block_number' => $fabricResponse['block_number'] ?? null,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('LogCatchController::store Fabric error: ' . $e->getMessage(), [
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
                    ],
                ]);
                SubmitToFabric::dispatch($catchId, $userId, $data)->delay(now()->addMinutes(5));
            }

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
            Log::error('LogCatchController::store error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'user_id' => $request->user() ? $request->user()->id : null,
            ]);
            return response()->json(['error' => 'Failed to store catch log'], 500);
        }
    }

   public function index(Request $request)
{
    try {
        Log::info('LogCatchController::index called', ['user_id' => (string) Auth::id()]);

        $user = Auth::user();

        // THIS IS THE ONLY CHANGE — ADMIN SEES ALL CATCHES IN KENYA
        if ($user && $user->role === 'admin') {
            $logs = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(NULLIF(location->>'lng', '') AS FLOAT) AS lng"),
                DB::raw("CAST(NULLIF(location->>'lat', '') AS FLOAT) AS lat"),
            ])
                ->with('user:id,name,phone') // optional: show fisherman name
                ->latest()
                ->get();
        } else {
            // Normal fisherman — sees only their own
            $userId = $request->query('user_id') ?? Auth::id();
            if (!$userId) {
                return response()->json(['error' => 'User ID is required'], 400);
            }

            $logs = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(NULLIF(location->>'lng', '') AS FLOAT) AS lng"),
                DB::raw("CAST(NULLIF(location->>'lat', '') AS FLOAT) AS lat"),
            ])
                ->where('user_id', $userId)
                ->latest()
                ->get();
        }

        // Format response exactly like before (so frontend doesn't notice anything)
        $formatted = $logs->map(function ($log) {
            return [
                'catch_id' => $log->catch_id,
                'user_id' => (string) $log->user_id,
                'fisherman_name' => $log->user->name ?? 'Unknown', // bonus for admin
                'species' => $log->species,
                'drying_method' => $log->drying_method,
                'batch_size' => floatval($log->batch_size),
                'weight' => floatval($log->weight),
                'harvest_date' => $log->harvest_date,
                'lat' => floatval($log->lat ?? 0),
                'lng' => floatval($log->lng ?? 0),
                'shelf_life' => (int) $log->shelf_life,
                'price' => floatval($log->price),
                'image_urls' => $log->image_urls ?? [],
                'quality_score' => floatval($log->quality_score ?? 0),
                'status' => $log->status ?? 'pending',
                'blockchain_transaction_hash' => $log->blockchain_transaction_hash,
                'blockchain_block_number' => $log->blockchain_block_number,
                'created_at' => $log->created_at,
                'updated_at' => $log->updated_at,
            ];
        });

        Log::info('Catches fetched successfully', ['count' => $formatted->count(), 'role' => $user?->role]);
        return response()->json($formatted, 200);

    } catch (\Exception $e) {
        Log::error('LogCatchController::index error: ' . $e->getMessage(), [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ]);
        return response()->json(['error' => 'Failed to fetch catch logs'], 500);
    }
}

    public function show($catchId)
    {
        try {
            Log::info('LogCatchController::show called', ['catch_id' => $catchId]);

            $log = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(NULLIF(location->>'lng', '') AS FLOAT) AS lng"),
                DB::raw("CAST(NULLIF(location->>'lat', '') AS FLOAT) AS lat"),
            ])
                ->where('catch_id', $catchId)
                ->where('user_id', Auth::id())
                ->firstOrFail();

            Log::info('Catch fetched successfully', ['catch_id' => $log->catch_id]);
            return response()->json([
                'catch_id' => $log->catch_id,
                'user_id' => (string) $log->user_id,
                'species' => $log->species,
                'drying_method' => $log->drying_method,
                'batch_size' => floatval($log->batch_size),
                'weight' => floatval($log->weight),
                'harvest_date' => $log->harvest_date,
                'lat' => floatval($log->lat ?? 0),
                'lng' => floatval($log->lng ?? 0),
                'shelf_life' => (int) $log->shelf_life,
                'price' => floatval($log->price),
                'image_urls' => $log->image_urls ?? [],
                'quality_score' => floatval($log->quality_score ?? 0),
                'status' => $log->status ?? 'pending',
                'blockchain_transaction_hash' => $log->blockchain_transaction_hash,
                'blockchain_block_number' => $log->blockchain_block_number,
                'created_at' => $log->created_at,
                'updated_at' => $log->updated_at,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Catch not found', ['catch_id' => $catchId, 'user_id' => (string) Auth::id()]);
            return response()->json(['error' => 'Catch log not found'], 404);
        } catch (\Exception $e) {
            Log::error('LogCatchController::show error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'catch_id' => $catchId,
            ]);
            return response()->json(['error' => 'Failed to fetch catch log'], 500);
        }
    } 

    public function approve($catchId)
    {
        $catch = CatchLog::where('catch_id', $catchId)->firstOrFail();

        // Only admin can approve
        if (auth()->user()->role !== null && auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $catch->update([
            'status' => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return response()->json([
            'message' => 'Catch approved successfully',
            'catch' => $catch->load('user:id,name')
        ]);
    }
        public function reject(Request $request, $catchId)
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:1000'
        ]);

        $catch = CatchLog::where('catch_id', $catchId)->firstOrFail();

        // Only admin can reject
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Prevent double reject or approve after reject
        if ($catch->status !== 'pending') {
            return response()->json(['message' => 'Catch haiwezi kukataliwa tena'], 400);
        }

        $catch->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'rejected_by' => auth()->id(),
            'rejected_at' => now(),
        ]);

        return response()->json([
            'message' => 'Catch imekataliwa kikamilifu',
            'catch' => $catch->fresh()
        ], 200);
    }
    
}