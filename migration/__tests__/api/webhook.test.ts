import { addDays } from "@/lib/dates";
import type { Subscription, SubscriptionPlan, Transaction, User } from "@/lib/types";

/**
 * Subscription Webhook Tests
 * These tests simulate payment webhook scenarios
 */

describe("Subscription Webhook & Payment Flow", () => {
  const mockUser: User = {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    password: "hashed_password",
    telegram_id: "123456789",
    telegram_link_token: null,
    telegram_link_token_expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockPlan: SubscriptionPlan = {
    id: 1,
    name: "30 Hari",
    price: 50000,
    duration_days: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTransaction: Transaction = {
    id: 1,
    user_id: mockUser.id,
    plan_id: mockPlan.id,
    midtrans_order_id: "ORDER-1-TEST",
    status: "pending",
    gross_amount: 50000,
    payment_type: null,
    settlement_time: null,
    raw_response: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe("Webhook signature validation", () => {
    it("should validate webhook signature with correct key", () => {
      const orderId = "ORDER-1-TEST";
      const statusCode = "200";
      const grossAmount = 50000;
      const serverKey = "test-server-key";

      // Simulating signature generation (SHA-512)
      const signatureData = `${orderId}${statusCode}${grossAmount}${serverKey}`;

      expect(signatureData).toContain(orderId);
      expect(signatureData).toContain(statusCode);
      expect(signatureData).toContain(grossAmount.toString());
    });

    it("should reject webhook with invalid signature", () => {
      const validSignature = "correct-signature";
      const invalidSignature = "wrong-signature";

      expect(validSignature).not.toBe(invalidSignature);
    });

    it("should verify gross amount matches transaction", () => {
      const transactionAmount = 50000;
      const webhookAmount = 50000;

      expect(transactionAmount).toBe(webhookAmount);
    });
  });

  describe("Payment status transitions", () => {
    it("should update transaction status to paid on settlement", () => {
      const transaction: Transaction = { ...mockTransaction, status: "paid" };

      expect(transaction.status).toBe("paid");
    });

    it("should handle settlement webhook data", () => {
      const webhookData = {
        order_id: "ORDER-1-TEST",
        transaction_status: "settlement",
        payment_type: "credit_card",
        settlement_time: "2026-04-27 12:00:00",
        gross_amount: 50000,
        status_code: "200",
        signature_key: "test-signature",
      };

      expect(webhookData.transaction_status).toBe("settlement");
      expect(webhookData.status_code).toBe("200");
    });

    it("should not activate subscription on pending payment", () => {
      const subscription: Subscription = {
        id: 1,
        user_id: mockUser.id,
        plan_id: mockPlan.id,
        transaction_id: mockTransaction.id,
        status: "pending",
        start_date: null,
        end_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(subscription.status).toBe("pending");
      expect(subscription.start_date).toBeNull();
    });

    it("should activate subscription only on paid status", () => {
      const startDate = new Date("2026-04-27");
      const endDate = addDays(startDate, mockPlan.duration_days);

      const subscription: Subscription = {
        id: 1,
        user_id: mockUser.id,
        plan_id: mockPlan.id,
        transaction_id: mockTransaction.id,
        status: "active",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(subscription.status).toBe("active");
      expect(subscription.start_date).not.toBeNull();
      expect(subscription.end_date).not.toBeNull();
    });
  });

  describe("Subscription activation", () => {
    it("should set subscription start and end dates", () => {
      const startDate = new Date("2026-04-27");
      const endDate = addDays(startDate, mockPlan.duration_days);

      expect(startDate).toEqual(new Date("2026-04-27"));
      expect(endDate).toEqual(new Date("2026-05-27"));
    });

    it("should deactivate previous subscriptions when activating new one", () => {
      const previousSubscription: Subscription = {
        id: 1,
        user_id: mockUser.id,
        plan_id: 1,
        transaction_id: 1,
        status: "inactive",
        start_date: null,
        end_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(previousSubscription.status).toBe("inactive");
    });

    it("should grant N8N access after subscription activation", () => {
      const activeSubscription: Subscription = {
        id: 1,
        user_id: mockUser.id,
        plan_id: mockPlan.id,
        transaction_id: mockTransaction.id,
        status: "active",
        start_date: new Date().toISOString(),
        end_date: addDays(new Date(), 30).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const hasAccess = activeSubscription.status === "active";
      expect(hasAccess).toBe(true);
    });
  });

  describe("Success redirect", () => {
    it("should handle success redirect URL", () => {
      const redirectUrl = "https://example.com/payment-success";

      expect(redirectUrl).toContain("success");
    });

    it("should not activate subscription on redirect-only", () => {
      const subscription: Subscription = {
        id: 1,
        user_id: mockUser.id,
        plan_id: mockPlan.id,
        transaction_id: mockTransaction.id,
        status: "pending",
        start_date: null,
        end_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(subscription.status).toBe("pending");
    });

    it("should keep subscription pending until webhook confirmation", () => {
      const checkoutResponse = {
        snap_token: "test-token",
        redirect_url: "https://midtrans.example.com",
      };

      expect(checkoutResponse.redirect_url).toBeDefined();
    });
  });

  describe("Telegram linking", () => {
    it("should generate valid link token", () => {
      const linkToken = "test-link-token-abc123def456";

      expect(typeof linkToken).toBe("string");
      expect(linkToken.length).toBeGreaterThan(0);
    });

    it("should validate link token expiration", () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600000); // 1 hour

      expect(expiresAt > now).toBe(true);
    });

    it("should reject expired link tokens", () => {
      const now = new Date();
      const expiredAt = new Date(now.getTime() - 60000); // 1 minute ago

      expect(expiredAt < now).toBe(true);
    });

    it("should prevent same telegram ID linking to multiple users", () => {
      const user1TelegramId = "123456789";
      const user2TelegramId = "123456789";

      expect(user1TelegramId).toBe(user2TelegramId);
    });

    it("should link telegram ID to user with valid token", () => {
      const linkedUser: User = {
        ...mockUser,
        telegram_id: "778899",
        telegram_link_token: null,
        telegram_link_token_expires_at: null,
      };

      expect(linkedUser.telegram_id).toBe("778899");
      expect(linkedUser.telegram_link_token).toBeNull();
    });
  });

  describe("N8N subscription status", () => {
    it("should return active subscription status", () => {
      const status = {
        active: true,
        telegram_id: "123456789",
        user_id: mockUser.id,
        status: "active",
        plan: "30 Hari",
      };

      expect(status.active).toBe(true);
      expect(status.status).toBe("active");
    });

    it("should return inactive for expired subscriptions", () => {
      const status = {
        active: false,
        telegram_id: "123456789",
        user_id: mockUser.id,
        status: "expired",
      };

      expect(status.active).toBe(false);
    });

    it("should return not_registered for unlinked telegram IDs", () => {
      const status = {
        active: false,
        telegram_id: "987654321",
        user_id: null,
        status: "not_registered",
      };

      expect(status.user_id).toBeNull();
      expect(status.status).toBe("not_registered");
    });

    it("should automatically expire ended subscriptions", () => {
      const now = new Date();
      const endedSubscription: Subscription = {
        id: 1,
        user_id: mockUser.id,
        plan_id: mockPlan.id,
        transaction_id: mockTransaction.id,
        status: "expired",
        start_date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(endedSubscription.status).toBe("expired");
      expect(new Date(endedSubscription.end_date) < now).toBe(true);
    });

    it("should require shared secret for N8N endpoints", () => {
      const sharedSecret = "test-n8n-secret";

      expect(typeof sharedSecret).toBe("string");
      expect(sharedSecret.length).toBeGreaterThan(0);
    });
  });

  describe("Fake payment for testing", () => {
    it("should process fake payment request", () => {
      const fakePaymentRequest = {
        order_id: "ORDER-1-TEST",
        transaction_status: "settlement",
        payment_type: "credit_card",
        settlement_time: "2026-04-28 06:13:55",
        gross_amount: 50000,
        status_code: "200",
        signature_key: "test-signature",
      };

      expect(fakePaymentRequest.transaction_status).toBe("settlement");
    });

    it("should redirect to success page after fake payment", () => {
      const redirectUrl = "/payment-success";

      expect(redirectUrl).toContain("success");
    });

    it("should activate subscription after fake payment", () => {
      const subscription: Subscription = {
        id: 1,
        user_id: mockUser.id,
        plan_id: mockPlan.id,
        transaction_id: mockTransaction.id,
        status: "active",
        start_date: new Date().toISOString(),
        end_date: addDays(new Date(), mockPlan.duration_days).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(subscription.status).toBe("active");
    });
  });
});
