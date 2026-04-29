<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class PlanController extends Controller
{
    public function index(): View
    {
        if (Auth::guest()) {
            $user = User::create([
                'name' => 'Demo User',
                'email' => 'demo-'.Str::lower(Str::random(12)).'@example.test',
                'password' => Str::password(),
            ]);

            Auth::login($user);
        }

        return view('plans', [
            'plans' => SubscriptionPlan::query()
                ->orderBy('duration_days')
                ->get(),
            'user' => Auth::user(),
            'midtrans' => [
                'mode' => config('services.midtrans.mode'),
                'client_key' => config('services.midtrans.client_key'),
                'is_production' => (bool) config('services.midtrans.is_production', false),
            ],
        ]);
    }
}
