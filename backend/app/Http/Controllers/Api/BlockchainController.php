<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use GuzzleHttp\Client;

class BlockchainController extends Controller
{
    protected $fabricClient;

    public function __construct()
    {
        $this->fabricClient = new Client([
            'base_uri' => env('FABRIC_GATEWAY_URL', 'http://localhost:7051'),
            'timeout' => 30,
        ]);
    }

    public function createBatch(Request $request)
    {
        $request->validate([
            'batch_id' => 'required|string',
            'user_id' => 'required|string',
            'species' => 'required|string',
            'drying_method' => 'required|string',
            'batch_size' => 'required|numeric|min:0',
            'weight' => 'required|numeric|min:0',
            'harvest_date' => 'required|date',
            'location' => 'required|string',
            'shelf_life' => 'required|integer|min:0',
            'price' => 'required|numeric|min:0',
            'image_urls' => 'required|array',
        ]);

        try {
            $response = $this->fabricClient->post('/channels/mychannel/chaincodes/bigdatacc', [
                'json' => [
                    'fcn' => 'CreateBatch',
                    'args' => [
                        $request->batch_id,
                        $request->user_id,
                        $request->species,
                        $request->drying_method,
                        strval($request->batch_size),
                        strval($request->weight),
                        $request->harvest_date,
                        $request->location,
                        strval($request->shelf_life),
                        strval($request->price),
                        json_encode($request->image_urls),
                    ],
                ],
                'headers' => [
                    'Authorization' => 'Bearer ' . env('FABRIC_TOKEN'),
                ],
            ]);

            return response()->json([
                'message' => 'Batch created successfully on blockchain',
                'data' => json_decode($response->getBody()->getContents(), true),
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Blockchain batch creation error',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}