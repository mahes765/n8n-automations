<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use Illuminate\Contracts\View\View;

class PlanController extends Controller
{
    public function index(): View
    {
        return view('plans', [
            'plans' => SubscriptionPlan::query()
                ->orderBy('duration_days')
                ->get(),
        ]);
    }
}
