<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\CatchLog;
use Illuminate\Support\Facades\Log;

class MarketController extends Controller
{
    public function marketValue()
    {
        Log::info('[MarketController] Fetching market value');
        $totalValue = CatchLog::where('status', 'approved')->sum('price');
        return response()->json(['total_value' => $totalValue], 200);
    }
}