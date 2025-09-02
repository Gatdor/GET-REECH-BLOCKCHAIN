<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'role' => 'required|in:admin,buyer,fisherman',
        ]);

        if (!Auth::guard('web')->attempt(['email' => $request->email, 'password' => $request->password])) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::guard('web')->user();

        if ($user->role !== $request->role) {
            Auth::guard('web')->logout();
            throw ValidationException::withMessages([
                'role' => ['Invalid role for this user.'],
            ]);
        }

        $request->session()->regenerate();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'national_id' => $user->national_id,
            ],
            'token' => $token,
        ], 200);
    }

    public function user(Request $request)
    {
        try {
            $user = Auth::guard('web')->user() ?? $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'national_id' => $user->national_id,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('User fetch failed: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to fetch user'], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            // Check for authenticated user via Sanctum
            $user = $request->user();
            if ($user && method_exists($user, 'currentAccessToken') && $user->currentAccessToken()) {
                $user->currentAccessToken()->delete();
                Log::info('Sanctum token deleted for user: ' . $user->email);
            } else {
                Log::warning('No valid Sanctum token found for logout request');
            }

            // Invalidate session if it exists
            if (Auth::guard('web')->check()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                Log::info('Session invalidated for user: ' . ($user ? $user->email : 'unknown'));
            } else {
                Log::warning('No active session found for logout request');
            }

            // Clear cookies
            return response()->json(['message' => 'Logged out successfully'], 200)
                ->withCookie(cookie()->forget('laravel_session'))
                ->withCookie(cookie()->forget('XSRF-TOKEN'));
        } catch (\Exception $e) {
            Log::error('Logout failed: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
                'user' => $user ? $user->email : 'none',
            ]);
            return response()->json(['error' => 'Failed to logout. Please try again.'], 500);
        }
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,buyer,fisherman',
            'national_id' => 'nullable|string|max:50',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'national_id' => $data['national_id'],
        ]);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'national_id' => $user->national_id,
            ],
            'token' => $token,
        ], 201);
    }
}