<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Transaction;
use App\Models\User;
use App\Services\MidtransService;
use App\Services\MidtransServiceInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\TestCase;

class SubscriptionFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_paid_webhook_activates_subscription_and_grants_n8n_access(): void
    {
        $this->mockMidtransCheckout();

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

        $this->app->bind(MidtransServiceInterface::class, MidtransService::class);

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
        $this->mockMidtransCheckout();

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
        $this->mockMidtransCheckout();

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

    public function test_n8n_can_check_active_subscription_by_telegram_id(): void
    {
        config(['services.n8n.shared_secret' => 'test-n8n-secret']);

        $user = User::factory()->create([
            'telegram_id' => '123456789',
        ]);
        $plan = SubscriptionPlan::create([
            'name' => '30 Hari',
            'price' => 50000,
            'duration_days' => 30,
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'start_date' => now()->subDay(),
            'end_date' => now()->addDays(29),
        ]);

        $this->withToken('test-n8n-secret')
            ->getJson('/api/subscription/status/123456789')
            ->assertOk()
            ->assertJson([
                'active' => true,
                'telegram_id' => '123456789',
                'user_id' => $user->id,
                'status' => Subscription::STATUS_ACTIVE,
                'plan' => '30 Hari',
            ]);
    }

    public function test_n8n_subscription_status_requires_shared_secret(): void
    {
        config(['services.n8n.shared_secret' => 'test-n8n-secret']);

        $this->getJson('/api/subscription/status/123456789')
            ->assertUnauthorized();
    }

    public function test_n8n_subscription_status_rejects_unregistered_telegram_id(): void
    {
        config(['services.n8n.shared_secret' => 'test-n8n-secret']);

        $this->withToken('test-n8n-secret')
            ->getJson('/api/subscription/status/987654321')
            ->assertOk()
            ->assertJson([
                'active' => false,
                'telegram_id' => '987654321',
                'user_id' => null,
                'status' => 'not_registered',
            ]);
    }

    public function test_n8n_subscription_status_expires_ended_subscription_without_cron(): void
    {
        config(['services.n8n.shared_secret' => 'test-n8n-secret']);

        $user = User::factory()->create([
            'telegram_id' => '1122334455',
        ]);
        $plan = SubscriptionPlan::create([
            'name' => '7 Hari',
            'price' => 25000,
            'duration_days' => 7,
        ]);
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'start_date' => now()->subDays(8),
            'end_date' => now()->subDay(),
        ]);

        $this->withToken('test-n8n-secret')
            ->getJson('/api/subscription/status/1122334455')
            ->assertOk()
            ->assertJson([
                'active' => false,
                'telegram_id' => '1122334455',
                'user_id' => $user->id,
                'status' => Subscription::STATUS_EXPIRED,
            ]);

        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscription->id,
            'status' => Subscription::STATUS_EXPIRED,
        ]);
    }

    public function test_n8n_can_link_telegram_id_with_link_token(): void
    {
        config(['services.n8n.shared_secret' => 'test-n8n-secret']);

        $user = User::factory()->create([
            'telegram_id' => null,
            'telegram_link_token' => 'link-token-123',
            'telegram_link_token_expires_at' => now()->addDay(),
        ]);

        $this->withToken('test-n8n-secret')
            ->postJson('/api/telegram/link', [
                'telegram_id' => '778899',
                'link_token' => 'link-token-123',
            ])
            ->assertOk()
            ->assertJson([
                'linked' => true,
                'status' => 'linked',
                'telegram_id' => '778899',
                'user_id' => $user->id,
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'telegram_id' => '778899',
            'telegram_link_token' => null,
            'telegram_link_token_expires_at' => null,
        ]);
    }

    public function test_n8n_cannot_link_with_expired_link_token(): void
    {
        config(['services.n8n.shared_secret' => 'test-n8n-secret']);

        User::factory()->create([
            'telegram_id' => null,
            'telegram_link_token' => 'expired-token-123',
            'telegram_link_token_expires_at' => now()->subMinute(),
        ]);

        $this->withToken('test-n8n-secret')
            ->postJson('/api/telegram/link', [
                'telegram_id' => '778899',
                'link_token' => 'expired-token-123',
            ])
            ->assertUnprocessable()
            ->assertJson([
                'linked' => false,
                'status' => 'invalid_or_expired_token',
            ]);
    }

    public function test_n8n_cannot_link_same_telegram_id_to_two_users(): void
    {
        config(['services.n8n.shared_secret' => 'test-n8n-secret']);

        User::factory()->create([
            'telegram_id' => '778899',
        ]);
        User::factory()->create([
            'telegram_id' => null,
            'telegram_link_token' => 'second-user-token',
            'telegram_link_token_expires_at' => now()->addDay(),
        ]);

        $this->withToken('test-n8n-secret')
            ->postJson('/api/telegram/link', [
                'telegram_id' => '778899',
                'link_token' => 'second-user-token',
            ])
            ->assertUnprocessable()
            ->assertJson([
                'linked' => false,
                'status' => 'telegram_id_already_linked',
            ]);
    }

    private function mockMidtransCheckout(): void
    {
        $this->mock(MidtransServiceInterface::class, function (MockInterface $mock): void {
            $mock->shouldReceive('createTransaction')
                ->andReturnUsing(fn (string $orderId): array => [
                    'snap_token' => 'test-'.$orderId,
                    'redirect_url' => route('payment.success'),
                ]);
        });
    }
}
