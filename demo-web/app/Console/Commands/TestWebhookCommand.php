<?php

namespace App\Console\Commands;

use App\Models\Transaction;
use App\Services\MidtransServiceInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class TestWebhookCommand extends Command
{
    protected $signature = 'webhook:test {order_id? : Order ID to test}';
    protected $description = 'Test webhook processing locally without Midtrans';

    public function handle(MidtransServiceInterface $midtransService): int
    {
        $orderId = $this->argument('order_id');

        if (!$orderId) {
            // Get latest pending transaction
            $transaction = Transaction::where('status', Transaction::STATUS_PENDING)
                ->latest()
                ->first();

            if (!$transaction) {
                $this->error('No pending transactions found. Create one first by subscribing.');
                return self::FAILURE;
            }

            $orderId = $transaction->midtrans_order_id;
            $this->info("Using latest pending transaction: {$orderId}");
        }

        // Simulate Midtrans webhook notification
        $payload = [
            'order_id' => $orderId,
            'transaction_status' => 'settlement',
            'transaction_id' => 'test-txn-' . time(),
            'status_code' => '200',
            'gross_amount' => '50000',
            'payment_type' => 'credit_card',
            'settlement_time' => now()->toDateTimeString(),
        ];

        // Generate valid signature
        $serverKey = config('services.midtrans.server_key');
        $signature = hash('sha512', 
            $payload['order_id'] . 
            $payload['status_code'] . 
            $payload['gross_amount'] . 
            $serverKey
        );

        $payload['signature_key'] = $signature;

        $this->info('Testing webhook with payload:');
        $this->table(
            ['Key', 'Value'],
            collect($payload)->map(fn($v, $k) => [$k, $v])->values()->toArray()
        );

        try {
            $result = $midtransService->handleWebhook($payload, $signature);
            
            $this->info('✓ Webhook processed successfully!');
            $this->line('Result:');
            $this->line(json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            $transaction->refresh();
            $this->line("\nUpdated Transaction:");
            $this->table(
                ['Field', 'Value'],
                [
                    ['Order ID', $transaction->midtrans_order_id],
                    ['Status', $transaction->status],
                    ['Payment Type', $transaction->payment_type],
                    ['Settlement Time', $transaction->settlement_time],
                ]
            );

            if ($transaction->user) {
                $subscription = $transaction->user->subscriptions()->latest()->first();
                if ($subscription) {
                    $this->line("\nUpdated Subscription:");
                    $this->table(
                        ['Field', 'Value'],
                        [
                            ['Status', $subscription->status],
                            ['Start Date', $subscription->start_date],
                            ['End Date', $subscription->end_date],
                        ]
                    );
                }
            }

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('✗ Webhook processing failed!');
            $this->error('Error: ' . $e->getMessage());
            $this->line('Stack trace:');
            $this->line($e->getTraceAsString());

            Log::error('Webhook test failed', [
                'error' => $e->getMessage(),
                'order_id' => $orderId,
                'payload' => $payload,
            ]);

            return self::FAILURE;
        }
    }
}
