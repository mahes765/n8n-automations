import { json } from "@/lib/http";
import { NextRequest } from "next/server";

/**
 * GET /api/debug/n8n-webhook-test
 * 
 * TEST ENDPOINT - helps diagnose N8N webhook connectivity issues
 * WARNING: Only use in development/staging. Remove in production!
 * 
 * Returns:
 * - N8N webhook URL from env
 * - Test if webhook is accessible
 * - Detailed error messages for debugging
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return json({ message: "This endpoint is only available in development" }, 403);
  }

  const webhookUrl = process.env.N8N_MEDSOS_WEBHOOK_URL;

  if (!webhookUrl) {
    return json({
      status: "error",
      message: "N8N_MEDSOS_WEBHOOK_URL not configured in .env.local",
      configured: false,
      webhook_url: null,
      diagnostic: "Add N8N_MEDSOS_WEBHOOK_URL to .env.local with your N8N webhook URL",
    });
  }

  try {
    // Test 1: Try POST request to webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_SHARED_SECRET
          ? { Authorization: `Bearer ${process.env.N8N_SHARED_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
        source: "next.js-debug-endpoint",
      }),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return json({
      status: "success",
      configured: true,
      webhook_url: webhookUrl,
      test_result: {
        status_code: response.status,
        status_text: response.statusText,
        headers: {
          "content-type": response.headers.get("content-type"),
          "content-length": response.headers.get("content-length"),
        },
        response: responseData,
      },
      diagnostic:
        response.ok
          ? "✅ Webhook accessible and responded successfully"
          : response.status === 404
            ? "❌ Webhook not found (404). Check: 1) Path is correct, 2) Workflow is ACTIVATED in N8N"
            : response.status === 401 || response.status === 403
              ? "❌ Authentication failed (401/403). Check: 1) N8N_SHARED_SECRET is correct, 2) N8N auth settings"
              : `❌ Webhook returned ${response.status}. Check N8N logs for details`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return json({
      status: "error",
      configured: true,
      webhook_url: webhookUrl,
      test_result: null,
      error: errorMessage,
      diagnostic:
        errorMessage.includes("fetch failed")
          ? "❌ Network error - N8N instance not reachable. Check: 1) URL is correct, 2) N8N instance is running, 3) Firewall allows HTTPS"
          : errorMessage.includes("ECONNREFUSED")
            ? "❌ Connection refused - N8N instance not responding. Check if N8N is running"
            : errorMessage.includes("ETIMEDOUT")
              ? "❌ Connection timeout - N8N instance slow or unreachable"
              : `❌ ${errorMessage}`,
    });
  }
}

/**
 * POST /api/debug/n8n-webhook-test
 * 
 * Same test but can accept custom payload for testing
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return json({ message: "This endpoint is only available in development" }, 403);
  }

  const webhookUrl = process.env.N8N_MEDSOS_WEBHOOK_URL;

  if (!webhookUrl) {
    return json({
      status: "error",
      message: "N8N_MEDSOS_WEBHOOK_URL not configured",
      configured: false,
    });
  }

  try {
    const payload = await request.json().catch(() => ({}));

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_SHARED_SECRET
          ? { Authorization: `Bearer ${process.env.N8N_SHARED_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        ...payload,
        test: true,
        timestamp: new Date().toISOString(),
      }),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return json({
      status: response.ok ? "success" : "error",
      webhook_url: webhookUrl,
      sent_payload: payload,
      response_status: response.status,
      response_data: responseData,
    });
  } catch (error) {
    return json({
      status: "error",
      webhook_url: webhookUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
