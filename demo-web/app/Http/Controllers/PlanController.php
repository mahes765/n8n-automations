<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Services\TelegramLinkService;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Auth;

class PlanController extends Controller
{
    public function index(TelegramLinkService $telegramLinkService): View
    {
        $user = Auth::user();
        $telegramLinkToken = $user->telegram_id ? null : $telegramLinkService->ensureToken($user);
        $telegramBotUsername = config('services.telegram.bot_username');

        return view('plans', [
            'plans' => SubscriptionPlan::query()
                ->orderBy('duration_days')
                ->get(),
            'user' => $user,
            'telegramLinkToken' => $telegramLinkToken,
            'telegramBotUrl' => $telegramLinkToken && $telegramBotUsername
                ? 'https://t.me/'.ltrim((string) $telegramBotUsername, '@').'?start='.$telegramLinkToken
                : null,
            'midtrans' => [
                'mode' => config('services.midtrans.mode'),
                'client_key' => config('services.midtrans.client_key'),
                'is_production' => (bool) config('services.midtrans.is_production', false),
            ],
        ]);
    }
}
