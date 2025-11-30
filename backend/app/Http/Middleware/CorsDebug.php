<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Log;

class CorsDebug
{
    public function handle($request, Closure $next)
    {
        Log::info('CORS Debug Request:', [
            'method' => $request->method(),
            'url' => $request->url(),
            'headers' => $request->headers->all(),
        ]);

        if ($request->getMethod() === 'OPTIONS') {
            Log::info('CORS Debug: Handling OPTIONS request');
            return response('', 204)
                ->header('Access-Control-Allow-Origin', 'http://localhost:5173')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-XSRF-TOKEN, X-Requested-With')
                ->header('Access-Control-Allow-Credentials', 'true');
        }

        $response = $next($request);

        return $response
            ->header('Access-Control-Allow-Origin', 'http://localhost:5173')
            ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-XSRF-TOKEN, X-Requested-With')
            ->header('Access-Control-Allow-Credentials', 'true');
    }
}
