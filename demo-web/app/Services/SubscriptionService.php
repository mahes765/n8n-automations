<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    public function activateFromPaidTransaction(Transaction $transaction): Subscription
    {
        return DB::transaction(function () use ($transaction) {
            $transaction->loadMissing('plan');

            return Subscription::updateOrCreate(
                ['user_id' => $transaction->user_id],
                [
                    'plan_id' => $transaction->plan_id,
                    'status' => Subscription::STATUS_ACTIVE,
                    'start_date' => now(),
                    'end_date' => now()->addDays($transaction->plan->duration_days),
                ],
            );
        });
    }

    public function expireFromTransaction(Transaction $transaction): void
    {
        Subscription::where('user_id', $transaction->user_id)
            ->where('status', Subscription::STATUS_PENDING)
            ->update([
                'status' => Subscription::STATUS_EXPIRED,
                'end_date' => now(),
            ]);
    }

    public function markInactiveFromFailedTransaction(Transaction $transaction): void
    {
        Subscription::where('user_id', $transaction->user_id)
            ->where('status', Subscription::STATUS_PENDING)
            ->update([
                'status' => Subscription::STATUS_INACTIVE,
                'start_date' => null,
                'end_date' => null,
            ]);
    }
}
