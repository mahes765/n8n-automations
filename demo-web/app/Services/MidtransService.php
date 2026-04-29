<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Midtrans\Config;
use Midtrans\Snap;

class MidtransService implements MidtransServiceInterface
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService,
    ) {
    }

    public function createTransaction(string $orderId, int $amount, User $user): array
    {
        // Validate configuration
        $serverKey = config('services.midtrans.server_key');
        $clientKey = config('services.midtrans.client_key');
        
        if (empty($serverKey) || empty($clientKey)) {
            throw new \RuntimeException('Midtrans server_key or client_key is not configured. Check config/services.php');
        }

        // Set your Merchant Server Key
        Config::$serverKey = $serverKey;
        
        // Set to Development/Sandbox Environment (default). Set to true for Production Environment (accept real transaction).
        Config::$isProduction = (bool) config('services.midtrans.is_production', false);
        
        // Set sanitization on (default)
        Config::$isSanitized = (bool) config('services.midtrans.is_sanitized', true);
        
        // Set 3DS transaction for credit card to true
        Config::$is3ds = (bool) config('services.midtrans.is_3ds', true);

        // Handle SSL verification for development
        if (! config('services.midtrans.is_production', false)) {
            Config::$curlOptions = [
                CURLOPT_SSL_VERIFYHOST => 0,
                CURLOPT_SSL_VERIFYPEER => 0,
            ];
        }

        $amount = (int) $amount; // Ensure amount is integer
        
        $params = [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $amount,
            ],
            'customer_details' => [
                'first_name' => $user->name,
                'email' => $user->email,
                'phone' => $this->formatPhoneNumber($user->phone ?? '08111111111'),
            ],
            'item_details' => [
                [
                    'id' => 'subscription',
                    'price' => $amount,
                    'quantity' => 1,
                    'name' => 'Subscription Plan',
                ],
            ],
        ];

        try {
            Log::info('Requesting Midtrans snap token', [
                'order_id' => $orderId,
                'amount' => $amount,
                'user_id' => $user->id,
                'server_key_length' => strlen($serverKey),
                'is_production' => Config::$isProduction,
            ]);

            // Get snap token from Midtrans
            // Note: Midtrans library may emit warnings for unknown error codes, but token generation succeeds
            $previousErrorReporting = error_reporting();
            error_reporting($previousErrorReporting & ~E_WARNING);
            
            try {
                $snapToken = Snap::getSnapToken($params);
            } finally {
                error_reporting($previousErrorReporting);
            }

            Log::info('Midtrans snap token obtained', [
                'order_id' => $orderId,
                'token' => substr($snapToken, 0, 20) . '...',
            ]);

            return [
                'snap_token' => $snapToken,
                'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/' . $snapToken,
            ];
        } catch (\Midtrans\HttpClientRejectionException $e) {
            // This is a Midtrans API rejection with error code
            Log::error('Midtrans API rejection', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'raw_response' => $e->getRawResponse(),
                'params_sent' => $params,
            ]);
            throw new \RuntimeException('Midtrans API error: ' . $e->getMessage() . '. Please check server configuration.', $e->getCode(), $e);
        } catch (\Exception $e) {
            Log::error('Midtrans error', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'exception_class' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function handleWebhook(array $payload, ?string $signature = null): array
    {
        Log::info('Midtrans webhook received', [
            'order_id' => $payload['order_id'] ?? 'MISSING',
            'transaction_status' => $payload['transaction_status'] ?? 'MISSING',
            'payload_keys' => array_keys($payload),
        ]);

        // Validate required fields
        if (empty($payload['order_id']) || empty($payload['transaction_status']) || empty($payload['gross_amount'])) {
            Log::warning('Midtrans webhook missing required fields', [
                'payload_keys' => array_keys($payload),
            ]);

            throw new \InvalidArgumentException('Missing required webhook fields');
        }

        $signature = $signature ?: ($payload['signature_key'] ?? null);

        if (! $this->isValidSignature($payload, $signature)) {
            Log::warning('Midtrans webhook rejected: invalid signature', [
                'order_id' => $payload['order_id'] ?? null,
                'provided_signature' => substr($signature ?? '', 0, 20) . '...',
            ]);

            throw new \InvalidArgumentException('Invalid Midtrans signature.');
        }

        Log::info('Midtrans webhook signature valid', [
            'order_id' => $payload['order_id'],
        ]);

        return DB::transaction(function () use ($payload) {
            $transaction = Transaction::query()
                ->where('midtrans_order_id', $payload['order_id'])
                ->lockForUpdate()
                ->first();

            if (!$transaction) {
                Log::error('Midtrans webhook: transaction not found', [
                    'order_id' => $payload['order_id'],
                ]);
                throw new \RuntimeException('Transaction not found for order: ' . $payload['order_id']);
            }

            if ($transaction->status !== Transaction::STATUS_PENDING) {
                Log::info('Midtrans transaction already processed', [
                    'order_id' => $payload['order_id'],
                    'current_status' => $transaction->status,
                ]);

                return [
                    'transaction' => $transaction,
                    'already_processed' => true,
                ];
            }

            $status = $this->mapTransactionStatus($payload['transaction_status']);
            $settlementTime = isset($payload['settlement_time']) && ! empty($payload['settlement_time'])
                ? Carbon::parse($payload['settlement_time'])
                : now();

            Log::info('Midtrans processing transaction', [
                'order_id' => $payload['order_id'],
                'midtrans_status' => $payload['transaction_status'],
                'mapped_status' => $status,
                'user_id' => $transaction->user_id,
            ]);

            $transaction->update([
                'status' => $status,
                'payment_type' => $payload['payment_type'] ?? null,
                'settlement_time' => $status === Transaction::STATUS_PAID ? $settlementTime : null,
                'raw_response' => $payload,
            ]);

            Log::info('Midtrans webhook processed', [
                'order_id' => $payload['order_id'],
                'new_status' => $status,
            ]);

            if ($status === Transaction::STATUS_PAID) {
                $transaction->loadMissing('plan');
                $this->subscriptionService->activateSubscription(
                    $transaction->user_id,
                    $transaction->plan_id,
                    $settlementTime,
                    $settlementTime->copy()->addDays($transaction->plan->duration_days),
                    $transaction->id,
                );

                Log::info('Subscription activated', [
                    'order_id' => $payload['order_id'],
                    'user_id' => $transaction->user_id,
                ]);
            }

            if ($status === Transaction::STATUS_EXPIRED) {
                $this->subscriptionService->expirePendingSubscription($transaction->user_id, $transaction->id);
            }

            if ($status === Transaction::STATUS_FAILED) {
                $this->subscriptionService->markPendingSubscriptionInactive($transaction->user_id, $transaction->id);
            }

            return [
                'transaction' => $transaction->fresh(),
                'already_processed' => false,
            ];
        });
    }

    private function isValidSignature(array $payload, ?string $signature): bool
    {
        if (! $signature) {
            return false;
        }

        $orderId = (string) ($payload['order_id'] ?? '');
        $statusCode = (string) ($payload['status_code'] ?? '');
        $grossAmount = (string) ($payload['gross_amount'] ?? '');

        $expected = hash('sha512', $orderId . $statusCode . $grossAmount . config('services.midtrans.server_key'));

        return hash_equals($expected, $signature);
    }

    private function formatPhoneNumber(string $phone): string
    {
        // Remove spaces, dashes, and parentheses
        $phone = preg_replace('/[\s\-\(\)]+/', '', $phone);

        // If starts with 0, replace with +62
        if (str_starts_with($phone, '0')) {
            $phone = '+62' . substr($phone, 1);
        }

        // If doesn't start with +, add +62
        if (!str_starts_with($phone, '+')) {
            $phone = '+62' . $phone;
        }

        return $phone;
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
