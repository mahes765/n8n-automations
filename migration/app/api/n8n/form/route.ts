import { json } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/subscriptions";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !(await getActiveSubscription(user.id))) {
    return json({ message: "Subscription aktif diperlukan." }, 403);
  }

  return new Response("Access granted to Form");
}
