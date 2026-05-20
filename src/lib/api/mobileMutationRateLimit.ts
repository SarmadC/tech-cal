import { NextResponse } from "next/server";

import {
  checkRateLimit,
  createRateLimiter,
  RATE_LIMIT_CONFIGS,
} from "@/utils/rateLimit";

export type MutationScope =
  | "thread-create"
  | "thread-update"
  | "thread-delete"
  | "comment-create"
  | "comment-update"
  | "comment-delete"
  | "community-report";

// All current configs use a 1-minute window, so 60 is the worst-case retry
// hint. We keep this constant rather than reading from the upstash response
// because `checkRateLimit` already discards the reset timestamp.
const DEFAULT_RETRY_AFTER_SECONDS = 60;

/**
 * Apply a sliding-window rate limit per user to a mutating community route.
 * Returns a 429 NextResponse to return early, or null when the request is
 * within the limit and the handler may proceed.
 */
export async function gateMutation(
  scope: MutationScope,
  userId: string,
): Promise<NextResponse | null> {
  const limiter = createRateLimiter(scope, "MEDIUM_FREQUENCY");
  const result = await checkRateLimit(limiter, userId);
  if (result.success) return null;

  // Touch the config so any future tweak surfaces here.
  void RATE_LIMIT_CONFIGS.MEDIUM_FREQUENCY;

  const message =
    typeof result.error === "object" &&
    result.error !== null &&
    "message" in result.error &&
    typeof (result.error as { message: unknown }).message === "string"
      ? (result.error as { message: string }).message
      : "Too many requests. Please try again later.";

  return NextResponse.json(
    { success: false, error: message },
    {
      status: 429,
      headers: { "Retry-After": String(DEFAULT_RETRY_AFTER_SECONDS) },
    },
  );
}
