import { getCurrentUser } from "@/lib/auth";
import { daysLeft } from "@/lib/dates";
import { json } from "@/lib/http";
import { getActiveSubscription } from "@/lib/subscriptions";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return json({ message: "Login diperlukan untuk melihat subscription." }, 401);
  }

  const subscription = await getActiveSubscription(user.id);

  if (!subscription) {
    return json({
      active: false,
      plan: null,
      start_date: null,
      end_date: null,
      days_left: 0,
    });
  }

  return json({
    active: true,
    plan: subscription.subscription_plans?.name ?? null,
    start_date: subscription.start_date,
    end_date: subscription.end_date,
    days_left: daysLeft(subscription.end_date),
  });
}
