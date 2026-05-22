import { appUrl } from "@/lib/env";
import { chargeMedsosQuota, getActiveMedsosEntitlement } from "@/lib/medsos/entitlements";
import { supabaseAdmin } from "@/lib/supabase";
import type {
    MedsosAnalysisResult,
    MedsosPlatform,
    MedsosRequest,
    MedsosRequestStatus,
    User,
} from "@/lib/types";

function parseJsonString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function asJsonObject(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  const parsed = parseJsonString(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : fallback;
}

function asJsonArray(value: unknown, fallback: unknown[] = []): unknown[] {
  const parsed = parseJsonString(value);
  return Array.isArray(parsed) ? parsed : fallback;
}

function asJsonValue(value: unknown, fallback: unknown = null): unknown {
  const parsed = parseJsonString(value);
  return parsed === undefined ? fallback : parsed;
}

function firstNestedRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const firstValue = value[0];

    if (firstValue && typeof firstValue === "object" && !Array.isArray(firstValue)) {
      return firstValue as Record<string, unknown>;
    }

    return null;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

export function normalizeMedsosRequestLifecycle(
  request: MedsosRequest,
  analysisResultRelation?: unknown,
): MedsosRequest {
  const hasAnalysisResult = Boolean(firstNestedRecord(analysisResultRelation)?.id);

  if (request.status === "completed" || !hasAnalysisResult) {
    return request;
  }

  return {
    ...request,
    status: "completed",
    progress_percent: 100,
    current_step: "Report completed",
    completed_at: request.completed_at || request.updated_at,
  };
}

const platformHosts: Record<MedsosPlatform, string[]> = {
  instagram: ["instagram.com", "www.instagram.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
  youtube: ["youtube.com", "www.youtube.com", "youtu.be"],
};

export function validatePlatformUrl(platform: MedsosPlatform, profileUrl: string): boolean {
  try {
    const url = new URL(profileUrl);
    return platformHosts[platform].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export async function createMedsosRequest(
  user: User,
  input: {
    platform: MedsosPlatform;
    profile_url: string;
    notes?: string | null;
  },
): Promise<MedsosRequest> {
  const entitlement = await getActiveMedsosEntitlement(user.id);

  if (!entitlement) {
    throw new Error("Paket Social Media Analysis aktif tidak ditemukan atau quota sudah habis.");
  }

  if (!validatePlatformUrl(input.platform, input.profile_url)) {
    throw new Error("URL profile tidak sesuai dengan platform yang dipilih.");
  }

  const { data, error } = await supabaseAdmin
    .from("medsos_requests")
    .insert({
      user_id: user.id,
      entitlement_id: entitlement.id,
      platform: input.platform,
      profile_url: input.profile_url,
      notes: input.notes || null,
      status: "queued",
      progress_percent: 5,
      current_step: "Request received",
      quota_charged: false,
    })
    .select()
    .single();

  if (error || !data) {
    throw error || new Error("Gagal membuat request analysis.");
  }

  const request = data as MedsosRequest;
  await addMedsosRequestEvent(request.id, "request.created", "queued", "Request received", {
    platform: input.platform,
  });

  return request;
}

export async function dispatchMedsosRequestToN8n(request: MedsosRequest): Promise<void> {
  const webhookUrl = process.env.N8N_MEDSOS_WEBHOOK_URL;

  if (!webhookUrl) {
    await updateMedsosRequestStatus(request.id, {
      status: "failed",
      progress_percent: 5,
      current_step: "n8n webhook belum dikonfigurasi",
      error_code: "n8n_webhook_missing",
      error_message: "N8N_MEDSOS_WEBHOOK_URL belum dikonfigurasi.",
    });
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.N8N_SHARED_SECRET ? { Authorization: `Bearer ${process.env.N8N_SHARED_SECRET}` } : {}),
    },
    body: JSON.stringify({
      request_id: request.id,
      entitlement_id: request.entitlement_id,
      callback_token: request.callback_token,
      platform: request.platform,
      profile_url: request.profile_url,
      notes: request.notes,
      progress_callback_url: appUrl("/api/n8n/medsos/progress"),
      result_callback_url: appUrl("/api/n8n/medsos/result"),
      error_callback_url: appUrl("/api/n8n/medsos/error"),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { execution_id?: string };

  if (!response.ok) {
    await updateMedsosRequestStatus(request.id, {
      status: "failed",
      progress_percent: 5,
      current_step: "Gagal mengirim request ke n8n",
      error_code: "n8n_dispatch_failed",
      error_message: `n8n response: ${response.status}`,
    });
    return;
  }

  await supabaseAdmin
    .from("medsos_requests")
    .update({
      status: "validating",
      progress_percent: 15,
      current_step: "Validating URL",
      started_at: new Date().toISOString(),
      n8n_execution_id: payload.execution_id || null,
    })
    .eq("id", request.id);

  await addMedsosRequestEvent(request.id, "n8n.dispatched", "validating", "Request sent to n8n", payload);
}

export async function getOwnedMedsosRequest(userId: number, requestId: number): Promise<MedsosRequest | null> {
  const { data, error } = await supabaseAdmin
    .from("medsos_requests")
    .select("*, medsos_analysis_results(id)")
    .eq("id", requestId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { medsos_analysis_results: analysisResultRelation, ...request } = data as MedsosRequest & {
    medsos_analysis_results?: unknown;
  };

  return normalizeMedsosRequestLifecycle(request, analysisResultRelation);
}

export async function getMedsosRequestEvents(requestId: number) {
  const { data, error } = await supabaseAdmin
    .from("medsos_request_events")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getMedsosHistory(userId: number) {
  const { data, error } = await supabaseAdmin
    .from("medsos_requests")
    .select("*, medsos_entitlements(medsos_packages(name)), medsos_analysis_results(id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((item) => {
    const { medsos_analysis_results: analysisResultRelation, ...request } = item as MedsosRequest & {
      medsos_analysis_results?: unknown;
    };

    return normalizeMedsosRequestLifecycle(request, analysisResultRelation);
  });
}

export async function getMedsosResult(
  userId: number,
  requestId: number,
): Promise<{ request: MedsosRequest; result: MedsosAnalysisResult | null } | null> {
  const request = await getOwnedMedsosRequest(userId, requestId);

  if (!request) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("medsos_analysis_results")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    request: normalizeMedsosRequestLifecycle(request, data),
    result: data as MedsosAnalysisResult | null,
  };
}

export async function updateMedsosRequestStatus(
  requestId: number,
  values: {
    status: MedsosRequestStatus;
    progress_percent?: number;
    current_step?: string;
    error_code?: string | null;
    error_message?: string | null;
    n8n_execution_id?: string | null;
    quota_charged?: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const statusDates =
    values.status === "completed"
      ? { completed_at: now, failed_at: null }
      : values.status === "failed"
        ? { failed_at: now }
        : {};

  const { error } = await supabaseAdmin
    .from("medsos_requests")
    .update({
      ...values,
      ...statusDates,
    })
    .eq("id", requestId);

  if (error) {
    throw error;
  }

  await addMedsosRequestEvent(
    requestId,
    `request.${values.status}`,
    values.status,
    values.current_step || values.status,
    values,
  );
}

export async function verifyMedsosCallback(requestId: number, callbackToken: string): Promise<MedsosRequest> {
  const { data, error } = await supabaseAdmin
    .from("medsos_requests")
    .select("*")
    .eq("id", requestId)
    .eq("callback_token", callbackToken)
    .maybeSingle();

  if (error || !data) {
    throw error || new Error("Callback token tidak valid.");
  }

  return data as MedsosRequest;
}

export async function saveMedsosResult(
  requestId: number,
  values: Partial<MedsosAnalysisResult>,
): Promise<void> {
  // Get request with entitlement_id for quota charging
  const { data: requestData, error: requestError } = await supabaseAdmin
    .from("medsos_requests")
    .select("entitlement_id, status, quota_charged")
    .eq("id", requestId)
    .single();

  if (requestError || !requestData) {
    throw requestError || new Error(`Request ${requestId} tidak ditemukan`);
  }

  const { error } = await supabaseAdmin.from("medsos_analysis_results").upsert(
    {
      request_id: requestId,
      summary: values.summary || null,
      sentiment_label: values.sentiment_label || null,
      sentiment_score: values.sentiment_score ?? null,
      sentiment_breakdown: asJsonObject(values.sentiment_breakdown, {}),
      engagement_score: values.engagement_score ?? null,
      engagement_metrics: asJsonObject(values.engagement_metrics, {}),
      top_topics: asJsonArray(values.top_topics, []),
      audience_insight: asJsonObject(values.audience_insight, {}),
      recommendations: asJsonArray(values.recommendations, []),
      charts_data: asJsonObject(values.charts_data, {}),
      raw_payload: asJsonValue(values.raw_payload, null),
      model_version: values.model_version || null,
      generated_at: values.generated_at || new Date().toISOString(),
    },
    { onConflict: "request_id" },
  );

  if (error) {
    throw error;
  }

  const request = requestData as Pick<MedsosRequest, "status" | "quota_charged"> & {
    entitlement_id: number;
  };

  if (request.status !== "completed") {
    await updateMedsosRequestStatus(requestId, {
      status: "completed",
      progress_percent: 100,
      current_step: "Report completed",
    });
  }

  if (!request.quota_charged) {
    await chargeMedsosQuota(request.entitlement_id);

    const { error: quotaUpdateError } = await supabaseAdmin
      .from("medsos_requests")
      .update({ quota_charged: true })
      .eq("id", requestId);

    if (quotaUpdateError) {
      throw quotaUpdateError;
    }
  }
}

export async function addMedsosRequestEvent(
  requestId: number,
  eventType: string,
  status: MedsosRequestStatus | null,
  message: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await supabaseAdmin.from("medsos_request_events").insert({
    request_id: requestId,
    event_type: eventType,
    step_name: message,
    status,
    message,
    payload: payload || null,
  });
}
