<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    public function index()
    {
        try {
            $users = User::select(['id', 'name', 'email', 'role', 'national_id', 'created_at'])->get();
            Log::info('Users fetched', ['count' => $users->count()]);
            return response()->json($users);
        } catch (\Exception $e) {
            Log::error('Fetch users error', ['message' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to fetch users'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);
            $user->delete();
            Log::info('User deleted', ['id' => $id]);
            return response()->json(['message' => 'User deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Delete user error', ['message' => $e->getMessage(), 'id' => $id]);
            return response()->json(['message' => 'Failed to delete user'], 500);
        }
    }
}