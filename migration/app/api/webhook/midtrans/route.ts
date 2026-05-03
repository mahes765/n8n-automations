import { NextRequest } from "next/server";
import { json } from "@/lib/http";
import { handleMidtransWebhook } from "@/lib/midtrans";

export async function POST(request: NextRequest) {
  try {
    await handleMidtransWebhook(
      await request.json(),
      request.headers.get("x-midtrans-signature"),
    );

    return json({ status: "ok" });
  } catch (error) {
    return json(
      { message: error instanceof Error ? error.message : "Webhook gagal diproses." },
      422,
    );
  }
}
