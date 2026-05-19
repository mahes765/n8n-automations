import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { createPendingMedsosEntitlement } from "@/lib/medsos/entitlements";
import { getMedsosPackage } from "@/lib/medsos/packages";
import { createMidtransSnap, createOrderId } from "@/lib/midtrans";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  package_id: z.coerce.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return json({ message: "Login diperlukan sebelum membeli package." }, 401);
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return json({ message: "Package tidak valid." }, 422);
  }

  const packageData = await getMedsosPackage(parsed.data.package_id);

  if (!packageData || !packageData.financial_plan_id || packageData.purchase_type !== "one_time") {
    return json({ message: "Package tidak ditemukan atau tidak valid untuk pembelian sekali." }, 404);
  }

  const orderId = createOrderId(user.id);
  const { data: transaction, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: user.id,
      plan_id: packageData.financial_plan_id,
      product_type: "medsos_package",
      midtrans_order_id: orderId,
      status: "pending",
      gross_amount: packageData.price,
    })
    .select()
    .single();

  if (error || !transaction) {
    return json({ message: error?.message || "Gagal membuat transaksi medsos." }, 500);
  }

  await createPendingMedsosEntitlement(user.id, packageData, transaction.id);

  const payment = await createMidtransSnap(orderId, packageData.price, user, {
    itemId: `medsos-${packageData.code}`,
    itemName: `Social Media Analysis ${packageData.name}`,
    finishPath: "/medsos?payment=finish",
    errorPath: "/medsos/packages?payment=error",
    pendingPath: "/medsos/packages?payment=pending",
  });

  return json(
    {
      redirect_url: payment.redirect_url,
      snap_token: payment.snap_token,
      transaction_id: transaction.id,
      midtrans_order_id: orderId,
    },
    201,
  );
}
