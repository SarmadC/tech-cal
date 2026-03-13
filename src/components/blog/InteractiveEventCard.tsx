"use client";

import React, { useState } from 'react';

type Role = {
    id: string;
    label: string;
    keywords: string[];
};

type InteractiveEventCardProps = {
    title: string;
    date?: string;
    location?: string;
    focus?: string;
    tech?: string;
    experience?: string;
    logoUrl?: string;
    imageUrl?: string;
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
    activeRole,
    roles,
    children
}: InteractiveEventCardProps) {
    const [isAdded, setIsAdded] = useState(false);

    const isTbd = date?.toLowerCase().includes('tba') || date?.toLowerCase().includes('tbd');

    // Filtering logic
    const isDimmed = React.useMemo(() => {
        if (!activeRole || !roles) return false;
        const currentRole = roles.find(r => r.id === activeRole);
        if (!currentRole) return false;

        const textToSearch = `${title} ${focus || ''} ${children?.toString() || ''}`.toLowerCase();
        const hasMatch = currentRole.keywords.some(keyword => textToSearch.includes(keyword.toLowerCase()));
        return !hasMatch;
    }, [activeRole, roles, title, focus, children]);

    return (
        <section className={`relative my-16 border-t border-white/10 pt-10 transition-all duration-300 ${isDimmed ? 'opacity-35' : ''}`}>
            {imageUrl && (
                <div className="mb-8 overflow-hidden rounded-[16px]">
                    <img
                        src={imageUrl}
                        alt={`${title} banner`}
                        className="aspect-[21/9] w-full object-cover md:aspect-[24/7]"
                    />
                </div>
            )}

            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                        {logoUrl && !imageUrl && (
                            <div className="h-10 w-10 overflow-hidden rounded-[8px] bg-white/[0.03] border border-white/10 flex items-center justify-center p-2">
                                <img src={logoUrl} alt={`${title} logo`} className="max-h-full max-w-full object-contain" />
                            </div>
                        )}
                        <h3 className="!m-0 text-[22px] font-semibold leading-snug tracking-tight text-zinc-100 md:text-[24px]">
                            {title}
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
                    <button
                        onClick={() => setIsAdded(!isAdded)}
                        className={`inline-flex items-center gap-2 rounded-[8px] px-6 py-2.5 text-[13px] font-semibold transition-all duration-200 ${isAdded
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                            : 'bg-zinc-100 text-zinc-950 hover:bg-white'
                            }`}
                    >
                        {isAdded ? (
                            <>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                Following
                            </>
                        ) : (
                            <>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                Add to Calendar
                            </>
                        )}
                    </button>
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
