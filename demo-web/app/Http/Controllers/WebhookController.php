<?php

namespace App\Http\Controllers;

use App\Http\Requests\PaymentWebhookRequest;
use App\Models\Transaction;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function payment(PaymentWebhookRequest $request, SubscriptionService $subscriptionService): JsonResponse
    {
        if ($request->string('signature')->toString() !== config('services.payment_gateway.webhook_signature')) {
            Log::warning('Payment webhook rejected: invalid signature', [
                'transaction_id' => $request->input('transaction_id'),
            ]);

            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        $result = DB::transaction(function () use ($request, $subscriptionService) {
            $transaction = Transaction::lockForUpdate()->findOrFail($request->integer('transaction_id'));

            if ($transaction->status !== Transaction::STATUS_PENDING) {
                Log::info('Payment webhook ignored: transaction already final', [
                    'transaction_id' => $transaction->id,
                    'current_status' => $transaction->status,
                    'incoming_status' => $request->input('status'),
                ]);

                return [
                    'already_processed' => true,
                    'transaction_id' => $transaction->id,
                    'status' => $transaction->status,
                ];
            }

            $transaction->update(['status' => $request->input('status')]);

            match ($request->input('status')) {
                Transaction::STATUS_PAID => $subscriptionService->activateFromPaidTransaction($transaction),
                Transaction::STATUS_EXPIRED => $subscriptionService->expireFromTransaction($transaction),
                Transaction::STATUS_FAILED => $subscriptionService->markInactiveFromFailedTransaction($transaction),
            };

            return [
                'already_processed' => false,
                'transaction_id' => $transaction->id,
                'status' => $request->input('status'),
            ];
        });

        if ($result['already_processed']) {
            return response()->json([
                'message' => 'Transaction already processed.',
                'data' => [
                    'transaction_id' => $result['transaction_id'],
                    'status' => $result['status'],
                ],
            ]);
        }

        Log::info('Payment webhook processed', [
            'transaction_id' => $result['transaction_id'],
            'status' => $result['status'],
        ]);

        return response()->json([
            'message' => 'Webhook processed.',
            'data' => [
                'transaction_id' => $result['transaction_id'],
                'status' => $result['status'],
            ],
        ]);
    }
}
