<?php
namespace App\Http\Controllers;

use App\Models\CatchLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BatchController extends Controller
{
    public function index(Request $request)
    {
        try {
            $userId = $request->query('user_id');
            if (!$userId) {
                return response()->json(['error' => 'User ID is required'], 400);
            }

            $catchLogs = CatchLog::where('user_id', $userId)->get();

            return response()->json([
                'message' => 'Catch logs retrieved successfully',
                'data' => $catchLogs,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch catch logs: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->query('user_id'),
            ]);
            return response()->json(['error' => 'Failed to fetch catch logs'], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'catch_id' => 'required|string|unique:catch_logs,catch_id',
                'user_id' => 'required|string',
                'species' => 'required|string',
                'dryingMethod' => 'required|string',
                'batchSize' => 'required|numeric|min:0.1',
                'weight' => 'required|numeric|min:0.1',
                'harvest_date' => 'required|date',
                'lat' => 'required|numeric|min:-90|max:90',
                'lng' => 'required|numeric|min:-180|max:180',
                'shelf_life' => 'nullable|integer|min:1',
                'price' => 'nullable|numeric|min:0.01',
                'image_urls' => 'nullable|array',
                'quality_score' => 'nullable|numeric|min:0',
                'status' => 'nullable|in:pending,approved,rejected',
            ]);

            $catchLog = CatchLog::create($validated);

            return response()->json([
                'message' => 'Catch log created successfully',
                'data' => $catchLog,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to store catch log: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);
            return response()->json(['error' => 'Failed to store catch log'], 500);
        }
    }
}