import { json } from "@/lib/http";
import { getApifyService } from "@/lib/medsos/apify";
import { NextRequest } from "next/server";
import { z } from "zod";

/**
 * POST /api/medsos/scrape-instagram
 *
 * Endpoint untuk scrape Instagram profile data menggunakan Apify
 *
 * Body:
 * {
 *   "username": "kompascom",
 *   "request_id": "optional_request_id",
 *   "callback_url": "optional_callback_for_async"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": { ... },
 *   "timestamp": "2026-05-21T..."
 * }
 */

const requestSchema = z.object({
  username: z.string().min(1).max(30),
  request_id: z.string().optional(),
  callback_url: z.string().url().optional(),
  n8n_secret: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validasi input
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        {
          success: false,
          error: "Input tidak valid",
          details: parsed.error.flatten(),
        },
        422
      );
    }

    const { username, request_id, callback_url, n8n_secret } = parsed.data;

    // Optional: Validate n8n secret jika diperlukan
    // if (n8n_secret !== process.env.N8N_SHARED_SECRET) {
    //   return json({ success: false, error: "Unauthorized" }, 401);
    // }

    console.log(`[Scrape Request] Username: ${username}, RequestID: ${request_id}`);

    // Get Apify service
    const apifyService = getApifyService();

    // Async mode jika ada callback URL
    if (callback_url) {
      // Trigger scraping tanpa menunggu (background job)
      apifyService.scrapeProfile(username).then(async (result) => {
        try {
          const callbackResponse = await fetch(callback_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              request_id,
              ...result,
            }),
          });

          if (!callbackResponse.ok) {
            console.error(
              `[Callback Error] Status ${callbackResponse.status} untuk request ${request_id}`
            );
          }
        } catch (err) {
          console.error(`[Callback Error] Gagal mengirim callback:`, err);
        }
      });

      return json(
        {
          success: true,
          status: "queued",
          message: "Scraping dimulai, hasil akan dikirim ke callback URL",
          request_id,
        },
        202 // Accepted
      );
    }

    // Sync mode (tunggu hasil)
    const result = await apifyService.scrapeProfile(username);

    if (!result.success) {
      return json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          request_id,
        },
        422
      );
    }

    return json(
      {
        success: true,
        data: result.data,
        request_id,
        timestamp: result.timestamp,
      },
      200
    );
  } catch (error: any) {
    console.error("[Scrape Error]", error);

    return json(
      {
        success: false,
        error: error.message || "Terjadi error saat scraping",
        errorCode: "SERVER_ERROR",
      },
      500
    );
  }
}

/**
 * GET /api/medsos/scrape-instagram
 *
 * Get cache stats dan info service
 */
export async function GET() {
  const apifyService = getApifyService();
  const stats = apifyService.getCacheStats();

  return json({
    service: "apify-instagram-scraper",
    status: "active",
    cache: stats,
  });
}
