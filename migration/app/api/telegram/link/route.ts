import { NextRequest } from "next/server";
import { z } from "zod";
import { isN8nRequest, json } from "@/lib/http";
import { linkTelegram } from "@/lib/telegram";

const schema = z.object({
  telegram_id: z.string().regex(/^[0-9]+$/),
  link_token: z.string().min(1).max(64),
});

export async function POST(request: NextRequest) {
  if (!process.env.N8N_SHARED_SECRET) {
    return json({ message: "N8N shared secret belum dikonfigurasi." }, 503);
  }

  if (!isN8nRequest(request)) {
    return json({ message: "Unauthorized." }, 401);
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return json(
      {
        linked: false,
        status: "invalid_payload",
        message: "Payload hubungkan Telegram tidak valid.",
      },
      422,
    );
  }

  const result = await linkTelegram(parsed.data.telegram_id, parsed.data.link_token);

  return json(result, result.linked ? 200 : 422);
}
