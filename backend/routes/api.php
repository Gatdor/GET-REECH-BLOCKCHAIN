<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BatchController;
use App\Http\Controllers\Api\LogCatchController;
use App\Http\Controllers\BlockchainController;
use App\Http\Controllers\DashboardController;
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;

Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
    Route::get('/catch-logs', [BatchController::class, 'index']);
    Route::post('/catch-logs', [BatchController::class, 'store']);
    Route::post('/batches', [BlockchainController::class, 'createBatch']);
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::prefix('blockchain')->group(function () {
        Route::get('/catch-logs', [LogCatchController::class, 'index']);
        Route::post('/catch-logs', [LogCatchController::class, 'store']);
        Route::get('/catch-logs/{catchId}', [LogCatchController::class, 'show']);
    });
});