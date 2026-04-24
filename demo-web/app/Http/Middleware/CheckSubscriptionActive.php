<?php

namespace App\Http\Middleware;

use App\Models\Subscription;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscriptionActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $userId = $request->integer('user_id');

        if ($userId < 1) {
            return response()->json(['message' => 'user_id is required.'], 403);
        }

        $hasActiveSubscription = Subscription::query()
            ->where('user_id', $userId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->where('end_date', '>', now())
            ->exists();

        if (! User::whereKey($userId)->exists() || ! $hasActiveSubscription) {
            return response()->json(['message' => 'Subscription is not active.'], 403);
        }

        return $next($request);
    }
}
