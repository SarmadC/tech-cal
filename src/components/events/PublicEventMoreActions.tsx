'use client';

import { useEffect, useRef, useState } from 'react';
import { DotsThree } from '@phosphor-icons/react';
import ManagerJustificationModal, { prefetchManagerJustification } from '@/components/calendar/ManagerJustificationModal';
import { useAuth } from '@/contexts';

interface PublicEventMoreActionsProps {
    eventId: string;
}

export default function PublicEventMoreActions({ eventId }: PublicEventMoreActionsProps) {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showJustification, setShowJustification] = useState(false);
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
                className="flex w-full items-center justify-center gap-2 h-10 border border-border-subtle hover:border-border-default rounded-md text-[13px] font-medium text-foreground-secondary transition-colors"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
            >
                <DotsThree size={16} weight="bold" />
                More options
            </button>

            {isMenuOpen && (
                <div
                    role="menu"
                    className="absolute right-0 top-11 z-20 w-52 rounded-lg border border-border-subtle bg-background-main p-1.5 shadow-xl"
                >
                    <button
                        type="button"
                        className="w-full rounded-md px-2.5 py-2 text-left text-[13px] text-foreground-secondary hover:bg-background-secondary/70"
                        onClick={() => {
                            setShowJustification(true);
                            setIsMenuOpen(false);
                        }}
                    >
                        <span className="inline-flex items-center gap-2">
                            Convince My Manager
                        </span>
                    </button>
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
