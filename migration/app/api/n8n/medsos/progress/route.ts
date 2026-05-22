import { isN8nRequest, json } from "@/lib/http";
import { updateMedsosRequestStatus, verifyMedsosCallback } from "@/lib/medsos/requests";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  request_id: z.coerce.number().int().positive(),
  callback_token: z.string().min(16),
  status: z.enum(["queued", "validating", "scraping", "ai_processing", "generating_report", "retry_wait"]),
  progress_percent: z.coerce.number().int().min(0).max(99),
  current_step: z.string().min(1).max(200),
  n8n_execution_id: z.string().optional().nullable(),
  n8n_secret: z.string().optional(), // Accept but don't require (auth happens first)
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return json({ message: "Payload progress tidak valid." }, 422);
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

  console.log("🔍 Auth Debug:", {
    authHeader: authHeader ? `Bearer ${authHeader.slice(7, 20)}...` : "missing",
    secretHeader: secretHeader ? `${secretHeader.slice(0, 20)}...` : "missing",
    bodySecret: body.n8n_secret ? `${body.n8n_secret.slice(0, 20)}...` : "missing",
    envSecret: envSecret ? `${envSecret.slice(0, 20)}...` : "UNDEFINED ⚠️",
  });

  if (!isN8nRequest(request, body) && !callbackVerified) {
    console.log("❌ Auth validation failed");
    return json({ message: "Unauthorized." }, 401);
  }
  
  console.log("✅ Auth validation passed");

  await updateMedsosRequestStatus(parsed.data.request_id, {
    status: parsed.data.status,
    progress_percent: parsed.data.progress_percent,
    current_step: parsed.data.current_step,
    n8n_execution_id: parsed.data.n8n_execution_id || undefined,
  });

  return json({ ok: true });
}
