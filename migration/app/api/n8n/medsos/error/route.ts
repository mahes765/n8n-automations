import { NextRequest } from "next/server";
import { z } from "zod";
import { isN8nRequest, json } from "@/lib/http";
import { updateMedsosRequestStatus, verifyMedsosCallback } from "@/lib/medsos/requests";

const schema = z.object({
  request_id: z.coerce.number().int().positive(),
  callback_token: z.string().min(16),
  error_code: z.string().min(1).max(80).default("n8n_failed"),
  error_message: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  if (!isN8nRequest(request)) {
    return json({ message: "Unauthorized." }, 401);
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return json({ message: "Payload error tidak valid." }, 422);
  }

  await verifyMedsosCallback(parsed.data.request_id, parsed.data.callback_token);
  await updateMedsosRequestStatus(parsed.data.request_id, {
    status: "failed",
    progress_percent: 100,
    current_step: "Analysis failed",
    error_code: parsed.data.error_code,
    error_message: parsed.data.error_message,
  });

  return json({ ok: true });
}
