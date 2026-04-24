<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentService
{
    public function createPayment(User $user, SubscriptionPlan $plan): array
    {
        return DB::transaction(function () use ($user, $plan) {
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'status' => Transaction::STATUS_PENDING,
                'external_id' => 'SIM-'.Str::uuid(),
            ]);

            Subscription::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'plan_id' => $plan->id,
                    'status' => Subscription::STATUS_PENDING,
                    'start_date' => null,
                    'end_date' => null,
                ],
            );

            return [
                'transaction' => $transaction,
                'redirect_url' => route('payment-gateway.show', $transaction),
            ];
        });
    }
}
