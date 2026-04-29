<?php

namespace App\Services;

use App\Models\User;

interface MidtransServiceInterface
{
    /**
     * Create a transaction and get Snap token from Midtrans
     *
     * @param string $orderId
     * @param int $amount
     * @param User $user
     * @return array{snap_token: string, redirect_url: string}
     */
    public function createTransaction(string $orderId, int $amount, User $user): array;

    /**
     * Handle webhook callback from Midtrans
     *
     * @param array $payload
     * @param string|null $signature
     * @return array
     */
    public function handleWebhook(array $payload, ?string $signature = null): array;
}
