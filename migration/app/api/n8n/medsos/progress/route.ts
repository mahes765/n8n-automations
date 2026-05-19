import { NextRequest } from "next/server";
import { z } from "zod";
import { isN8nRequest, json } from "@/lib/http";
import { updateMedsosRequestStatus, verifyMedsosCallback } from "@/lib/medsos/requests";

const schema = z.object({
  request_id: z.coerce.number().int().positive(),
  callback_token: z.string().min(16),
  status: z.enum(["queued", "validating", "scraping", "ai_processing", "generating_report", "retry_wait"]),
  progress_percent: z.coerce.number().int().min(0).max(99),
  current_step: z.string().min(1).max(200),
  n8n_execution_id: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  if (!isN8nRequest(request)) {
    return json({ message: "Unauthorized." }, 401);
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return json({ message: "Payload progress tidak valid." }, 422);
  }

  await verifyMedsosCallback(parsed.data.request_id, parsed.data.callback_token);
  await updateMedsosRequestStatus(parsed.data.request_id, {
    status: parsed.data.status,
    progress_percent: parsed.data.progress_percent,
    current_step: parsed.data.current_step,
    n8n_execution_id: parsed.data.n8n_execution_id || undefined,
  });

  return json({ ok: true });
}
