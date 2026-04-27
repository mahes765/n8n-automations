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
            'name' => '30 Hari',
            'price' => 50000,
            'duration_days' => 30,
        ]);

        $this->getJson("/api/n8n/telegram?user_id={$user->id}")
            ->assertForbidden();

        $subscribeResponse = $this->postJson('/subscribe', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
        ])->assertCreated();

        $transactionId = $subscribeResponse->json('transaction_id');
        $orderId = $subscribeResponse->json('midtrans_order_id');
        $signature = hash('sha512', $orderId.'200'.$plan->price.config('services.midtrans.server_key'));

        $this->postJson('/api/webhook/midtrans', [
            'order_id' => $orderId,
            'transaction_status' => 'settlement',
            'payment_type' => 'credit_card',
            'settlement_time' => '2026-04-27 12:00:00',
            'gross_amount' => $plan->price,
            'status_code' => '200',
            'signature_key' => $signature,
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

        $this->getJson("/api/n8n/telegram?user_id={$user->id}")
            ->assertOk()
            ->assertSeeText('Access granted to Telegram Bot');
    }

    public function test_success_redirect_does_not_activate_subscription(): void
    {
        $user = User::factory()->create();
        $plan = SubscriptionPlan::create([
            'name' => '3 Bulan',
            'price' => 150000,
            'duration_days' => 30,
        ]);

        $subscribeResponse = $this->postJson('/subscribe', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
        ])->assertCreated();

        $this->get($subscribeResponse->json('redirect_url'))
            ->assertOk();

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'pending',
        ]);

        $this->getJson("/api/n8n/form?user_id={$user->id}")
            ->assertForbidden();
    }
}
