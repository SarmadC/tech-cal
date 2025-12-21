'use client';

import { FC, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { X, Check, Clock } from '@phosphor-icons/react';
import { TrackedEventRecord } from '@/types';

interface PastEventAttendancePromptProps {
    /** Events pending attendance confirmation */
    pendingEvents: TrackedEventRecord[];
    /** Handler for marking event as attended */
    onAttended: (eventId: string) => Promise<void>;
    /** Handler for marking event as not attended */
    onNotAttended: (eventId: string) => Promise<void>;
    /** Handler for snoozing (ask later) */
    onSnooze: (eventId: string) => void;
}

/**
 * Modal prompt for confirming attendance of past bookmarked events.
 * Shows one event at a time from the pending list.
 */
const PastEventAttendancePrompt: FC<PastEventAttendancePromptProps> = ({
    pendingEvents,
    onAttended,
    onNotAttended,
    onSnooze
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Get current event to display (memoized)
    const currentEvent = useMemo(() => pendingEvents[currentIndex], [pendingEvents, currentIndex]);
    const event = currentEvent?.event ?? null;
    const currentEventId = currentEvent?.eventId ?? '';

    // Memoize event date calculation
    const eventDate = useMemo(() => {
        if (!event) return null;
        return event.endTime
            ? new Date(event.endTime)
            : new Date(event.startTime);
    }, [event]);

    // All hooks must be called before any conditional returns!
    const handleAttended = useCallback(async () => {
        if (isProcessing || !currentEventId) return;
        setIsProcessing(true);
        try {
            await onAttended(currentEventId);
            // Move to next event or close if none left
            if (currentIndex < pendingEvents.length - 1) {
                setCurrentIndex((prev) => prev + 1);
            }
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, onAttended, currentEventId, currentIndex, pendingEvents.length]);

    const handleNotAttended = useCallback(async () => {
        if (isProcessing || !currentEventId) return;
        setIsProcessing(true);
        try {
            await onNotAttended(currentEventId);
            // Move to next event or close if none left
            if (currentIndex < pendingEvents.length - 1) {
                setCurrentIndex((prev) => prev + 1);
            }
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, onNotAttended, currentEventId, currentIndex, pendingEvents.length]);

    const handleSnooze = useCallback(() => {
        if (!currentEventId) return;
        onSnooze(currentEventId);
        // Move to next event or close if none left
        if (currentIndex < pendingEvents.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    }, [onSnooze, currentEventId, currentIndex, pendingEvents.length]);

    // Now we can have conditional returns after all hooks are called
    // SSR check
    if (typeof window === 'undefined') return null;

    // If no pending events or no valid event data, don't render anything
    if (!currentEvent || !event || !eventDate) {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 animate-in fade-in-0 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-prompt-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
                onClick={handleSnooze}
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 ease-out">
                <div className="bg-white dark:bg-[#08090a] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#08090a]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 id="attendance-prompt-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Did you attend?
                                </h2>
                            </div>
                            <button
                                onClick={handleSnooze}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                aria-label="Ask me later"
                            >
                                <X className="w-5 h-5" weight="bold" />
                            </button>
                        </div>
                        {pendingEvents.length > 1 && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 font-medium">
                                {currentIndex + 1} of {pendingEvents.length} events
                            </p>
                        )}
                    </div>

                    {/* Event Info */}
                    <div className="px-6 py-5">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
                            {event.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Clock className="w-4 h-4 text-gray-600 dark:text-gray-300" weight="duotone" />
                            <span>{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        {event.organizer && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 font-medium">
                                by {event.organizer}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 bg-white dark:bg-[#0a0b0c] border-t border-gray-200 dark:border-white/10">
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Primary CTA - "I Attended" */}
                            <button
                                onClick={handleAttended}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check className="w-5 h-5" weight="bold" />
                                {isProcessing ? 'Saving...' : 'I Attended'}
                            </button>
                            {/* Secondary CTA - "I Didn't Attend" - Add border for contrast */}
                            <button
                                onClick={handleNotAttended}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-[#08090a] border-2 border-gray-300 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X className="w-5 h-5" weight="bold" />
                                {"I Didn't Attend"}
                            </button>
                        </div>
                        <button
                            onClick={handleSnooze}
                            className="w-full mt-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors font-medium"
                        >
                            Ask me later
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PastEventAttendancePrompt;
