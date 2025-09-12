<?php
namespace App\Http\Controllers\Api;

use App\Models\CatchLog;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Services\FabricService;

class CatchLogController extends Controller
{
    protected $fabricService;

    public function __construct(FabricService $fabricService)
    {
        $this->middleware('auth:sanctum');
        $this->fabricService = $fabricService;
    }

    public function store(Request $request)
    {
        Log::info('CatchLogController@store called', ['input' => $request->all()]);

        try {
            $data = $request->validate([
                'catch_id' => ['required', 'string', 'max:255', 'unique:catch_logs,catch_id'],
                'species' => ['required', 'string', 'max:255'],
                'drying_method' => ['required', 'string', 'max:255'],
                'batch_size' => ['required', 'numeric', 'min:0.01', 'max:10000'],
                'weight' => ['required', 'numeric', 'min:0.01', 'max:10000'],
                'harvest_date' => ['required', 'date', 'before_or_equal:today'],
                'lat' => ['required', 'numeric', 'between:-90,90'],
                'lng' => ['required', 'numeric', 'between:-180,180'],
                'shelf_life' => ['required', 'integer', 'min:1', 'max:365'],
                'price' => ['required', 'numeric', 'min:0.01', 'max:10000'],
                'image_urls' => ['nullable', 'array'],
                'image_urls.*' => ['string'],
                'quality_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            ], [
                'catch_id.unique' => 'The catch ID is already in use.',
                'lat.between' => 'Latitude must be between -90 and 90 degrees.',
                'lng.between' => 'Longitude must be between -180 and 180 degrees.',
            ]);

            $logData = [
                'catch_id' => $data['catch_id'],
                'user_id' => (string) Auth::id(),
                'species' => $data['species'],
                'drying_method' => $data['drying_method'],
                'batch_size' => floatval($data['batch_size']),
                'weight' => floatval($data['weight']),
                'harvest_date' => $data['harvest_date'],
                'location' => json_encode(['lat' => floatval($data['lat']), 'lng' => floatval($data['lng'])]),
                'shelf_life' => (int) $data['shelf_life'],
                'price' => floatval($data['price']),
                'image_urls' => $data['image_urls'] ?? [],
                'quality_score' => floatval($data['quality_score'] ?? 0),
                'status' => $data['status'] ?? 'pending',
                'blockchain_transaction_hash' => null,
                'blockchain_block_number' => null,
            ];

            $log = DB::transaction(function () use ($logData, $data) {
                $log = CatchLog::create($logData);

                $fabricData = $this->fabricService->logCatch(
                    $data['catch_id'],
                    (string) Auth::id(),
                    $data['species'],
                    (string) $data['weight'],
                    $data['harvest_date']
                );

                $log->update([
                    'blockchain_transaction_hash' => $fabricData['transaction_hash'],
                    'blockchain_block_number' => $fabricData['block_number'],
                ]);

                return $log;
            });

            $created = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(NULLIF(location->>'lat', '') AS double precision) AS lat"),
                DB::raw("CAST(NULLIF(location->>'lng', '') AS double precision) AS lng"),
            ])->where('catch_id', $log->catch_id)->first();

            Log::info('Catch created successfully', ['catch_id' => $log->catch_id, 'data' => $created->toArray()]);

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
                'blockchain_block_number' => $created->block_number,
                'created_at' => $created->created_at,
                'updated_at' => $created->updated_at,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error in store', [
                'errors' => $e->errors(),
                'request' => $request->all(),
            ]);
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Create catch error', [
                'message' => $e->getMessage(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Error creating catch log'], 500);
        }
    }

    public function index(Request $request)
    {
        Log::info('CatchLogController@index called', ['user_id' => (string) Auth::id()]);

        try {
            $query = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(NULLIF(location->>'lat', '') AS double precision) AS lat"),
                DB::raw("CAST(NULLIF(location->>'lng', '') AS double precision) AS lng"),
            ])->where('user_id', (string) Auth::id());

            if ($request->has('status') && in_array($request->status, ['pending', 'approved', 'rejected'])) {
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
                    'blockchain_block_number' => $catch->block_number,
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

    public function show(Request $request, $id)
    {
        Log::info('CatchLogController@show called', ['catch_id' => $id]);

        try {
            $request->validate(['id' => ['required', 'string']]);

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
                'blockchain_block_number' => $catch->block_number,
                'created_at' => $catch->created_at,
                'updated_at' => $catch->updated_at,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
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

    public function approve(Request $request, $id)
    {
        Log::info('CatchLogController@approve called', ['catch_id' => $id]);

        try {
            $request->validate(['id' => ['required', 'string']]);

            $catch = CatchLog::where('user_id', (string) Auth::id())->where('catch_id', $id)->firstOrFail();

            $catch->update(['status' => 'approved']);

            $fabricData = $this->fabricService->logCatchApproval(
                $catch->catch_id,
                (string) Auth::id(),
                'approved'
            );

            $catch->update([
                'blockchain_transaction_hash' => $fabricData['transaction_hash'],
                'blockchain_block_number' => $fabricData['block_number'],
            ]);

            Log::info('Catch approved successfully', ['catch_id' => $catch->catch_id]);

            return response()->json([
                'catch_id' => $catch->catch_id,
                'status' => $catch->status,
                'blockchain_transaction_hash' => $catch->blockchain_transaction_hash,
                'blockchain_block_number' => $catch->block_number,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error in approve', ['catch_id' => $id, 'errors' => $e->errors()]);
            return response()->json(['message' => 'Invalid catch ID', 'errors' => $e->errors()], 400);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Catch not found for approval', ['catch_id' => $id, 'user_id' => (string) Auth::id()]);
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
