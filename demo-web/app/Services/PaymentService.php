<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function createPayment(User $user, SubscriptionPlan $plan): array
    {
        return DB::transaction(function () use ($user, $plan) {
            $orderId = 'ORDER-'.$user->id.'-'.now()->format('YmdHis').'-'.strtoupper(str()->random(6));

            $transaction = Transaction::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'midtrans_order_id' => $orderId,
                'status' => Transaction::STATUS_PENDING,
                'gross_amount' => $plan->price,
            ]);

            Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'status' => Subscription::STATUS_PENDING,
                'start_date' => null,
                'end_date' => null,
            ]);

            return [
                'transaction' => $transaction,
                'redirect_url' => route('fake-payment.show', $transaction),
            ];
        });
    }
}
