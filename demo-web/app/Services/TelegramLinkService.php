<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

class TelegramLinkService
{
    public function ensureToken(User $user): string
    {
        if (
            is_string($user->telegram_link_token)
            && $user->telegram_link_token !== ''
            && $user->telegram_link_token_expires_at?->isFuture()
        ) {
            return $user->telegram_link_token;
        }

        do {
            $token = Str::random(32);
        } while (User::query()->where('telegram_link_token', $token)->exists());

        $user->forceFill([
            'telegram_link_token' => $token,
            'telegram_link_token_expires_at' => now()->addDays(7),
        ])->save();

        return $token;
    }

    /**
     * @return array<string, mixed>
     */
    public function link(string $telegramId, string $token): array
    {
        $telegramId = trim($telegramId);
        $token = trim($token);

        if ($telegramId === '' || ! preg_match('/^[0-9]+$/', $telegramId)) {
            return [
                'linked' => false,
                'status' => 'invalid_telegram_id',
                'message' => 'Telegram ID tidak valid.',
            ];
        }

        if ($token === '') {
            return [
                'linked' => false,
                'status' => 'missing_token',
                'message' => 'Kode hubungkan Telegram tidak ditemukan.',
            ];
        }

        $user = User::query()
            ->where('telegram_link_token', $token)
            ->first();

        if (! $user || ! $user->telegram_link_token_expires_at?->isFuture()) {
            return [
                'linked' => false,
                'status' => 'invalid_or_expired_token',
                'message' => 'Kode hubungkan Telegram tidak valid atau sudah kedaluwarsa.',
            ];
        }

        $telegramOwner = User::query()
            ->where('telegram_id', $telegramId)
            ->whereKeyNot($user->id)
            ->first();

        if ($telegramOwner) {
            return [
                'linked' => false,
                'status' => 'telegram_id_already_linked',
                'message' => 'Telegram ini sudah terhubung ke akun lain.',
            ];
        }

        $user->forceFill([
            'telegram_id' => $telegramId,
            'telegram_link_token' => null,
            'telegram_link_token_expires_at' => null,
        ])->save();

        return [
            'linked' => true,
            'status' => 'linked',
            'telegram_id' => $telegramId,
            'user_id' => $user->id,
            'message' => 'Telegram berhasil terhubung.',
        ];
    }
}
