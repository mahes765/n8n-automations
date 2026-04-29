<?php

use App\Http\Controllers\N8nController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/plans');

Route::get('/plans', [PlanController::class, 'index'])->name('plans.index');
Route::post('/subscribe', [SubscriptionController::class, 'store'])->name('subscribe.store');

Route::get('/payment/success', fn () => view('payment-success'))->name('payment.success');
Route::get('/payment/failed', fn () => view('payment-failed'))->name('payment.failed');

Route::middleware('subscription.active')->prefix('n8n')->group(function () {
    Route::get('/telegram', [N8nController::class, 'telegram']);
    Route::get('/form', [N8nController::class, 'form']);
});
