import { NextResponse } from "next/server";
import { z } from "zod";
import { setSession, verifyPassword } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { User } from "@/lib/types";

const schema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Email atau password tidak valid." }, { status: 422 });
  }

  const { data } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", parsed.data.email)
    .maybeSingle();

  const user = data as User | null;

  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    return NextResponse.json({ message: "Email atau password tidak sesuai." }, { status: 401 });
  }

  await setSession(user.id);

  return NextResponse.json({ redirect_url: "/plans" });
}
