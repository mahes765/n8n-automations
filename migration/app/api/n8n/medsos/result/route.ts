import { NextRequest } from "next/server";
import { z } from "zod";
import { isN8nRequest, json } from "@/lib/http";
import { saveMedsosResult, verifyMedsosCallback } from "@/lib/medsos/requests";

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
});

export async function POST(request: NextRequest) {
  if (!isN8nRequest(request)) {
    return json({ message: "Unauthorized." }, 401);
  }

  const body = await request.json();
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
