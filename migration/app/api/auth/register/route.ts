import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, setSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const schema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(255),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Data register tidak valid." }, { status: 422 });
  }

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: "Email sudah terdaftar." }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      password: await hashPassword(parsed.data.password),
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ message: error?.message || "Register gagal." }, { status: 500 });
  }

  await setSession(data.id);

  return NextResponse.json({ redirect_url: "/plans" }, { status: 201 });
}
