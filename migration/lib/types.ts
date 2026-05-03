export type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  telegram_id: string | null;
  telegram_link_token: string | null;
  telegram_link_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPlan = {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: number;
  user_id: number;
  plan_id: number;
  midtrans_order_id: string;
  status: "pending" | "paid" | "failed" | "expired";
  gross_amount: number;
  payment_type: string | null;
  settlement_time: string | null;
  raw_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: number;
  user_id: number;
  plan_id: number;
  transaction_id: number | null;
  status: "inactive" | "pending" | "active" | "expired";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type ActiveSubscription = Subscription & {
  subscription_plans: Pick<SubscriptionPlan, "name" | "duration_days"> | null;
};
