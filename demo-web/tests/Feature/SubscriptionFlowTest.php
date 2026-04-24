<?php

namespace Tests\Feature;

use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_paid_webhook_activates_subscription_and_grants_n8n_access(): void
    {
        $user = User::factory()->create();
        $plan = SubscriptionPlan::create([
            'name' => 'Basic',
            'price' => 50000,
            'duration_days' => 30,
        ]);

        $this->getJson("/n8n/telegram?user_id={$user->id}")
            ->assertForbidden();

        $subscribeResponse = $this->postJson('/subscribe', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
        ])->assertCreated();

        $transactionId = $subscribeResponse->json('data.transaction_id');

        $this->postJson('/api/webhook/payment', [
            'transaction_id' => $transactionId,
            'status' => 'paid',
            'signature' => 'dummy-signature',
        ])->assertOk();

        $this->assertDatabaseHas('transactions', [
            'id' => $transactionId,
            'status' => 'paid',
        ]);

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'active',
        ]);

        $this->getJson("/n8n/telegram?user_id={$user->id}")
            ->assertOk()
            ->assertJson(['message' => 'Access granted to Telegram Bot']);
    }

    public function test_success_redirect_does_not_activate_subscription(): void
    {
        $user = User::factory()->create();
        $plan = SubscriptionPlan::create([
            'name' => 'Pro',
            'price' => 150000,
            'duration_days' => 30,
        ]);

        $subscribeResponse = $this->postJson('/subscribe', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
        ])->assertCreated();

        $this->get($subscribeResponse->json('data.redirect_url'))
            ->assertOk();

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'pending',
        ]);

        $this->getJson("/n8n/form?user_id={$user->id}")
            ->assertForbidden();
    }
}
