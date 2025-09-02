<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatchLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CatchLogController extends Controller
{
    // GET /api/catch-logs?status=approved&limit=12&user_id=2
    public function index(Request $request)
    {
        $limit   = (int)($request->query('limit', 20));
        $status  = $request->query('status');
        $userId  = $request->query('user_id');

        $q = CatchLog::query()
            ->select([
                'catch_logs.*',
                // expose lat/lng for the frontend
                DB::raw("ST_X(ST_AsText(location::geometry)) AS lng"),
                DB::raw("ST_Y(ST_AsText(location::geometry)) AS lat"),
            ])
            ->latest();

        if ($status) {
            $q->where('status', $status);
        }

        if ($userId) {
            $q->where('user_id', $userId);
        }

        return response()->json($q->paginate($limit));
    }

    // POST /api/catch-logs
    public function store(Request $request)
    {
        $data = $request->validate([
            'batch_id'      => ['required', 'string', 'max:255', 'unique:catch_logs,batch_id'],
            'species'       => ['required', 'string', 'max:255'],
            'drying_method' => ['required', 'string', 'max:255'],
            'batch_size'    => ['required', 'numeric', 'min:0'],
            'weight'        => ['required', 'numeric', 'min:0'],
            'harvest_date'  => ['required', 'date'],
            'lat'           => ['required', 'numeric', 'between:-90,90'],
            'lng'           => ['required', 'numeric', 'between:-180,180'],
            'shelf_life'    => ['required', 'integer', 'min:0'],
            'price'         => ['required', 'numeric', 'min:0'],
            'image_urls'    => ['nullable', 'array'],
            'image_urls.*'  => ['url'],
            'quality_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'status'        => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
        ]);

        $userId = Auth::id();

        // Insert first (without location), then update location with PostGIS expression
        $log = CatchLog::create([
            'batch_id'      => $data['batch_id'],
            'user_id'       => $userId,
            'species'       => $data['species'],
            'drying_method' => $data['drying_method'],
            'batch_size'    => $data['batch_size'],
            'weight'        => $data['weight'],
            'harvest_date'  => $data['harvest_date'],
            'shelf_life'    => $data['shelf_life'],
            'price'         => $data['price'],
            'image_urls'    => $data['image_urls'] ?? [],
            'quality_score' => $data['quality_score'] ?? 0,
            'status'        => $data['status'] ?? 'pending',
        ]);

        // Set PostGIS geography(Point,4326) — watch order: lon, lat
        DB::table('catch_logs')
            ->where('id', $log->id)
            ->update([
                'location' => DB::raw("ST_SetSRID(ST_MakePoint({$data['lng']}, {$data['lat']}), 4326)::geography")
            ]);

        // Re-select with lat/lng projection
        $created = CatchLog::select([
                'catch_logs.*',
                DB::raw("ST_X(ST_AsText(location::geometry)) AS lng"),
                DB::raw("ST_Y(ST_AsText(location::geometry)) AS lat"),
            ])
            ->find($log->id);

        return response()->json($created, 201);
    }

    // GET /api/catch-logs/count
    public function count()
    {
        return response()->json([
            'total'     => CatchLog::count(),
            'approved'  => CatchLog::where('status', 'approved')->count(),
            'pending'   => CatchLog::where('status', 'pending')->count(),
            'rejected'  => CatchLog::where('status', 'rejected')->count(),
        ]);
    }
}
