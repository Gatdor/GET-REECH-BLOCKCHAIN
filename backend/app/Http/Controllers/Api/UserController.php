<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    public function count()
    {
        Log::info('[UserController] Fetching users count');
        $count = User::count();
        return response()->json(['count' => $count], 200);
    }
}