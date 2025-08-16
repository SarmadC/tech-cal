'use client';

import { useState, useEffect } from 'react';
// 1. Import the new date utility functions
import { isEventLive, isEventPast, getTimeUntilEvent } from '@/utils/dateUtils';

interface CountdownTimerProps {
    start_time: string;
    end_time?: string | null;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLive: boolean;
    hasEnded: boolean;
}

export default function CountdownTimer({
    start_time,
    end_time,
    className = '',
    size = 'md'
}: CountdownTimerProps) {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isLive: false,
        hasEnded: false
    });

    useEffect(() => {
        // 2. The internal calculation logic is now replaced by calls to the date utilities
        const calculateTimeRemaining = () => {
            // Check status using the new utilities which correctly handle end_time
            const live = isEventLive(start_time, end_time);
            const past = isEventPast(start_time, end_time);

            if (live) {
                setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true, hasEnded: false });
                return;
            }

            if (past) {
                setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false, hasEnded: true });
                return;
            }

            // If the event is upcoming, use the countdown utility
            const timeUntil = getTimeUntilEvent(start_time);
            setTimeRemaining({
                ...timeUntil,
                isLive: false,
                hasEnded: false,
            });
        };

        // Calculate immediately
        calculateTimeRemaining();

        // Update every second
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [start_time, end_time]);

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return {
                    container: 'text-xs',
                    number: 'text-sm font-bold',
                    label: 'text-xs'
                };
            case 'lg':
                return {
                    container: 'text-base',
                    number: 'text-2xl font-bold',
                    label: 'text-sm'
                };
            default: // md
                return {
                    container: 'text-sm',
                    number: 'text-lg font-bold',
                    label: 'text-xs'
                };
        }
    };

    const sizeClasses = getSizeClasses();

    // Live indicator
    if (timeRemaining.isLive) {
        return (
            <div className={`inline-flex items-center space-x-2 ${className}`}>
                <div className="relative">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                </div>
                <span className={`font-semibold text-red-600 ${sizeClasses.container}`}>
                    LIVE NOW
                </span>
            </div>
        );
    }

    // Event ended
    if (timeRemaining.hasEnded) {
        return (
            <div className={`inline-flex items-center space-x-1 ${className}`}>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className={`text-gray-500 ${sizeClasses.container}`}>
                    Event Ended
                </span>
            </div>
        );
    }

    // Format time display based on how far away the event is
    const formatTimeDisplay = () => {
        const { days, hours, minutes, seconds } = timeRemaining;

        // If more than 7 days away, just show days
        if (days > 7) {
            return (
                <div className="flex items-center space-x-1">
                    <span className={`${sizeClasses.number} text-accent-primary`}>{days}</span>
                    <span className={`${sizeClasses.label} text-foreground-tertiary`}>
                        day{days !== 1 ? 's' : ''}
                    </span>
                </div>
            );
        }

        // If more than 1 day away, show days and hours
        if (days > 0) {
            return (
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                        <span className={`${sizeClasses.number} text-accent-primary`}>{days}</span>
                        <span className={`${sizeClasses.label} text-foreground-tertiary`}>d</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className={`${sizeClasses.number} text-accent-primary`}>{hours}</span>
                        <span className={`${sizeClasses.label} text-foreground-tertiary`}>h</span>
                    </div>
                </div>
            );
        }

        // If same day, show hours and minutes
        if (hours > 0) {
            return (
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                        <span className={`${sizeClasses.number} text-accent-primary`}>{hours}</span>
                        <span className={`${sizeClasses.label} text-foreground-tertiary`}>h</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className={`${sizeClasses.number} text-accent-primary`}>{minutes}</span>
                        <span className={`${sizeClasses.label} text-foreground-tertiary`}>m</span>
                    </div>
                </div>
            );
        }

        // If less than 1 hour, show minutes and seconds
        return (
            <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                    <span className={`${sizeClasses.number} text-red-600`}>{minutes}</span>
                    <span className={`${sizeClasses.label} text-foreground-tertiary`}>m</span>
                </div>
                <div className="flex items-center space-x-1">
                    <span className={`${sizeClasses.number} text-red-600`}>{seconds}</span>
                    <span className={`${sizeClasses.label} text-foreground-tertiary`}>s</span>
                </div>
            </div>
        );
    };

    return (
        <div className={`inline-flex items-center ${className}`}>
            {formatTimeDisplay()}
        </div>
    );
}

// Utility component for compact countdown in calendar grid
export function CompactCountdown({ start_time, end_time }: { start_time: string; end_time?: string | null }) {
    return (
        <CountdownTimer
            start_time={start_time}
            end_time={end_time}
            size="sm"
            className="bg-background-secondary/80 backdrop-blur-sm px-2 py-1 rounded-full"
        />
    );
}

// Utility component for event modal countdown
export function ModalCountdown({ start_time, end_time }: { start_time: string; end_time?: string | null }) {
    return (
        <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground-primary">Event starts in:</span>
                <CountdownTimer
                    start_time={start_time}
                    end_time={end_time}
                    size="lg"
                />
            </div>
        </div>
    );
}