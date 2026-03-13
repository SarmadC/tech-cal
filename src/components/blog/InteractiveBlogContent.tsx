"use client";

import React, { useState } from 'react';
import parse, { domToReact } from 'html-react-parser';
import type { Element, HTMLReactParserOptions } from 'html-react-parser';
import { InteractiveEventCard } from './InteractiveEventCard';
import { GlobalEventMap } from './GlobalEventMap';

export type EventSummary = {
    title: string;
    date: string;
    location: string;
};

export type RoleFilter = {
    id: string;
    label: string;
    keywords: string[];
};

type Props = {
    html: string;
    eventsSummary: EventSummary[];
    availableRoles?: RoleFilter[];
    presentationMode: 'editorial' | 'event_guide';
};

function QuickTip({ type, children }: { type: string; children: React.ReactNode }) {
    const isProMove = type === 'pro-move';
    return (
        <aside className={`my-10 overflow-hidden rounded-[16px] border ${isProMove
            ? 'border-emerald-500/20 bg-emerald-500/[0.02]'
            : 'border-white/10 bg-white/[0.02]'
            }`}>
            <div className="flex items-start gap-4 p-6">
                <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-tighter ${isProMove
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-400'
                    }`}>
                    {isProMove ? 'Pro' : 'Tip'}
                </div>
                <div className="text-[14px] leading-relaxed text-zinc-300">
                    <span className="font-semibold text-zinc-100">{isProMove ? 'Pro Move: ' : 'Quick Tip: '}</span>
                    {children}
                </div>
            </div>
        </aside>
    );
}

export function InteractiveBlogContent({
    html,
    eventsSummary,
    availableRoles,
    presentationMode,
}: Props) {
    const [activeRole, setActiveRole] = useState<string | null>(null);

    const roles = availableRoles || [];
    const showRoleFilter = presentationMode === 'event_guide' && roles.length > 0;

    const options: HTMLReactParserOptions = {
        replace: (domNode) => {
            if (domNode.type === 'tag' && domNode.name === 'div' && domNode.attribs?.['data-event-card']) {
                return (
                    <InteractiveEventCard
                        title={domNode.attribs['data-title'] || ''}
                        date={domNode.attribs['data-date'] || ''}
                        location={domNode.attribs['data-location'] || ''}
                        focus={domNode.attribs['data-focus'] || ''}
                        tech={domNode.attribs['data-tech']}
                        experience={domNode.attribs['data-experience']}
                        logoUrl={domNode.attribs['data-logo']}
                        imageUrl={domNode.attribs['data-image']}
                        activeRole={activeRole}
                        roles={roles}
                    >
                        {domToReact(domNode.children as Element[], options)}
                    </InteractiveEventCard>
                );
            }

            if (domNode.type === 'tag' && domNode.name === 'aside' && domNode.attribs?.['data-callout']) {
                return (
                    <QuickTip type={domNode.attribs['data-callout']}>
                        {domToReact(domNode.children as Element[], options)}
                    </QuickTip>
                );
            }

            if (domNode.type === 'tag' && domNode.name === 'div' && domNode.attribs?.['data-global-map']) {
                return <GlobalEventMap events={eventsSummary} />;
            }
        },
    };

    return (
        <div className="relative">
            {showRoleFilter && (
                <section className="mb-12 border-y border-white/10 py-5">
                    <div className="mb-3">
                        <p className="text-sm font-medium text-zinc-300">
                            Highlight for role
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveRole(null)}
                            className={`rounded-full px-4 py-2 text-[13px] transition-colors ${activeRole === null
                                ? 'bg-zinc-100 font-medium text-zinc-950'
                                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                                }`}
                        >
                            All Roles
                        </button>
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => setActiveRole(role.id)}
                                className={`rounded-full px-4 py-2 text-[13px] transition-colors ${activeRole === role.id
                                    ? 'border border-white/15 bg-white/[0.05] text-zinc-100'
                                    : 'border border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                                    }`}
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <div
                data-blog-content
                className="prose prose-invert prose-zinc max-w-none
                prose-headings:font-semibold prose-headings:text-[#F5F7FA] prose-headings:tracking-tight
                prose-h1:text-3xl prose-h2:mb-5 prose-h2:mt-16 prose-h2:text-[1.9rem] prose-h2:leading-tight md:prose-h2:mt-20 md:prose-h2:text-[2.1rem]
                prose-h3:mb-4 prose-h3:mt-10 prose-h3:text-[1.35rem] prose-h3:leading-snug md:prose-h3:mt-12 md:prose-h3:text-[1.5rem]
                prose-p:my-6 prose-p:max-w-[68ch] prose-p:text-[1.02rem] prose-p:leading-8 prose-p:text-[#CBD2DA]
                prose-a:border-b prose-a:border-white/20 prose-a:font-medium prose-a:text-[#F5F7FA] prose-a:no-underline hover:prose-a:border-white/50 hover:prose-a:text-white
                prose-strong:font-semibold prose-strong:text-[#F5F7FA]
                prose-code:rounded prose-code:border prose-code:border-white/10 prose-code:bg-white/[0.04] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:text-[#F5F7FA]
                prose-pre:rounded-[16px] prose-pre:border prose-pre:border-white/10 prose-pre:bg-[#121315] prose-pre:shadow-sm
                prose-blockquote:my-10 prose-blockquote:rounded-r-[16px] prose-blockquote:border-l-[3px] prose-blockquote:border-emerald-400/50 prose-blockquote:bg-white/[0.02] prose-blockquote:px-6 prose-blockquote:py-3 prose-blockquote:text-[#AAB3BD]
                prose-ul:text-[#CBD2DA] prose-ol:text-[#CBD2DA] prose-li:my-2 prose-li:max-w-[66ch] prose-li:text-[1rem] prose-li:leading-8 prose-li:marker:text-zinc-600
                prose-img:rounded-[18px] prose-img:border prose-img:border-white/10 prose-img:shadow-sm
                [&_table]:my-10 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_table]:text-[14px]
                [&_col:first-child]:!w-[200px] [&_col:first-child]:!min-w-[200px] [&_col:first-child]:!max-w-[200px]
                [&_thead]:border-b [&_thead]:border-white/10
                [&_th]:border-0 [&_th]:bg-transparent [&_th]:px-4 [&_th]:py-4 [&_th]:text-left [&_th]:text-[12px] [&_th]:font-semibold [&_th]:tracking-normal [&_th]:text-[#8A8F98]
                [&_td]:border-b [&_td]:border-white/[0.04] [&_td]:bg-transparent [&_td]:px-4 [&_td]:py-4 [&_td]:align-top [&_td]:text-[#EDEDEF]
                [&_tr]:border-b [&_tr]:border-white/[0.04] [&_tr:hover]:bg-white/[0.01]
                [&_iframe]:my-10 [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-[16px] [&_iframe]:ring-1 [&_iframe]:ring-white/10 [&_iframe]:shadow-sm"
            >
                {parse(html, options)}
            </div>
        </div>
    );
}
