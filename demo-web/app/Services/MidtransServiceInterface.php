<?php

namespace App\Services;

use App\Models\User;

interface MidtransServiceInterface
{
    public function createTransaction(string $orderId, int $amount, User $user): string;

    public function handleWebhook(array $payload, ?string $signature = null): array;
}
