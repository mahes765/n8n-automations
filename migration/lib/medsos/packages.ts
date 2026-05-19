import { supabaseAdmin } from "@/lib/supabase";
import type { MedsosPackage } from "@/lib/types";

export async function listMedsosPackages(): Promise<MedsosPackage[]> {
  const { data, error } = await supabaseAdmin
    .from("medsos_packages")
    .select("*")
    .eq("active", true)
    .order("price", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as MedsosPackage[];
}

export async function getMedsosPackage(packageId: number): Promise<MedsosPackage | null> {
  const { data, error } = await supabaseAdmin
    .from("medsos_packages")
    .select("*")
    .eq("id", packageId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as MedsosPackage | null;
}
