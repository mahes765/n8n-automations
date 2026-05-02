<?php

use App\Http\Controllers\N8nController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TelegramLinkController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/webhook/midtrans', [WebhookController::class, 'handleMidtrans'])
    ->name('webhook.midtrans');

Route::get('/user/subscription', [SubscriptionController::class, 'current'])
    ->name('user.subscription');

Route::middleware('n8n.api')
    ->get('/subscription/status/{telegramId}', [SubscriptionController::class, 'telegramStatus'])
    ->where('telegramId', '[0-9]+')
    ->name('subscription.telegram-status');

Route::middleware('n8n.api')
    ->post('/telegram/link', [TelegramLinkController::class, 'store'])
    ->name('telegram.link');

Route::middleware('subscription.active')->prefix('n8n')->group(function () {
    Route::get('/telegram', [N8nController::class, 'telegram'])->name('n8n.telegram');
    Route::get('/form', [N8nController::class, 'form'])->name('n8n.form');
});
