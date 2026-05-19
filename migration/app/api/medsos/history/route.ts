import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { getMedsosHistory } from "@/lib/medsos/requests";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return json({ message: "Login diperlukan." }, 401);
  }

  const history = await getMedsosHistory(user.id);

  return json({ history });
}
