<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller; // ✅ Add this line
use App\Http\Integrations\MPesa;

class MPesaController extends Controller
{
    public function initiate(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'amount' => 'required|numeric|min:1',
        ]);

        $mpesa = new MPesa();
        $result = $mpesa->stkPush($request->phone, $request->amount);

        return response()->json($result);
    }

    public function callback(Request $request)
    {
        $payload = $request->all();

        // TODO: Log, store, and verify the payment result
        \Log::info('M-Pesa Callback:', $payload);

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }
}
