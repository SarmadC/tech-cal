"use client";

import Link from 'next/link';
import Image from 'next/image';
import React, { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BookmarkSimple } from '@phosphor-icons/react';
import { useAuth } from '@/contexts';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { NavigationUtils } from '@/utils/navigationUtils';

type Role = {
    id: string;
    label: string;
    keywords: string[];
};

function isLikelyLogoAsset(url: string | null | undefined) {
    if (!url) {
        return false;
    }

    const normalized = url.toLowerCase();

    if (
        normalized.includes('og') ||
        normalized.includes('open-graph') ||
        normalized.includes('banner') ||
        normalized.includes('hero') ||
        normalized.includes('cover')
    ) {
        return false;
    }

    return (
        normalized.endsWith('.svg') ||
        normalized.endsWith('.png') ||
        normalized.endsWith('.ico') ||
        normalized.includes('/logo')
    );
}

function extractTextFromNode(node: React.ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') {
        return '';
    }

    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map(extractTextFromNode).join(' ');
    }

    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
        return extractTextFromNode(node.props.children);
    }

    return '';
}

type InteractiveEventCardProps = {
    title: string;
    date?: string;
    location?: string;
    focus?: string;
    tech?: string;
    experience?: string;
    logoUrl?: string;
    imageUrl?: string;
    eventId?: string;
    slug?: string;
    id?: string;
    activeRole?: string | null;
    roles?: Role[];
    children: React.ReactNode;
};

export function InteractiveEventCard({
    title,
    date,
    location,
    focus,
    tech,
    experience,
    logoUrl,
    imageUrl,
    eventId,
    slug,
    id,
    activeRole,
    roles,
    children
}: InteractiveEventCardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { isBookmarked, toggleBookmark } = useEventEngagement();
    const [isBusy, setIsBusy] = useState(false);

    // Filtering logic
    const isDimmed = React.useMemo(() => {
        if (!activeRole || !roles) return false;
        const currentRole = roles.find(r => r.id === activeRole);
        if (!currentRole) return false;

        const bodyText = extractTextFromNode(children);
        const textToSearch = `${title} ${focus || ''} ${tech || ''} ${experience || ''} ${location || ''} ${bodyText}`.toLowerCase();
        const hasMatch = currentRole.keywords.some(keyword => textToSearch.includes(keyword.toLowerCase()));
        return !hasMatch;
    }, [activeRole, roles, title, focus, tech, experience, location, children]);

    const loginRedirect = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const eventIsBookmarked = eventId ? isBookmarked(eventId) : false;
    const shouldRenderLogo = !imageUrl && isLikelyLogoAsset(logoUrl);

    const handleBookmark = async () => {
        if (!eventId || isBusy) {
            return;
        }

        if (!user) {
            router.push(NavigationUtils.goToLogin(loginRedirect));
            return;
        }

        setIsBusy(true);
        try {
            await toggleBookmark(eventId, { title });
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <section className={`relative my-16 border-t border-white/10 pt-10 transition-all duration-300 ${isDimmed ? 'opacity-35' : ''}`}>
            {imageUrl && (
                <div className="mb-8 overflow-hidden rounded-[16px]">
                    <Image
                        src={imageUrl}
                        alt={`${title} banner`}
                        width={1600}
                        height={700}
                        className="h-auto max-h-[420px] w-full object-contain md:max-h-[460px]"
                    />
                </div>
            )}

            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                        {shouldRenderLogo && (
                            <div className="h-10 w-10 overflow-hidden rounded-[8px] bg-white/[0.03] border border-white/10 flex items-center justify-center p-2">
                                <Image
                                    src={logoUrl as string}
                                    alt={`${title} logo`}
                                    width={40}
                                    height={40}
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                        )}
                        <h3
                            id={id}
                            className="!m-0 text-[22px] font-semibold leading-snug tracking-tight text-zinc-100 md:text-[24px]"
                        >
                            {slug ? (
                                <Link
                                    href={`/events/${slug}`}
                                    className="border-b border-transparent transition-colors hover:border-white/40 hover:text-white"
                                >
                                    {title}
                                </Link>
                            ) : (
                                title
                            )}
                        </h3>
                    </div>

                    <div className="mb-4 text-[13.5px] font-medium text-zinc-400">
                        {date}
                    </div>

                    {/* Vitals Section */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {location && (
                            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[12px] text-zinc-400">
                                <span className="text-[10px] opacity-50 uppercase tracking-wider font-bold mr-1">Loc</span>
                                {location}
                            </div>
                        )}
                        {tech && (
                            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[12px] text-zinc-400">
                                <span className="text-[10px] opacity-50 uppercase tracking-wider font-bold mr-1">Tech</span>
                                {tech}
                            </div>
                        )}
                        {experience && (
                            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[12px] text-zinc-400">
                                <span className="text-[10px] opacity-50 uppercase tracking-wider font-bold mr-1">Exp</span>
                                {experience}
                            </div>
                        )}
                    </div>

                    {/* Content Area (The Why) */}
                    <div className="prose prose-invert prose-zinc max-w-none
                        prose-p:mb-5 prose-p:text-[14px] prose-p:leading-[1.6] prose-p:text-[#B4B8C0]
                        prose-ul:my-5 prose-ul:text-[#B4B8C0] prose-li:text-[14px] prose-li:leading-[1.6]
                        prose-h4:mb-3 prose-h4:mt-6 prose-h4:text-[16px] prose-h4:font-medium prose-h4:text-zinc-100
                        [&_strong]:font-medium [&_strong]:text-zinc-200
                        prose-blockquote:my-6 prose-blockquote:border-l-[2px] prose-blockquote:border-white/10 prose-blockquote:pl-5 prose-blockquote:not-italic prose-blockquote:text-zinc-400"
                    >
                        {children}
                    </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-4 md:flex-col md:items-end">
                    {eventId ? (
                        <button
                            type="button"
                            onClick={() => {
                                void handleBookmark();
                            }}
                            disabled={isBusy}
                            aria-pressed={eventIsBookmarked}
                            className={`inline-flex items-center gap-2 rounded-[8px] px-6 py-2.5 text-[13px] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${eventIsBookmarked
                                ? 'border border-white/12 bg-white/[0.06] text-zinc-100 hover:bg-white/[0.08]'
                                : 'bg-zinc-100 text-zinc-950 hover:bg-white'
                                }`}
                        >
                            <BookmarkSimple
                                size={14}
                                weight={eventIsBookmarked ? 'fill' : 'bold'}
                            />
                            {eventIsBookmarked ? 'Bookmarked' : 'Bookmark event'}
                        </button>
                    ) : null}
                    <button
                        className="text-[13px] font-medium text-zinc-400 transition-colors hover:text-white"
                        onClick={() => {
                            const text = encodeURIComponent(`I'm planning to attend ${title}. Check out the 2026 Developer Circuit Guide!`);
                            window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                        }}
                    >
                        Share event
                    </button>
                </div>
            </div>
        </section>
    );
}
