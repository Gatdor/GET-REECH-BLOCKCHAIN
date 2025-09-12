<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatchLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class CatchLogController extends Controller
{
    // GET /api/catch-logs?status=approved&limit=12&user_id=2
    public function index(Request $request)
    {
        try {
            $limit = (int)($request->query('limit', 20));
            $status = $request->query('status');
            $userId = $request->query('user_id');

            if (!$request->user()) {
                Log::warning('CatchLogController::index: Unauthenticated access attempt', [
                    'headers' => $request->headers->all(),
                    'ip' => $request->ip(),
                ]);
                return response()->json(['error' => __('auth.unauthenticated')], 401);
            }

            $q = CatchLog::query()
                ->select([
                    'catch_logs.*',
                    // Expose lat/lng from location array
                    DB::raw("CAST(location->>'lng' AS FLOAT) AS lng"),
                    DB::raw("CAST(location->>'lat' AS FLOAT) AS lat"),
                ])
                ->latest();

            if ($status) {
                $q->where('status', $status);
            }

            if ($userId) {
                $q->where('user_id', $userId);
            }

            return response()->json($q->paginate($limit));
        } catch (\Exception $e) {
            Log::error('CatchLogController::index error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'user_id' => $request->user() ? $request->user()->id : null,
            ]);
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // POST /api/catch-logs
    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'catch_id' => ['required', 'string', 'max:255', 'unique:catch_logs,catch_id'],
                'species' => ['required', 'string', 'max:255'],
                'drying_method' => ['required', 'string', 'max:255'],
                'batch_size' => ['required', 'numeric', 'min:0'],
                'weight' => ['required', 'numeric', 'min:0'],
                'harvest_date' => ['required', 'date'],
                'lat' => ['required', 'numeric', 'between:-90,90'],
                'lng' => ['required', 'numeric', 'between:-180,180'],
                'shelf_life' => ['required', 'integer', 'min:0'],
                'price' => ['required', 'numeric', 'min:0'],
                'image_urls' => ['nullable', 'array'],
                'image_urls.*' => ['url'],
                'quality_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            ]);

            $userId = Auth::id();
            if (!$userId) {
                Log::warning('CatchLogController::store: Unauthenticated user', [
                    'headers' => $request->headers->all(),
                    'ip' => $request->ip(),
                ]);
                return response()->json(['error' => __('auth.unauthenticated')], 401);
            }

            $log = CatchLog::create([
                'catch_id' => $data['catch_id'],
                'user_id' => $userId,
                'species' => $data['species'],
                'drying_method' => $data['drying_method'],
                'batch_size' => $data['batch_size'],
                'weight' => $data['weight'],
                'harvest_date' => $data['harvest_date'],
                'location' => ['lat' => $data['lat'], 'lng' => $data['lng']],
                'shelf_life' => $data['shelf_life'],
                'price' => $data['price'],
                'image_urls' => $data['image_urls'] ?? [],
                'quality_score' => $data['quality_score'] ?? 0,
                'status' => $data['status'] ?? 'pending',
            ]);

            // Re-select with lat/lng projection
            $created = CatchLog::select([
                'catch_logs.*',
                DB::raw("CAST(location->>'lng' AS FLOAT) AS lng"),
                DB::raw("CAST(location->>'lat' AS FLOAT) AS lat"),
            ])
                ->find($log->catch_id);

            return response()->json($created, 201);
        } catch (\Exception $e) {
            Log::error('CatchLogController::store error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'user_id' => $request->user() ? $request->user()->id : null,
            ]);
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    // GET /api/catch-logs/count
    public function count()
    {
        try {
            return response()->json([
                'total' => CatchLog::count(),
                'approved' => CatchLog::where('status', 'approved')->count(),
                'pending' => CatchLog::where('status', 'pending')->count(),
                'rejected' => CatchLog::where('status', 'rejected')->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('CatchLogController::count error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }
}