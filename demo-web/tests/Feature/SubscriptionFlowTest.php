<?php

namespace Tests\Feature;

use App\Models\SubscriptionPlan;
use App\Models\Transaction;
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

        $this->actingAs($user)
            ->getJson('/api/n8n/telegram')
            ->assertForbidden();

        $subscribeResponse = $this->postJson('/subscribe', [
            'plan_id' => $plan->id,
        ])->assertCreated();

        $transactionId = $subscribeResponse->json('transaction_id');
        $orderId = $subscribeResponse->json('midtrans_order_id');
        $signature = hash('sha512', $orderId.'200'.$plan->price.config('services.midtrans.server_key'));

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'transaction_id' => $transactionId,
            'status' => 'pending',
            'start_date' => null,
            'end_date' => null,
        ]);

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
            'transaction_id' => $transactionId,
            'status' => 'active',
        ]);

        $this->getJson('/api/n8n/telegram')
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

        $subscribeResponse = $this->actingAs($user)->postJson('/subscribe', [
            'plan_id' => $plan->id,
        ])->assertCreated();

        $this->get($subscribeResponse->json('redirect_url'))
            ->assertOk();

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'transaction_id' => $subscribeResponse->json('transaction_id'),
            'status' => 'pending',
        ]);

        $this->getJson('/api/n8n/form')
            ->assertForbidden();
    }

    public function test_subscribe_uses_authenticated_user_and_ignores_submitted_user_id(): void
    {
        $authenticatedUser = User::factory()->create();
        $otherUser = User::factory()->create();
        $plan = SubscriptionPlan::create([
            'name' => '7 Hari',
            'price' => 25000,
            'duration_days' => 7,
        ]);

        $this->actingAs($authenticatedUser)
            ->postJson('/subscribe', [
                'user_id' => $otherUser->id,
                'plan_id' => $plan->id,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('transactions', [
            'user_id' => $authenticatedUser->id,
            'plan_id' => $plan->id,
        ]);

        $this->assertDatabaseMissing('transactions', [
            'user_id' => $otherUser->id,
            'plan_id' => $plan->id,
        ]);
    }

    public function test_fake_payment_redirects_to_success_page_after_paid_payment(): void
    {
        $user = User::factory()->create();
        $plan = SubscriptionPlan::create([
            'name' => '14 Hari',
            'price' => 35000,
            'duration_days' => 14,
        ]);
        $transaction = Transaction::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'midtrans_order_id' => 'ORDER-'.$user->id.'-TEST',
            'status' => Transaction::STATUS_PENDING,
            'gross_amount' => $plan->price,
        ]);

        app(\App\Services\SubscriptionService::class)
            ->createPendingSubscription($user->id, $plan->id, $transaction->id);

        $signature = hash('sha512', $transaction->midtrans_order_id.'200'.$plan->price.config('services.midtrans.server_key'));

        $this->post(route('fake-payment.process'), [
            'order_id' => $transaction->midtrans_order_id,
            'transaction_status' => 'settlement',
            'payment_type' => 'credit_card',
            'settlement_time' => '2026-04-28 06:13:55',
            'gross_amount' => $plan->price,
            'status_code' => '200',
            'signature_key' => $signature,
        ])->assertRedirect(route('payment.success'));

        $this->assertDatabaseHas('subscriptions', [
            'transaction_id' => $transaction->id,
            'status' => 'active',
        ]);
    }
}
