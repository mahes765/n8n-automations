import { isN8nRequest, json } from "@/lib/http";
import { updateMedsosRequestStatus, verifyMedsosCallback } from "@/lib/medsos/requests";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  request_id: z.coerce.number().int().positive(),
  callback_token: z.string().min(16),
  error_code: z.string().min(1).max(80).default("n8n_failed"),
  error_message: z.string().min(1).max(500),
  n8n_secret: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return json({ message: "Payload error tidak valid." }, 422);
  }

  let callbackVerified = false;

  try {
    await verifyMedsosCallback(parsed.data.request_id, parsed.data.callback_token);
    callbackVerified = true;
  } catch {
    callbackVerified = false;
  }

  // DEBUG: Log auth details
  const authHeader = request.headers.get("authorization");
  const secretHeader = request.headers.get("x-n8n-secret");
  const envSecret = process.env.N8N_SHARED_SECRET;

  console.log("🔍 Error Auth Debug:", {
    authHeader: authHeader ? `Bearer ${authHeader.slice(7, 20)}...` : "missing",
    secretHeader: secretHeader ? `${secretHeader.slice(0, 20)}...` : "missing",
    bodySecret: body.n8n_secret ? `${body.n8n_secret.slice(0, 20)}...` : "missing",
    envSecret: envSecret ? `${envSecret.slice(0, 20)}...` : "UNDEFINED ⚠️",
  });

  if (!isN8nRequest(request, body) && !callbackVerified) {
    console.log("❌ Error auth validation failed");
    return json({ message: "Unauthorized." }, 401);
  }
  
  console.log("✅ Error auth validation passed");

  await updateMedsosRequestStatus(parsed.data.request_id, {
    status: "failed",
    progress_percent: 100,
    current_step: "Analysis failed",
    error_code: parsed.data.error_code,
    error_message: parsed.data.error_message,
  });

  return json({ ok: true });
}
