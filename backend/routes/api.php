<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CatchLogController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\IPFSController;

// Public routes
Route::get('/sanctum/csrf-cookie', [\Laravel\Sanctum\Http\Controllers\CsrfCookieController::class, 'show']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/create-batch', [CatchLogController::class, 'createBatch'])->name('catch.create-batch');
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/catch-logs', [CatchLogController::class, 'index']);
    Route::post('/catch-logs', [CatchLogController::class, 'store']);
    Route::get('/catch-logs/{id}', [CatchLogController::class, 'show']);
    Route::get('catch-logs/count', [CatchLogController::class, 'count']);
    Route::post('/catch-logs/{id}/approve', [CatchLogController::class, 'approve']);
    Route::get('/catch-logs/count', [CatchLogController::class, 'count']);
    Route::get('/users', [UserController::class, 'index']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
    Route::post('/upload-ipfs', [IPFSController::class, 'uploadIpfs']);
});
