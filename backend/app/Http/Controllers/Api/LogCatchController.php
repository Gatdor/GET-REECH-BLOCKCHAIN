<?php
namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\CatchLog;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Log;

class LogCatchController extends Controller
{
    protected $fabricUrl = 'http://localhost:7050';

    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'catch_id' => ['required', 'string', 'max:255'],
                'user_id' => ['required', 'string', 'max:255'],
                'species' => ['required', 'string', 'max:255'],
                'weight' => ['required', 'numeric', 'min:0'],
                'date' => ['required', 'date'],
            ]);

            // Save to database
            $catchLog = CatchLog::create([
                'catch_id' => $data['catch_id'],
                'user_id' => $data['user_id'],
                'species' => $data['species'],
                'dryingMethod' => $request->input('dryingMethod', 'unknown'),
                'batchSize' => $request->input('batchSize', 0),
                'weight' => $data['weight'],
            ]);

            // Invoke chaincode
            $response = Http::withOptions([
                'cert' => env('FABRIC_TLS_CERT', base_path('organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem')),
                'verify' => false,
            ])->post("{$this->fabricUrl}/channels/mychannel/chaincodes/bigdatacc", [
                'function' => 'LogCatch',
                'Args' => [
                    $data['catch_id'],
                    $data['user_id'],
                    $data['species'],
                    (string) $data['weight'],
                    $data['date'],
                ],
                'peerAddresses' => [
                    'localhost:7051',
                    'localhost:9051',
                ],
                'tlsRootCertFiles' => [
                    base_path('organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem'),
                    base_path('organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem'),
                ],
            ]);

            if ($response->failed()) {
                Log::error('LogCatchController::store blockchain error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return response()->json(['error' => 'Failed to log catch to blockchain'], 500);
            }

            $result = $response->json();
            return response()->json([
                'message' => 'Catch logged successfully',
                'transactionHash' => $result['transactionHash'] ?? 'N/A',
                'data' => $catchLog,
            ], 201);
        } catch (\Exception $e) {
            Log::error('LogCatchController::store error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $userId = $request->query('user_id');
            if (!$userId) {
                return response()->json(['error' => 'User ID is required'], 400);
            }

            // Query chaincode
            $response = Http::withOptions([
                'cert' => env('FABRIC_TLS_CERT', base_path('organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem')),
                'verify' => false,
            ])->post("{$this->fabricUrl}/channels/mychannel/chaincodes/bigdatacc", [
                'function' => 'GetCatchesByFisher',
                'Args' => [$userId],
            ]);

            if ($response->failed()) {
                Log::error('LogCatchController::index blockchain error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return response()->json(['error' => 'Failed to fetch catches from blockchain'], 500);
            }

            return response()->json($response->json() ?? []);
        } catch (\Exception $e) {
            Log::error('LogCatchController::index error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function show(Request $request, $catchId)
    {
        try {
            $response = Http::withOptions([
                'cert' => env('FABRIC_TLS_CERT', base_path('organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem')),
                'verify' => false,
            ])->post("{$this->fabricUrl}/channels/mychannel/chaincodes/bigdatacc", [
                'function' => 'GetCatch',
                'Args' => [$catchId],
            ]);

            if ($response->failed()) {
                Log::error('LogCatchController::show blockchain error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'catchId' => $catchId,
                ]);
                return response()->json(['error' => 'Failed to fetch catch from blockchain'], 500);
            }

            return response()->json($response->json() ?? []);
        } catch (\Exception $e) {
            Log::error('LogCatchController::show error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'catchId' => $catchId,
            ]);
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }
}