import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { createMedsosRequest, dispatchMedsosRequestToN8n } from "@/lib/medsos/requests";

const schema = z.object({
  platform: z.enum(["instagram", "tiktok", "youtube"]),
  profile_url: z.string().url(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return json({ message: "Login diperlukan." }, 401);
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return json({ message: "Input analysis tidak valid." }, 422);
  }

  try {
    const medsosRequest = await createMedsosRequest(user, parsed.data);
    await dispatchMedsosRequestToN8n(medsosRequest);

    return json(
      {
        request_id: medsosRequest.id,
        redirect_url: `/medsos/analysis/${medsosRequest.id}`,
      },
      201,
    );
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "Gagal membuat analysis." }, 422);
  }
}
