import { isN8nRequest, json } from "@/lib/http";
import { saveMedsosResult, verifyMedsosCallback } from "@/lib/medsos/requests";
import { NextRequest } from "next/server";
import { z } from "zod";

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

function isEmptyObject(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.keys(value).length === 0;
}

function isEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

function textToList(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  const text = value.trim();

  if (!text) {
    return [];
  }

  const baseParts = text.includes("\n") ? text.split("\n") : text.split(",");

  return baseParts
    .map((item) => item.trim())
    .map((item) => item.replace(/^(\d+[.)]\s*|[-*]\s*)/, "").trim())
    .filter(Boolean);
}

function asSummaryObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") {
    return {};
  }

  const summary = value.trim();
  return summary ? { summary } : {};
}

function normalizeObjectField(topLevelValue: unknown, rawValue: unknown): Record<string, unknown> {
  const topObject = asJsonObject(topLevelValue, {});

  if (!isEmptyObject(topObject)) {
    return topObject;
  }

  const topSummaryObject = asSummaryObject(topLevelValue);

  if (!isEmptyObject(topSummaryObject)) {
    return topSummaryObject;
  }

  const rawObject = asJsonObject(rawValue, {});

  if (!isEmptyObject(rawObject)) {
    return rawObject;
  }

  return asSummaryObject(rawValue);
}

function normalizeArrayField(topLevelValue: unknown, rawValue: unknown): unknown[] {
  const topArray = asJsonArray(topLevelValue, []);

  if (!isEmptyArray(topArray)) {
    return topArray;
  }

  const topTextList = textToList(topLevelValue);

  if (!isEmptyArray(topTextList)) {
    return topTextList;
  }

  const rawArray = asJsonArray(rawValue, []);

  if (!isEmptyArray(rawArray)) {
    return rawArray;
  }

  return textToList(rawValue);
}

function normalizeRequestBody(body: unknown): Record<string, unknown> | null {
  const parsed = parseJsonString(body);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  return parsed as Record<string, unknown>;
}

const schema = z.object({
  request_id: z.coerce.number().int().positive(),
  callback_token: z.string().min(16),
  summary: z.string().optional().nullable(),
  sentiment_label: z.string().optional().nullable(),
  sentiment_score: z.coerce.number().min(-1).max(1).optional().nullable(),
  sentiment_breakdown: z.union([z.record(z.unknown()), z.string()]).optional(),
  engagement_score: z.coerce.number().min(0).max(100).optional().nullable(),
  engagement_metrics: z.union([z.record(z.unknown()), z.string()]).optional(),
  top_topics: z.union([z.array(z.unknown()), z.string()]).optional(),
  audience_insight: z.union([z.record(z.unknown()), z.string()]).optional(),
  recommendations: z.union([z.array(z.unknown()), z.string()]).optional(),
  charts_data: z.union([z.record(z.unknown()), z.string()]).optional(),
  raw_payload: z.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.null()]).optional(),
  model_version: z.string().optional().nullable(),
  n8n_secret: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const rawBody = await request.json();
  const body = normalizeRequestBody(rawBody);

  if (!body) {
    return json({ message: "Payload result tidak valid." }, 422);
  }
  
  // DEBUG: Log auth details
  const authHeader = request.headers.get("authorization");
  const secretHeader = request.headers.get("x-n8n-secret");
  const envSecret = process.env.N8N_SHARED_SECRET;
  const bodySecret = typeof body.n8n_secret === "string" ? body.n8n_secret : undefined;
  
  console.log("🔍 Result Auth Debug:", {
    authHeader: authHeader ? `Bearer ${authHeader.slice(7, 20)}...` : "missing",
    secretHeader: secretHeader ? `${secretHeader.slice(0, 20)}...` : "missing",
    bodySecret: bodySecret ? `${bodySecret.slice(0, 20)}...` : "missing",
    envSecret: envSecret ? `${envSecret.slice(0, 20)}...` : "UNDEFINED ⚠️",
  });

  if (!isN8nRequest(request, body)) {
    console.log("❌ Result auth validation failed");
    return json({ message: "Unauthorized." }, 401);
  }
  
  console.log("✅ Result auth validation passed");

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return json({ message: "Payload result tidak valid." }, 422);
  }

  const rawPayloadObject = asJsonObject(parsed.data.raw_payload, {});

  const sentimentBreakdown = normalizeObjectField(
    parsed.data.sentiment_breakdown,
    rawPayloadObject.sentiment_breakdown,
  );
  const engagementMetrics = normalizeObjectField(
    parsed.data.engagement_metrics,
    rawPayloadObject.engagement_metrics,
  );
  const audienceInsight = normalizeObjectField(
    parsed.data.audience_insight,
    rawPayloadObject.audience_insight,
  );
  const chartsData = normalizeObjectField(
    parsed.data.charts_data,
    rawPayloadObject.charts_data,
  );
  const topTopics = normalizeArrayField(parsed.data.top_topics, rawPayloadObject.top_topics);
  const recommendations = normalizeArrayField(parsed.data.recommendations, rawPayloadObject.recommendations);

  await verifyMedsosCallback(parsed.data.request_id, parsed.data.callback_token);
  await saveMedsosResult(parsed.data.request_id, {
    ...parsed.data,
    sentiment_breakdown: sentimentBreakdown,
    engagement_metrics: engagementMetrics,
    top_topics: topTopics,
    audience_insight: audienceInsight,
    recommendations,
    charts_data: chartsData,
    raw_payload: asJsonValue(parsed.data.raw_payload, body),
  });

  return json({ ok: true });
}
