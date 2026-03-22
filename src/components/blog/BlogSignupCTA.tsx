'use client';

import Link from 'next/link';
import { usePostHog } from 'posthog-js/react';
import { CalendarDots } from '@phosphor-icons/react';

export function BlogSignupCTA({ postSlug }: { postSlug: string }) {
    const posthog = usePostHog();

    return (
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-6">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CalendarDots size={20} weight="duotone" className="text-emerald-400" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-zinc-100">
                        Track these events on your calendar
                    </p>
                    <p className="mt-1 text-[13px] leading-5 text-zinc-400">
                        Sign up free to bookmark events, get reminders, and sync with Google Calendar.
                    </p>
                </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
                <Link
                    href="/signup"
                    onClick={() => posthog?.capture('blog_cta_clicked', {
                        cta_text: 'Get Started Free',
                        cta_location: 'blog_sidebar',
                        post_slug: postSlug,
                        destination: '/signup',
                    })}
                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                >
                    Get Started Free
                </Link>
                <Link
                    href="/events"
                    onClick={() => posthog?.capture('blog_cta_clicked', {
                        cta_text: 'Browse Events',
                        cta_location: 'blog_sidebar',
                        post_slug: postSlug,
                        destination: '/events',
                    })}
                    className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                >
                    Browse Events
                </Link>
            </div>
        </section>
    );
}
