import { NextRequest, NextResponse } from "next/server";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return null;
}

export function isN8nRequest(request: NextRequest): boolean {
  const sharedSecret = process.env.N8N_SHARED_SECRET;
  const providedSecret = getBearerToken(request) || request.headers.get("x-n8n-secret");

  return Boolean(sharedSecret && providedSecret && sharedSecret === providedSecret);
}
