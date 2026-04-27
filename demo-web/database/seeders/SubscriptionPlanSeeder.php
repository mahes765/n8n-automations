<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['name' => '7 Hari', 'duration_days' => 7, 'price' => 10000],
            ['name' => '30 Hari', 'duration_days' => 30, 'price' => 25000],
            ['name' => '3 Bulan', 'duration_days' => 90, 'price' => 50000],
        ] as $plan) {
            SubscriptionPlan::updateOrCreate(
                ['name' => $plan['name']],
                $plan,
            );
        }
    }
}
