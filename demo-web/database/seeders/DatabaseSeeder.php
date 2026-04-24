<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
            ],
        );

        SubscriptionPlan::updateOrCreate(
            ['name' => 'Basic'],
            ['price' => 50000, 'duration_days' => 30],
        );

        SubscriptionPlan::updateOrCreate(
            ['name' => 'Pro'],
            ['price' => 150000, 'duration_days' => 30],
        );
    }
}
