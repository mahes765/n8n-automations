import { isN8nRequest, json } from "@/lib/http";
import { saveMedsosResult, verifyMedsosCallback } from "@/lib/medsos/requests";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  request_id: z.coerce.number().int().positive(),
  callback_token: z.string().min(16),
  summary: z.string().optional().nullable(),
  sentiment_label: z.string().optional().nullable(),
  sentiment_score: z.coerce.number().min(-1).max(1).optional().nullable(),
  sentiment_breakdown: z.record(z.coerce.number()).optional(),
  engagement_score: z.coerce.number().min(0).max(100).optional().nullable(),
  engagement_metrics: z.record(z.unknown()).optional(),
  top_topics: z.array(z.unknown()).optional(),
  audience_insight: z.record(z.unknown()).optional(),
  recommendations: z.array(z.unknown()).optional(),
  charts_data: z.record(z.unknown()).optional(),
  raw_payload: z.record(z.unknown()).optional().nullable(),
  model_version: z.string().optional().nullable(),
  n8n_secret: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // DEBUG: Log auth details
  const authHeader = request.headers.get("authorization");
  const secretHeader = request.headers.get("x-n8n-secret");
  const envSecret = process.env.N8N_SHARED_SECRET;
  
  console.log("🔍 Result Auth Debug:", {
    authHeader: authHeader ? `Bearer ${authHeader.slice(7, 20)}...` : "missing",
    secretHeader: secretHeader ? `${secretHeader.slice(0, 20)}...` : "missing",
    bodySecret: body.n8n_secret ? `${body.n8n_secret.slice(0, 20)}...` : "missing",
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
    raw_payload: parsed.data.raw_payload || body,
  });

  return json({ ok: true });
}
