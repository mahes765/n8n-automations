<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateN8nRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        $sharedSecret = config('services.n8n.shared_secret');

        if (! is_string($sharedSecret) || $sharedSecret === '') {
            return response()->json([
                'message' => 'N8N shared secret belum dikonfigurasi.',
            ], 503);
        }

        $providedSecret = $request->bearerToken() ?: $request->header('X-N8N-Secret');

        if (! is_string($providedSecret) || ! hash_equals($sharedSecret, $providedSecret)) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 401);
        }

        return $next($request);
    }
}
