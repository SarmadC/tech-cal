import { NextResponse } from "next/server";

export function invalidRequest(message = "Invalid request.") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 400 },
  );
}

export function authRequired() {
  return NextResponse.json(
    { success: false, error: "Authentication required" },
    { status: 401 },
  );
}

export function serviceUnavailable() {
  return NextResponse.json(
    { success: false, error: "Community service is not configured." },
    { status: 500 },
  );
}

/**
 * Log the raw error server-side and respond with a generic message so we
 * don't leak Supabase/Postgres internals (constraint names, RLS reasons,
 * table existence) to the API client.
 */
export function genericFailure(
  context: string,
  fallback: string,
  error: unknown,
) {
  console.error(`[${context}] ${fallback}`, error);
  return NextResponse.json(
    { success: false, error: fallback },
    { status: 500 },
  );
}
