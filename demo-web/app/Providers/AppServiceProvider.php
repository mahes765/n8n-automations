<?php

namespace App\Providers;

use App\Services\FakeMidtransService;
use App\Services\MidtransService;
use App\Services\MidtransServiceInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            MidtransServiceInterface::class,
            config('services.midtrans.mode') === 'fake'
                ? FakeMidtransService::class
                : MidtransService::class,
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
