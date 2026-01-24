'use client';

import { FC, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Event, EventType } from '@/types';
import Loading from '@/components/Loading';

// Dynamically import the panel to keep bundle size optimized
const EventDetailPanel = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { loading: () => <Loading /> }
);

interface EventDetailSidebarProps {
    event: Event | null;
    onClose: () => void;
    categories: EventType[];
}

/**
 * A unified wrapper for the Desktop Event Detail Sidebar.
 * Handles:
 * 1. Entry/Exit animations (slide-in/out + fade backdrop)
 * 2. Unmounting logic (waits for animation to finish)
 * 3. Layout positioning (fixed right, full height)
 * 4. Backdrop with blur
 */
export const EventDetailSidebar: FC<EventDetailSidebarProps> = ({ event, onClose, categories }) => {
    // We keep a local reference to the event to render it while it's animating out
    const [renderEvent, setRenderEvent] = useState<Event | null>(event);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (event) {
            setRenderEvent(event);
            // Small delay to ensure DOM is ready before transitioning opacity/transform
            // Using double RAF to ensure paint has occurred
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });
            });
        } else {
            // Start exit animation
            setIsVisible(false);

            // Wait for animation to finish before removing from DOM
            const timer = setTimeout(() => {
                setRenderEvent(null);
            }, 300); // 300ms matches duration-300 class

            return () => clearTimeout(timer);
        }
    }, [event]);

    // Don't render anything if we have no event to show
    if (!renderEvent) return null;

    return (
        <div
            className={`fixed inset-0 z-[140] flex justify-end overflow-hidden pointer-events-none`}
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out pointer-events-auto ${isVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Container */}
            <div
                className={`relative h-full z-[150] shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto ${isVisible ? 'translate-x-0' : 'translate-x-full'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <EventDetailPanel
                    event={renderEvent}
                    onClose={onClose}
                    categories={categories}
                    variant="sidebar"
                />
            </div>
        </div>
    );
};

export default EventDetailSidebar;
