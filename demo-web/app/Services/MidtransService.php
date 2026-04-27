<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;

class MidtransService extends FakeMidtransService
{
    public function createTransaction(string $orderId, int $amount, User $user): string
    {
        $response = Http::withBasicAuth(config('services.midtrans.server_key'), '')
            ->post(rtrim(config('services.midtrans.snap_url'), '/').'/transactions', [
                'transaction_details' => [
                    'order_id' => $orderId,
                    'gross_amount' => $amount,
                ],
                'customer_details' => [
                    'first_name' => $user->name,
                    'email' => $user->email,
                ],
                'callbacks' => [
                    'finish' => route('payment.success'),
                    'error' => route('payment.failed'),
                ],
            ])
            ->throw()
            ->json();

        return $response['redirect_url'];
    }
}
