import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { getActiveMedsosEntitlement } from "@/lib/medsos/entitlements";
import { createMedsosRequest, dispatchMedsosRequestToN8n } from "@/lib/medsos/requests";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  platform: z.enum(["instagram", "tiktok", "youtube"]),
  profile_url: z.string().url().optional(),
  profile_urls: z.array(z.string().url()).min(1).optional(),
  notes: z.string().max(1000).optional().nullable(),
}).refine((data) => Boolean(data.profile_url || data.profile_urls?.length), {
  message: "Minimal satu profile URL harus diisi.",
  path: ["profile_urls"],
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

  const profileUrls = parsed.data.profile_urls?.length
    ? parsed.data.profile_urls
    : parsed.data.profile_url
      ? [parsed.data.profile_url]
      : [];

  const entitlement = await getActiveMedsosEntitlement(user.id);

  if (!entitlement) {
    return json({ message: "Paket Social Media Analysis aktif tidak ditemukan atau quota sudah habis." }, 422);
  }

  const remainingQuota = entitlement.quota_total - entitlement.quota_used;

  if (profileUrls.length > remainingQuota) {
    return json(
      { message: `Quota tidak cukup. Tersisa ${remainingQuota} analysis, tetapi kamu mengirim ${profileUrls.length} URL.` },
      422,
    );
  }

  try {
    const createdRequests = [];

    for (const profileUrl of profileUrls) {
      const medsosRequest = await createMedsosRequest(user, {
        platform: parsed.data.platform,
        profile_url: profileUrl,
        notes: parsed.data.notes,
      });

      await dispatchMedsosRequestToN8n(medsosRequest);
      createdRequests.push(medsosRequest);
    }

    const redirectUrl = createdRequests.length === 1 ? `/medsos/analysis/${createdRequests[0].id}` : "/medsos/history";

    return json(
      {
        request_id: createdRequests[0]?.id,
        request_ids: createdRequests.map((requestItem) => requestItem.id),
        redirect_url: redirectUrl,
      },
      201,
    );
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "Gagal membuat analysis." }, 422);
  }
}
