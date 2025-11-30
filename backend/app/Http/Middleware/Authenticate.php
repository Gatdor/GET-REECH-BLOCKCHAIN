<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo($request)
    {
        if ($request->expectsJson()) {
            return null; // Prevent redirect for API requests
        }
        return route('login');
    }

    /**
     * Handle an unauthenticated user.
     */
    protected function unauthenticated($request, array $guards)
    {
        if ($request->expectsJson()) {
            abort(response()->json([
                'message' => __('auth.unauthenticated'),
                'status' => 401
            ], 401));
        }

        parent::unauthenticated($request, $guards);
    }

    /**
     * Handle an incoming request.
     */
    public function handle($request, Closure $next, ...$guards)
    {
        $this->authenticate($request, $guards);

        $response = $next($request);

        // Add CORS headers only if not already set
        if ($request->expectsJson()) {
            if (!$response->headers->has('Access-Control-Allow-Origin')) {
                $response->header('Access-Control-Allow-Origin', $request->header('Origin') ?? '*');
            }
            if (!$response->headers->has('Access-Control-Allow-Credentials')) {
                $response->header('Access-Control-Allow-Credentials', 'true');
            }
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            $response->header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-XSRF-TOKEN, X-Requested-With');

        }

        return $response;
    }
}