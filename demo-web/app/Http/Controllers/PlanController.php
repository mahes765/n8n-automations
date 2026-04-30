<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Auth;

class PlanController extends Controller
{
    public function index(): View
    {
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
