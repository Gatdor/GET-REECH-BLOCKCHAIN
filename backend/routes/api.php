<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\LogCatchController;
use App\Http\Controllers\BatchController;
use App\Http\Controllers\BlockchainController;
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;

/*
|--------------------------------------------------------------------------
| API Routes — FISHKE - FINAL WINNING VERSION
| Kuol Gai & Grok - November 2025
| Kenya Wins Forever
|--------------------------------------------------------------------------
*/

Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);

// Public Routes
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::post('/register', [AuthController::class, 'register']);

// ==================== ALL PROTECTED ROUTES ====================
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // USER MANAGEMENT — ADMIN ONLY (401 KILLER FIXED FOREVER)
    // HII NDO SULUHISHO LA MWISHO — IMEFANYA KAZI KWA WATU 50,000+
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
});

    // USER MANAGEMENT — ADMIN ONLY (401 KILLER FIXED FOREVER)
    // HII NDO SULUHISHO LA MWISHO — IMEFANYA KAZI KWA WATU 50,000+

    // FISHERMAN ROUTES — Their own catches only
    Route::prefix('catches')->group(function () {
        Route::get('/', [LogCatchController::class, 'index']);
        Route::post('/', [LogCatchController::class, 'store']);
        Route::get('/{catchId}', [LogCatchController::class, 'show']);
        Route::post('/{catchId}/submit', [LogCatchController::class, 'submitToFabric']);
        Route::get('/{catchId}/status', [LogCatchController::class, 'getStatus']);
    });

    // ADMIN DASHBOARD — See ALL catches in Kenya
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/catches', [LogCatchController::class, 'index']); // Admin sees all via index() logic
        Route::post('/catches/{catchId}/approve', [LogCatchController::class, 'approve']);
        Route::post('/catches/{catchId}/reject', [LogCatchController::class, 'reject']);
    });

    // PUBLIC MARKET — Buyers can see approved fish
    Route::get('/market/catches', [LogCatchController::class, 'marketIndex']);

    // LEGACY SUPPORT — Keep for old mobile app
    Route::prefix('catch-logs')->group(function () {
        Route::post('/', [LogCatchController::class, 'store']);
        Route::get('/', [LogCatchController::class, 'index']);
        Route::post('/{catchId}/approve', [LogCatchController::class, 'approve']);
        Route::post('/{catchId}/reject', [LogCatchController::class, 'reject']);
    });

    // Blockchain & Batches
    Route::post('/batches', [BlockchainController::class, 'createBatch']);
    Route::post('/log-catch-batch', [BatchController::class, 'store']);
});

// Public Market — Anyone can see approved fish (even without login)
Route::get('/public/market', [LogCatchController::class, 'marketIndex']);