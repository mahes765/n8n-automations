<?php

namespace Tests\Feature;

use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login_before_accessing_plans(): void
    {
        $this->get('/plans')
            ->assertRedirect('/login');
    }

    public function test_user_can_login_and_is_redirected_to_plans(): void
    {
        SubscriptionPlan::create([
            'name' => '7 Hari',
            'price' => 25000,
            'duration_days' => 7,
        ]);
        $user = User::factory()->create([
            'email' => 'member@example.com',
            'password' => 'password',
        ]);

        $this->get('/login');

        $this->from('/plans')
            ->post('/login', [
                '_token' => csrf_token(),
                'email' => $user->email,
                'password' => 'password',
            ])
            ->assertRedirect('/plans');

        $this->assertAuthenticatedAs($user);

        $this->get('/plans')
            ->assertOk()
            ->assertSee('Paket Subscription');
    }

    public function test_user_can_register_and_is_redirected_to_plans(): void
    {
        SubscriptionPlan::create([
            'name' => '7 Hari',
            'price' => 25000,
            'duration_days' => 7,
        ]);

        $this->get('/register');

        $this->post('/register', [
            '_token' => csrf_token(),
            'name' => 'Member Baru',
            'email' => 'member-baru@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect('/plans');

        $this->assertAuthenticated();

        $this->assertDatabaseHas('users', [
            'name' => 'Member Baru',
            'email' => 'member-baru@example.com',
        ]);

        $this->get('/plans')
            ->assertOk()
            ->assertSee('Member Baru');
    }

    public function test_guest_cannot_subscribe(): void
    {
        $plan = SubscriptionPlan::create([
            'name' => '30 Hari',
            'price' => 50000,
            'duration_days' => 30,
        ]);

        $this->post('/subscribe', [
            'plan_id' => $plan->id,
        ])->assertRedirect('/login');
    }
}
