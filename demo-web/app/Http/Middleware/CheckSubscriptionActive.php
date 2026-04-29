<?php

namespace App\Http\Middleware;

use App\Services\SubscriptionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscriptionActive
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $userId = auth()->id();

        if (! $this->subscriptionService->checkAccess($userId)) {
            return response()->json([
                'error' => 'Subscription tidak aktif atau sudah berakhir',
                'user_id' => $userId ?: null,
            ], 403);
        }

        return $next($request);
    }
}
