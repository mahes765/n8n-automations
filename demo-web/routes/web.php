<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FakePaymentController;
use App\Http\Controllers\N8nController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/plans');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.store');
    Route::get('/register', [AuthController::class, 'showRegisterForm'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->name('register.store');
});

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth')
    ->name('logout');

Route::middleware('auth')->group(function () {
    Route::get('/plans', [PlanController::class, 'index'])->name('plans.index');
    Route::post('/subscribe', [SubscriptionController::class, 'store'])->name('subscribe.store');
});

Route::get('/payment/success', fn () => view('payment-success'))->name('payment.success');
Route::get('/payment/failed', fn () => view('payment-failed'))->name('payment.failed');
Route::get('/fake-payment/{transaction}', [FakePaymentController::class, 'show'])->name('fake-payment.show');
Route::post('/fake-payment/process', [FakePaymentController::class, 'process'])->name('fake-payment.process');

Route::middleware('subscription.active')->prefix('n8n')->group(function () {
    Route::get('/telegram', [N8nController::class, 'telegram']);
    Route::get('/form', [N8nController::class, 'form']);
});
