import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { getMedsosResult } from "@/lib/medsos/requests";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return json({ message: "Login diperlukan." }, 401);
  }

  const { id } = await params;
  const requestId = Number(id);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return json({ message: "Request tidak valid." }, 422);
  }

  const data = await getMedsosResult(user.id, requestId);

  if (!data) {
    return json({ message: "Analysis tidak ditemukan." }, 404);
  }

  return json(data);
}
