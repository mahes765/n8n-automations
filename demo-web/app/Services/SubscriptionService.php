<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    public function createPendingSubscription(int $userId, int $planId, int $transactionId): Subscription
    {
        return Subscription::create([
            'user_id' => $userId,
            'plan_id' => $planId,
            'transaction_id' => $transactionId,
            'status' => Subscription::STATUS_PENDING,
            'start_date' => null,
            'end_date' => null,
        ]);
    }

    public function activateSubscription(
        int $userId,
        int $planId,
        CarbonInterface $startDate,
        CarbonInterface $endDate,
        ?int $transactionId = null,
    ): Subscription {
        return DB::transaction(function () use ($userId, $planId, $startDate, $endDate, $transactionId) {
            Subscription::query()
                ->where('user_id', $userId)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->update([
                    'status' => Subscription::STATUS_INACTIVE,
                    'start_date' => null,
                    'end_date' => null,
                ]);

            $pendingSubscription = Subscription::query()
                ->where('user_id', $userId)
                ->where('plan_id', $planId)
                ->where('status', Subscription::STATUS_PENDING)
                ->when($transactionId, fn ($query) => $query->where('transaction_id', $transactionId))
                ->latest()
                ->first();

            if (! $pendingSubscription) {
                return Subscription::create([
                    'user_id' => $userId,
                    'plan_id' => $planId,
                    'transaction_id' => $transactionId,
                    'status' => Subscription::STATUS_ACTIVE,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ]);
            }

            $pendingSubscription->update([
                'status' => Subscription::STATUS_ACTIVE,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);

            return $pendingSubscription->refresh();
        });
    }

    public function expirePendingSubscription(int $userId, ?int $transactionId = null): void
    {
        Subscription::query()
            ->where('user_id', $userId)
            ->where('status', Subscription::STATUS_PENDING)
            ->when($transactionId, fn ($query) => $query->where('transaction_id', $transactionId))
            ->update([
                'status' => Subscription::STATUS_EXPIRED,
                'end_date' => now(),
            ]);
    }

    public function markPendingSubscriptionInactive(int $userId, ?int $transactionId = null): void
    {
        Subscription::query()
            ->where('user_id', $userId)
            ->where('status', Subscription::STATUS_PENDING)
            ->when($transactionId, fn ($query) => $query->where('transaction_id', $transactionId))
            ->update([
                'status' => Subscription::STATUS_INACTIVE,
                'start_date' => null,
                'end_date' => null,
            ]);
    }

    public function getActiveSubscription(int $userId): ?Subscription
    {
        return Subscription::query()
            ->with('plan')
            ->where('user_id', $userId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->where('end_date', '>', now())
            ->latest('end_date')
            ->first();
    }

    public function checkAccess(?int $userId): bool
    {
        if (! $userId) {
            return false;
        }

        return $this->getActiveSubscription($userId) !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function getTelegramSubscriptionStatus(string $telegramId): array
    {
        $telegramId = trim($telegramId);

        if ($telegramId === '' || ! preg_match('/^[0-9]+$/', $telegramId)) {
            return [
                'active' => false,
                'telegram_id' => $telegramId,
                'user_id' => null,
                'status' => 'invalid_telegram_id',
                'message' => 'Telegram ID tidak valid.',
            ];
        }

        $user = User::query()
            ->where('telegram_id', $telegramId)
            ->first();

        if (! $user) {
            return [
                'active' => false,
                'telegram_id' => $telegramId,
                'user_id' => null,
                'status' => 'not_registered',
                'message' => 'Telegram ID belum terdaftar.',
            ];
        }

        $this->expireEndedSubscriptions($user->id);

        $activeSubscription = $this->getActiveSubscription($user->id);

        if ($activeSubscription) {
            return [
                'active' => true,
                'telegram_id' => $telegramId,
                'user_id' => $user->id,
                'status' => Subscription::STATUS_ACTIVE,
                'plan' => $activeSubscription->plan?->name,
                'start_date' => $activeSubscription->start_date?->toDateTimeString(),
                'end_date' => $activeSubscription->end_date?->toDateTimeString(),
                'days_left' => max(0, (int) ceil(now()->diffInDays($activeSubscription->end_date, false))),
                'message' => 'Subscription aktif.',
            ];
        }

        $latestSubscription = Subscription::query()
            ->with('plan')
            ->where('user_id', $user->id)
            ->latest('end_date')
            ->latest()
            ->first();

        return [
            'active' => false,
            'telegram_id' => $telegramId,
            'user_id' => $user->id,
            'status' => $latestSubscription?->status ?? 'no_subscription',
            'plan' => $latestSubscription?->plan?->name,
            'start_date' => $latestSubscription?->start_date?->toDateTimeString(),
            'end_date' => $latestSubscription?->end_date?->toDateTimeString(),
            'days_left' => 0,
            'message' => 'Subscription tidak aktif atau sudah berakhir.',
        ];
    }

    private function expireEndedSubscriptions(int $userId): void
    {
        Subscription::query()
            ->where('user_id', $userId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereNotNull('end_date')
            ->where('end_date', '<=', now())
            ->update([
                'status' => Subscription::STATUS_EXPIRED,
            ]);
    }
}
