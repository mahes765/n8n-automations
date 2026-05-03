import { NextRequest } from "next/server";
import { isN8nRequest, json } from "@/lib/http";
import { telegramSubscriptionStatus } from "@/lib/subscriptions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ telegramId: string }> },
) {
  if (!process.env.N8N_SHARED_SECRET) {
    return json({ message: "N8N shared secret belum dikonfigurasi." }, 503);
  }

  if (!isN8nRequest(request)) {
    return json({ message: "Unauthorized." }, 401);
  }

  const { telegramId } = await params;

  return json(await telegramSubscriptionStatus(telegramId));
}
