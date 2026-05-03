import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import type { User } from "@/lib/types";
import { requireEnv } from "@/lib/env";

const sessionCookie = "subscription_session";

type SessionPayload = {
  userId: number;
  exp: number;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", requireEnv("APP_SESSION_SECRET")).update(payload).digest("base64url");
}

function makeToken(payload: SessionPayload): string {
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function readToken(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = sign(body);
  const valid =
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  if (!valid) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;

  return payload.exp > Date.now() ? payload : null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Laravel bcrypt hashes often start with $2y$; bcryptjs expects $2a$ or $2b$.
  const compatibleHash = hash.startsWith("$2y$") ? `$2a$${hash.slice(4)}` : hash;
  return bcrypt.compare(password, compatibleHash);
}

export async function setSession(userId: number): Promise<void> {
  const cookieStore = await cookies();
  const token = makeToken({
    userId,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
  });

  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookie);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;

  if (!token) {
    return null;
  }

  const payload = readToken(token);

  if (!payload) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", payload.userId)
    .single();

  if (error) {
    return null;
  }

  return data as User;
}

export function createLinkToken(): string {
  return randomBytes(24).toString("hex");
}
