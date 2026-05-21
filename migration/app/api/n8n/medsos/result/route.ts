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

  await verifyMedsosCallback(parsed.data.request_id, parsed.data.callback_token);
  await saveMedsosResult(parsed.data.request_id, {
    ...parsed.data,
    sentiment_breakdown: asJsonObject(parsed.data.sentiment_breakdown, {}),
    engagement_metrics: asJsonObject(parsed.data.engagement_metrics, {}),
    top_topics: asJsonArray(parsed.data.top_topics, []),
    audience_insight: asJsonObject(parsed.data.audience_insight, {}),
    recommendations: asJsonArray(parsed.data.recommendations, []),
    charts_data: asJsonObject(parsed.data.charts_data, {}),
    raw_payload: asJsonValue(parsed.data.raw_payload, body),
  });

  return json({ ok: true });
}
