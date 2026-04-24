<?php

use App\Http\Controllers\N8nController;
use App\Http\Controllers\PaymentGatewayController;
use App\Http\Controllers\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/plans', [SubscriptionController::class, 'plans'])->name('plans.index');
Route::post('/subscribe', [SubscriptionController::class, 'subscribe'])->name('subscribe.store');

Route::get('/payment-gateway/{transaction}', [PaymentGatewayController::class, 'show'])
    ->name('payment-gateway.show');

Route::middleware('subscription.active')->group(function () {
    Route::get('/n8n/telegram', [N8nController::class, 'telegram'])->name('n8n.telegram');
    Route::get('/n8n/form', [N8nController::class, 'form'])->name('n8n.form');
});
