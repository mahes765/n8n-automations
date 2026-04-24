<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubscribeRequest;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;

class SubscriptionController extends Controller
{
    public function plans(): JsonResponse
    {
        return response()->json([
            'data' => SubscriptionPlan::query()
                ->select(['id', 'name', 'price', 'duration_days'])
                ->orderBy('price')
                ->get(),
        ]);
    }

    public function subscribe(SubscribeRequest $request, PaymentService $paymentService): JsonResponse
    {
        $user = User::findOrFail($request->integer('user_id'));
        $plan = SubscriptionPlan::findOrFail($request->integer('plan_id'));

        $payment = $paymentService->createPayment($user, $plan);

        return response()->json([
            'message' => 'Transaction created. Complete payment in the payment gateway.',
            'data' => [
                'transaction_id' => $payment['transaction']->id,
                'external_id' => $payment['transaction']->external_id,
                'status' => $payment['transaction']->status,
                'redirect_url' => $payment['redirect_url'],
            ],
        ], 201);
    }
}
