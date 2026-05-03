import { json } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .order("duration_days", { ascending: true });

  if (error) {
    return json({ message: error.message }, 500);
  }

  return json({ plans: data });
}
