<?php

namespace App\Services;

use App\Models\Subscription;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    public function createPendingSubscription(int $userId, int $planId, int $transactionId): Subscription
    {
        return Subscription::create([
            'user_id' => $userId,
            'plan_id' => $planId,
            'status' => Subscription::STATUS_PENDING,
            'start_date' => null,
            'end_date' => null,
        ]);
    }

    public function activateSubscription(
        int $userId,
        int $planId,
        CarbonInterface $startDate,
        CarbonInterface $endDate,
    ): Subscription {
        return DB::transaction(function () use ($userId, $planId, $startDate, $endDate) {
            Subscription::query()
                ->where('user_id', $userId)
                ->whereIn('status', [Subscription::STATUS_ACTIVE, Subscription::STATUS_PENDING])
                ->update([
                    'status' => Subscription::STATUS_INACTIVE,
                    'start_date' => null,
                    'end_date' => null,
                ]);

            return Subscription::create([
                'user_id' => $userId,
                'plan_id' => $planId,
                'status' => Subscription::STATUS_ACTIVE,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);
        });
    }

    public function expirePendingSubscription(int $userId): void
    {
        Subscription::query()
            ->where('user_id', $userId)
            ->where('status', Subscription::STATUS_PENDING)
            ->update([
                'status' => Subscription::STATUS_EXPIRED,
                'end_date' => now(),
            ]);
    }

    public function markPendingSubscriptionInactive(int $userId): void
    {
        Subscription::query()
            ->where('user_id', $userId)
            ->where('status', Subscription::STATUS_PENDING)
            ->update([
                'status' => Subscription::STATUS_INACTIVE,
                'start_date' => null,
                'end_date' => null,
            ]);
    }

    public function getActiveSubscription(int $userId): ?Subscription
    {
        return Subscription::query()
            ->with('plan')
            ->where('user_id', $userId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->where('end_date', '>', now())
            ->latest('end_date')
            ->first();
    }

    public function checkAccess(?int $userId): bool
    {
        if (! $userId) {
            return false;
        }

        return $this->getActiveSubscription($userId) !== null;
    }
}
