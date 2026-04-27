<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FakeMidtransService implements MidtransServiceInterface
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService,
    ) {
    }

    public function createTransaction(string $orderId, int $amount, User $user): string
    {
        $transaction = Transaction::where('midtrans_order_id', $orderId)->firstOrFail();

        return route('fake-payment.show', $transaction);
    }

    public function handleWebhook(array $payload, ?string $signature = null): array
    {
        $signature = $signature ?: ($payload['signature_key'] ?? null);

        if (! $this->isValidSignature($payload, $signature)) {
            Log::warning('Midtrans webhook rejected: invalid signature', [
                'order_id' => $payload['order_id'] ?? null,
            ]);

            abort(401, 'Invalid Midtrans signature.');
        }

        return DB::transaction(function () use ($payload) {
            $transaction = Transaction::query()
                ->where('midtrans_order_id', $payload['order_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($transaction->status !== Transaction::STATUS_PENDING) {
                return [
                    'transaction' => $transaction,
                    'already_processed' => true,
                ];
            }

            $status = $this->mapTransactionStatus($payload['transaction_status'] ?? '');
            $settlementTime = isset($payload['settlement_time'])
                ? Carbon::parse($payload['settlement_time'])
                : now();

            $transaction->update([
                'status' => $status,
                'payment_type' => $payload['payment_type'] ?? null,
                'settlement_time' => $status === Transaction::STATUS_PAID ? $settlementTime : null,
                'raw_response' => $payload,
            ]);

            if ($status === Transaction::STATUS_PAID) {
                $transaction->loadMissing('plan');
                $this->subscriptionService->activateSubscription(
                    $transaction->user_id,
                    $transaction->plan_id,
                    $settlementTime,
                    $settlementTime->copy()->addDays($transaction->plan->duration_days),
                );
            }

            if ($status === Transaction::STATUS_EXPIRED) {
                $this->subscriptionService->expirePendingSubscription($transaction->user_id);
            }

            if ($status === Transaction::STATUS_FAILED) {
                $this->subscriptionService->markPendingSubscriptionInactive($transaction->user_id);
            }

            return [
                'transaction' => $transaction->fresh(),
                'already_processed' => false,
            ];
        });
    }

    public function signatureFor(string $orderId, string $statusCode, int|string $grossAmount): string
    {
        return hash('sha512', $orderId.$statusCode.$grossAmount.config('services.midtrans.server_key'));
    }

    private function isValidSignature(array $payload, ?string $signature): bool
    {
        if (! $signature) {
            return false;
        }

        $expected = $this->signatureFor(
            (string) ($payload['order_id'] ?? ''),
            (string) ($payload['status_code'] ?? ''),
            (string) ($payload['gross_amount'] ?? ''),
        );

        return hash_equals($expected, $signature);
    }

    private function mapTransactionStatus(string $midtransStatus): string
    {
        return match ($midtransStatus) {
            'settlement', 'capture' => Transaction::STATUS_PAID,
            'expire' => Transaction::STATUS_EXPIRED,
            'deny', 'cancel', 'failure' => Transaction::STATUS_FAILED,
            default => Transaction::STATUS_PENDING,
        };
    }
}
