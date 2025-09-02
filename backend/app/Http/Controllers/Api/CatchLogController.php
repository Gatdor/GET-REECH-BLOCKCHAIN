<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatchLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

class CatchLogController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Display a listing of the catch logs for the authenticated user.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        Log::info('CatchLogController@index called', [
            'user_id' => Auth::id(),
            'status' => $request->query('status'),
            'limit' => $request->query('limit'),
        ]);

        try {
            $request->validate([
                'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
                'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            ]);

            $limit = (int) $request->query('limit', 20);
            $status = $request->query('status');

            $query = CatchLog::query()
                ->select([
                    'catch_logs.*',
                    DB::raw("CAST(NULLIF(location->>'lat', '') AS double precision) AS lat"),
                    DB::raw("CAST(NULLIF(location->>'lng', '') AS double precision) AS lng"),
                ])
                ->where('user_id', Auth::id())
                ->latest();

            if ($status) {
                $query->where('status', $status);
            }

            $results = $query->paginate($limit)->through(function ($catch) {
                return [
                    'catch_id' => (int) $catch->id,
                    'batch_id' => $catch->batch_id,
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
                    'blockchain_block_number' => (int) $catch->blockchain_block_number,
                    'created_at' => $catch->created_at,
                    'updated_at' => $catch->updated_at,
                ];
            });

            Log::info('Catch logs fetched', [
                'user_id' => Auth::id(),
                'count' => $results->total(),
            ]);

            return response()->json($results);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error in index', [
                'errors' => $e->errors(),
                'request' => $request->all(),
            ]);
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Fetch catch logs error', [
                'message' => $e->getMessage(),
                'request' => $request->all(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Error fetching catch logs'], 500);
        }
    }

    /**
     * Store a newly created catch log in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        Log::info('CatchLogController@store called', ['input' => $request->all()]);

        try {
            $data = $request->validate([
                'batch_id' => ['required', 'string', 'max:255', 'unique:catch_logs,batch_id'],
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
                'image_urls.*' => ['url'],
                'quality_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
                'blockchain_transaction_hash' => ['required', 'string', 'max:255'],
                'blockchain_block_number' => ['required', 'integer', 'min:1'],
            ], [
                'batch_id.unique' => 'The batch ID is already in use.',
                'lat.required' => 'Latitude is required.',
                'lng.required' => 'Longitude is required.',
                'lat.between' => 'Latitude must be between -90 and 90 degrees.',
                'lng.between' => 'Longitude must be between -180 and 180 degrees.',
            ]);

            $logData = [
                'batch_id' => $data['batch_id'],
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
                'blockchain_transaction_hash' => $data['blockchain_transaction_hash'],
                'blockchain_block_number' => (int) $data['blockchain_block_number'],
            ];

            $log = DB::transaction(function () use ($logData) {
                return CatchLog::create($logData);
            });

            $created = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(NULLIF(location->>'lat', '') AS double precision) AS lat"),
                DB::raw("CAST(NULLIF(location->>'lng', '') AS double precision) AS lng"),
            ])->find($log->id);

            Log::info('Catch created', ['catch_id' => $log->id, 'data' => $created->toArray()]);

            return response()->json([
                'catch_id' => (int) $created->id,
                'batch_id' => $created->batch_id,
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
                'blockchain_block_number' => (int) $created->blockchain_block_number,
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

    /**
     * Display the specified catch log.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Request $request, $id)
    {
        Log::info('CatchLogController@show called', ['id' => $id]);

        try {
            $validator = Validator::make(['id' => $id], [
                'id' => ['required', 'integer', 'min:1'],
            ]);

            if ($validator->fails()) {
                Log::error('Invalid catch ID', ['id' => $id, 'errors' => $validator->errors()]);
                return response()->json(['message' => 'Invalid catch ID', 'errors' => $validator->errors()], 400);
            }

            $catch = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(NULLIF(location->>'lat', '') AS double precision) AS lat"),
                DB::raw("CAST(NULLIF(location->>'lng', '') AS double precision) AS lng"),
            ])
                ->where('user_id', (string) Auth::id())
                ->findOrFail($id);

            Log::info('Catch fetched', ['catch_id' => $catch->id, 'data' => $catch->toArray()]);

            return response()->json([
                'catch_id' => (int) $catch->id,
                'batch_id' => $catch->batch_id,
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
                'blockchain_block_number' => (int) $catch->blockchain_block_number,
                'created_at' => $catch->created_at,
                'updated_at' => $catch->updated_at,
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error in show', ['id' => $id, 'errors' => $e->errors()]);
            return response()->json(['message' => 'Invalid catch ID', 'errors' => $e->errors()], 400);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Catch not found', ['id' => $id, 'user_id' => (string) Auth::id()]);
            return response()->json(['message' => 'Catch log not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching catch', [
                'id' => $id,
                'user_id' => (string) Auth::id(),
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Error fetching catch log'], 500);
        }
    }

    /**
     * Approve a catch log (for authorized users).
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function approve(Request $request, $id)
    {
        Log::info('CatchLogController@approve called', ['id' => $id]);

        try {
            $validator = Validator::make(['id' => $id], [
                'id' => ['required', 'integer', 'min:1'],
            ]);

            if ($validator->fails()) {
                Log::error('Invalid catch ID in approve', ['id' => $id, 'errors' => $validator->errors()]);
                return response()->json(['message' => 'Invalid catch ID', 'errors' => $validator->errors()], 400);
            }

            $catch = CatchLog::where('user_id', (string) Auth::id())->findOrFail($id);
            $catch->update(['status' => 'approved']);

            Log::info('Catch approved', ['catch_id' => $catch->id]);

            return response()->json([
                'catch_id' => (int) $catch->id,
                'status' => $catch->status,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Catch not found for approval', ['id' => $id, 'user_id' => (string) Auth::id()]);
            return response()->json(['message' => 'Catch log not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error approving catch', [
                'id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Error approving catch log'], 500);
        }
    }

    /**
     * Get the count of catch logs by status.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function count()
    {
        try {
            $counts = [
                'total' => CatchLog::where('user_id', (string) Auth::id())->count(),
                'approved' => CatchLog::where('user_id', (string) Auth::id())->where('status', 'approved')->count(),
                'pending' => CatchLog::where('user_id', (string) Auth::id())->where('status', 'pending')->count(),
                'rejected' => CatchLog::where('user_id', (string) Auth::id())->where('status', 'rejected')->count(),
            ];

            Log::info('Catch log counts fetched', ['counts' => $counts]);

            return response()->json($counts, 200);
        } catch (\Exception $e) {
            Log::error('Error fetching catch log counts', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Error fetching catch log counts'], 500);
        }
    }
}