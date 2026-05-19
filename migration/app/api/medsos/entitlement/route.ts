import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { getActiveMedsosEntitlement } from "@/lib/medsos/entitlements";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return json({ message: "Login diperlukan." }, 401);
  }

  const entitlement = await getActiveMedsosEntitlement(user.id);

  return json({
    has_access: Boolean(entitlement),
    entitlement: entitlement
      ? {
          ...entitlement,
          quota_remaining: entitlement.quota_total - entitlement.quota_used,
        }
      : null,
  });
}
