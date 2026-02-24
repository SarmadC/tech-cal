'use client';

import { useEffect, useRef, useState } from 'react';
import { DotsThree, Code } from '@phosphor-icons/react';
import ManagerJustificationModal, { prefetchManagerJustification } from '@/components/calendar/ManagerJustificationModal';
import { useAuth } from '@/contexts';
import { useState as useReactState } from 'react';
import { buildEmbedIframeCode } from '@/components/social/EmbedButton';

interface PublicEventMoreActionsProps {
    eventId: string;
    slug: string;
    title: string;
}

export default function PublicEventMoreActions({ eventId, slug, title }: PublicEventMoreActionsProps) {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showJustification, setShowJustification] = useState(false);
    const [showEmbed, setShowEmbed] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!user) return;

        const prefetchTimer = window.setTimeout(() => {
            void prefetchManagerJustification(eventId);
        }, 300);

        return () => {
            window.clearTimeout(prefetchTimer);
        };
    }, [eventId, user]);

    useEffect(() => {
        if (!user || !isMenuOpen) return;

        void prefetchManagerJustification(eventId);

        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target;
            if (menuRef.current && target instanceof Node && !menuRef.current.contains(target)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [eventId, isMenuOpen, user]);

    if (!user) {
        return null;
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                onMouseEnter={() => {
                    void prefetchManagerJustification(eventId);
                }}
                onFocus={() => {
                    void prefetchManagerJustification(eventId);
                }}
                className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-white/[0.05] text-[#888888] hover:text-white transition-all"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                title="More options"
            >
                <DotsThree size={20} weight="bold" />
            </button>

            {isMenuOpen && (
                <div
                    role="menu"
                    className="absolute right-0 top-11 z-20 w-56 rounded-lg border border-white/[0.08] bg-[#1A1A1A] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
                >
                    <button
                        type="button"
                        className="w-full rounded-md px-3 py-2 text-left text-[13px] text-[#888888] hover:text-white hover:bg-white/[0.05] transition-colors"
                        onClick={() => {
                            setShowJustification(true);
                            setIsMenuOpen(false);
                        }}
                    >
                        Convince My Manager
                    </button>
                    <button
                        type="button"
                        className="w-full rounded-md px-3 py-2 text-left text-[13px] text-[#888888] hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-2"
                        onClick={() => {
                            setShowEmbed(true);
                            setIsMenuOpen(false);
                        }}
                    >
                        <Code size={14} />
                        Embed this event
                    </button>
                </div>
            )}

            {showEmbed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-xl border border-white/[0.08] bg-[#1A1A1A] p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">Embed Code</h3>
                            <button
                                onClick={() => setShowEmbed(false)}
                                className="text-[#888888] hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="relative">
                            <pre className="text-[12px] text-[#888888] bg-black/40 border border-white/[0.05] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed font-mono">
                                {buildEmbedIframeCode(slug, title)}
                            </pre>
                            <button
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(buildEmbedIframeCode(slug, title));
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    } catch (err) { }
                                }}
                                className="absolute top-3 right-3 text-[11px] px-2.5 py-1 rounded bg-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>

                        <p className="mt-4 text-[12px] text-[#888888]">
                            Copy the code above to embed this event card on your own website.
                        </p>
                    </div>
                </div>
            )}

            <ManagerJustificationModal
                eventId={eventId}
                isOpen={showJustification}
                onClose={() => setShowJustification(false)}
            />
        </div>
    );
}
