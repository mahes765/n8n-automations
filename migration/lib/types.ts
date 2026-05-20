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
  product_type?: "financial_subscription" | "medsos_package";
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: number;
  user_id: number;
  plan_id: number;
  product_type?: "financial_subscription" | "medsos_package";
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

export type MedsosPackage = {
  id: number;
  code: "basic" | "pro" | "premium" | string;
  name: string;
  financial_plan_id: number | null;
  purchase_type?: "one_time";
  description: string | null;
  price: number;
  quota_limit: number;
  features: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MedsosEntitlement = {
  id: number;
  user_id: number;
  transaction_id: number;
  package_id: number;
  status: "pending_payment" | "active" | "consumed" | "expired" | "refunded" | "cancelled";
  quota_total: number;
  quota_used: number;
  activated_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MedsosPlatform = "instagram" | "tiktok" | "youtube";

export type MedsosRequestStatus =
  | "queued"
  | "validating"
  | "scraping"
  | "ai_processing"
  | "generating_report"
  | "completed"
  | "failed"
  | "cancelled"
  | "retry_wait";

export type MedsosRequest = {
  id: number;
  user_id: number;
  entitlement_id: number;
  platform: MedsosPlatform;
  profile_url: string;
  notes: string | null;
  status: MedsosRequestStatus;
  progress_percent: number;
  current_step: string | null;
  n8n_execution_id: string | null;
  callback_token: string;
  retry_count: number;
  max_retries: number;
  quota_charged: boolean;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MedsosAnalysisResult = {
  id: number;
  request_id: number;
  summary: string | null;
  sentiment_label: string | null;
  sentiment_score: number | null;
  sentiment_breakdown: Record<string, number>;
  engagement_score: number | null;
  engagement_metrics: Record<string, unknown>;
  top_topics: unknown[];
  audience_insight: Record<string, unknown>;
  recommendations: unknown[];
  charts_data: Record<string, unknown>;
  raw_payload: Record<string, unknown> | null;
  model_version: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
};
