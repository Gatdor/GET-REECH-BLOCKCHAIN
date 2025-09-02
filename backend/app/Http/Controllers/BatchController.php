<?php
namespace App\Http\Controllers;


use Illuminate\Http\Request;

class BatchController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|string',
            'user_id' => 'required|string',
            'species' => 'required|string',
            'drying_method' => 'required|string',
            'batch_size' => 'required|numeric|min:0.1',
            'weight' => 'required|numeric|min:0.1',
            'harvest_date' => 'required|date',
            'lat' => 'required|numeric|min:-90|max:90',
            'lng' => 'required|numeric|min:-180|max:180',
            'shelf_life' => 'required|integer|min:1',
            'price' => 'required|numeric|min:0.01',
            'image_urls' => 'nullable|array',
            'quality_score' => 'required|numeric|min:0',
            'status' => 'required|in:pending,approved,rejected',
        ]);
        // Simulate blockchain transaction
        return response()->json([
            'transaction_hash' => '0x' . bin2hex(random_bytes(32)),
            'block_number' => rand(100000, 999999),
            'batch' => $validated,
        ], 201);
    }
}