<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubscribeRequest;
use App\Models\SubscriptionPlan;
use App\Models\Transaction;
use App\Services\MidtransServiceInterface;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    public function store(
        SubscribeRequest $request,
        MidtransServiceInterface $midtransService,
        SubscriptionService $subscriptionService,
    ): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        if (! $user) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Login diperlukan sebelum melakukan subscribe.',
                ], 401);
            }

            return redirect()->route('plans.index');
        }

        $plan = SubscriptionPlan::findOrFail($request->integer('plan_id'));
        $orderId = 'ORDER-'.$user->id.'-'.now()->format('YmdHis').'-'.strtoupper(str()->random(6));

        $payment = DB::transaction(function () use ($user, $plan, $orderId, $midtransService, $subscriptionService) {
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'midtrans_order_id' => $orderId,
                'status' => Transaction::STATUS_PENDING,
                'gross_amount' => $plan->price,
            ]);

            $subscriptionService->createPendingSubscription($user->id, $plan->id, $transaction->id);

            $midtransPayment = $midtransService->createTransaction($orderId, $plan->price, $user);

            return [
                'transaction' => $transaction,
                'redirect_url' => $midtransPayment['redirect_url'],
                'snap_token' => $midtransPayment['snap_token'],
            ];
        });

        if (! $request->expectsJson()) {
            return redirect()->away($payment['redirect_url']);
        }

        return response()->json([
            'redirect_url' => $payment['redirect_url'],
            'snap_token' => $payment['snap_token'],
            'transaction_id' => $payment['transaction']->id,
            'midtrans_order_id' => $payment['transaction']->midtrans_order_id,
        ], 201);
    }

    public function current(SubscriptionService $subscriptionService): JsonResponse
    {
        $userId = auth()->id();

        if (! $userId) {
            return response()->json([
                'message' => 'Login diperlukan untuk melihat subscription.',
            ], 401);
        }

        $subscription = $subscriptionService->getActiveSubscription($userId);

        if (! $subscription) {
            return response()->json([
                'active' => false,
                'plan' => null,
                'start_date' => null,
                'end_date' => null,
                'days_left' => 0,
            ]);
        }

        return response()->json([
            'active' => true,
            'plan' => $subscription->plan->name,
            'start_date' => $subscription->start_date?->toDateTimeString(),
            'end_date' => $subscription->end_date?->toDateTimeString(),
            'days_left' => max(0, (int) ceil(now()->diffInDays($subscription->end_date, false))),
        ]);
    }
}
