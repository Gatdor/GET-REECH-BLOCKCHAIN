<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|use App\Http\Controllers\SupabaseController;

Route::get('/supabase/user', [SupabaseController::class, 'getUser']);
Route::post('/supabase/catch', [SupabaseController::class, 'insertCatch']);

| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/
Route::get('/', function () {
    return view('welcome');
});
