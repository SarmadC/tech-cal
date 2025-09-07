import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { notFound } from "next/navigation";

// --- Rate Limiter Setup ---
// This creates a new rate limiter instance.
// It allows a maximum of 5 requests from a single IP address within a 10-second window.
const ratelimit = new Ratelimit({
    redis: kv, // Uses Vercel's Key-Value store (built on Redis) for tracking requests.
    limiter: Ratelimit.slidingWindow(5, "10 s"), // The algorithm and its configuration.
    analytics: true, // Enables analytics in your Vercel dashboard.
    prefix: "@upstash/ratelimit",
});

export const dynamic = "force-dynamic";

class SentryExampleAPIError extends Error {
    constructor(message: string | undefined) {
        super(message);
        this.name = "SentryExampleAPIError";
    }
}

// The GET function is now async and accepts the request object
export async function GET(request: NextRequest) {
    // Gate this API route to non-production environments only
    if (process.env.NODE_ENV === 'production') {
        notFound();
    }

    // --- Rate Limiting Logic ---
    // We use the user's IP address as the unique identifier for rate limiting.
    // `x-forwarded-for` is the standard header for identifying the originating IP address
    // of a client connecting to a web server through an HTTP proxy or a load balancer.
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

    // The `limit` method checks if the request from this IP is within the allowed rate.
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    // If `success` is false, it means the user has exceeded the rate limit.
    if (!success) {
        // We return a 429 Too Many Requests response.
        return new NextResponse("Too many requests. Please try again later.", {
            status: 429,
            headers: {
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
            },
        });
    }

    // --- Original Route Logic ---
    // This code will only execute if the rate limit check passes.
    throw new SentryExampleAPIError("This error is raised on the backend called by the example page.");

    // This line is unreachable but kept for context.
    // return NextResponse.json({ data: "Testing Sentry Error..." });
}