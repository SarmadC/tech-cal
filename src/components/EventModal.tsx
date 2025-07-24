// src/components/EventModal.tsx (Simplified and Fixed)

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { formatToUTC } from '@/lib/calendarUtils';
import { formatInTimeZone } from 'date-fns-tz';
import {
    X, Check, Copy, AlertTriangle, Lock, RefreshCw, Link as LinkIcon,
    Calendar, MapPin, Star, UserCheck
} from 'lucide-react';
import { ModalCountdown } from './CountdownTimer';
import { ModalHappeningNow, hasHappeningNowStatus } from './HappeningNowIndicator';

type Event = {
    id: string;
    title: string | null;
    description: string | null;
    start_time: string;
    end_time: string | null;
    organizer: string | null;
    location: string | null;
    status: string | null;
    source_url: string | null;
    livestream_url: string | null;
    event_type_id?: string | null;
    color?: string;
};

interface EventModalProps {
    event: Event;
    onClose: () => void;
    onEventTracked?: () => void;
}

type EventStatus = 'bookmarked' | 'attending' | 'attended' | 'cancelled';

function EventTime({ timeUtc, userTimezone, format }: {
    timeUtc: string | null;
    userTimezone: string;
    format: string;
}) {
    if (!timeUtc) {
        return <span className="text-foreground-tertiary">Not specified</span>;
    }

    try {
        return <span>{formatInTimeZone(timeUtc, userTimezone, format)}</span>;
    } catch (error) {
        console.error("Error formatting date:", error);
        return <span>{new Date(timeUtc).toLocaleString()}</span>;
    }
}

export default function EventModal({ event, onClose, onEventTracked }: EventModalProps) {
    const { user, profile } = useAuth();

    const [trackingStatus, setTrackingStatus] = useState<{
        isTracked: boolean;
        status?: EventStatus;
    }>({ isTracked: false });

    const [loading, setLoading] = useState(false);
    const [showCopiedBanner, setShowCopiedBanner] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    const userTimezone = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const eventTitle = useMemo(() => event.title || 'Untitled Event', [event.title]);
    const eventDescription = useMemo(() => event.description || 'No description available.', [event.description]);
    const eventOrganizer = useMemo(() => event.organizer || 'Unknown Organizer', [event.organizer]);
    const eventLocation = useMemo(() => event.location || 'Location TBD', [event.location]);
    const eventStatus = useMemo(() => event.status || 'unknown', [event.status]);
    const eventSourceUrl = useMemo(() => event.source_url || '#', [event.source_url]);

    const hasEnded = useMemo(() => new Date() > new Date(event.end_time || event.start_time), [event.end_time, event.start_time]);
    const hasHappeningNow = useMemo(() => hasHappeningNowStatus(event.start_time, event.end_time, eventTitle), [event.start_time, event.end_time, eventTitle]);

    // Check tracking status on component mount
    useEffect(() => {
        const checkTrackingStatus = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('user_events')
                    .select('status')
                    .eq('user_id', user.id)
                    .eq('event_id', event.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                setTrackingStatus({
                    isTracked: !!data,
                    status: data?.status as EventStatus
                });
            } catch (err) {
                console.error('Error checking tracking status:', err);
            }
        };

        checkTrackingStatus();
    }, [user, event.id]);

    const handleTrackEvent = async (status: EventStatus = 'bookmarked') => {
        if (!user) {
            setError('Please sign in to track events.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Check if already tracked
            const { data: existing } = await supabase
                .from('user_events')
                .select('id, status')
                .eq('user_id', user.id)
                .eq('event_id', event.id)
                .single();

            if (existing) {

            const { error } = await supabase
                .from('user_events')
                .update({
                    status,
                    notes
                })
                .eq('id', existing.id);

            if (error) throw error;
        } else {
            // Create new tracking record
            const { error } = await supabase
                .from('user_events')
                .insert({
                    user_id: user.id,
                    event_id: event.id,
                    status,
                    notes
                });

            if (error) throw error;
        }

            setTrackingStatus({ isTracked: true, status });
            onEventTracked?.();
        } catch (err) {
            console.error('Error tracking event:', err);
            setError((err as Error).message || 'Failed to track event');
        } finally {
            setLoading(false);
        }
    };

    const handleUntrackEvent = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('user_events')
                .delete()
                .eq('user_id', user.id)
                .eq('event_id', event.id);

            if (error) throw error;

            setTrackingStatus({ isTracked: false });
            onEventTracked?.();
        } catch (err) {
            console.error('Error untracking event:', err);
            setError((err as Error).message || 'Failed to untrack event');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/event/${event.id}`;
        navigator.clipboard.writeText(link);
        setShowCopiedBanner(true);
        setTimeout(() => setShowCopiedBanner(false), 2500);
    };

    const googleCalendarLink = useMemo(() => {
        const utcStartTime = formatToUTC(event.start_time);
        const utcEndTime = formatToUTC(event.end_time || new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000));
        const url = new URL('https://www.google.com/calendar/render');
        url.searchParams.set('action', 'TEMPLATE');
        url.searchParams.set('text', eventTitle);
        url.searchParams.set('dates', `${utcStartTime}/${utcEndTime}`);
        url.searchParams.set('details', eventDescription);
        url.searchParams.set('location', eventLocation);
        return url.href;
    }, [event.start_time, event.end_time, eventTitle, eventDescription, eventLocation]);

    const handleIcsDownload = () => {
        const utcStartTime = formatToUTC(event.start_time);
        const utcEndTime = formatToUTC(event.end_time || new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000));
        const icsContent = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KureCal//EN', 'BEGIN:VEVENT',
            `UID:${event.id}@kurecal.app`, `DTSTAMP:${formatToUTC(new Date())}`, `DTSTART:${utcStartTime}`, `DTEND:${utcEndTime}`,
            `SUMMARY:${eventTitle}`, `DESCRIPTION:${eventDescription}`, `LOCATION:${eventLocation}`,
            'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n');
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'text-green-600 dark:text-green-400';
            case 'tentative': return 'text-yellow-600 dark:text-yellow-400';
            case 'cancelled': return 'text-red-600 dark:text-red-400';
            default: return 'text-gray-500 dark:text-gray-400';
        }
    };

    const statusOptions = [
        { value: 'bookmarked' as EventStatus, label: 'Bookmark', icon: <Star className="w-4 h-4" /> },
        { value: 'attending' as EventStatus, label: 'Attending', icon: <UserCheck className="w-4 h-4" /> },
        { value: 'attended' as EventStatus, label: 'Attended', icon: <Check className="w-4 h-4" /> },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-background-secondary rounded-2xl shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    aria-label="Close modal"
                    className="absolute top-4 right-4 z-20 w-10 h-10 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                >
                    <X className="w-5 h-5 text-foreground-secondary" />
                </button>

                {showCopiedBanner && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-30 transition-opacity duration-300">
                        Link copied to clipboard!
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    <header className="pr-12">
                        <h1 className="text-3xl font-bold text-foreground-primary">
                            {eventTitle}
                        </h1>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-foreground-secondary">
                            <span className={`font-medium capitalize ${getStatusColor(eventStatus)}`}>
                                {eventStatus}
                            </span>
                            <span>•</span>
                            <span>Organized by {eventOrganizer}</span>
                        </div>
                    </header>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-300 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {user && (
                        <div>
                            {trackingStatus.isTracked ? (
                                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        <span className="text-green-800 dark:text-green-300 font-medium">
                                            Event tracked as {trackingStatus.status}!
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleUntrackEvent}
                                        disabled={loading}
                                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 text-sm font-medium disabled:opacity-50 transition-colors"
                                    >
                                        {loading ? 'Removing...' : 'Remove'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Notes input */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground-primary mb-2">
                                            Notes (optional)
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add any notes about this event..."
                                            rows={2}
                                            className="w-full px-3 py-2 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary text-sm"
                                        />
                                    </div>

                                    {/* Track buttons */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {statusOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleTrackEvent(option.value)}
                                                disabled={loading}
                                                className="flex flex-col items-center space-y-2 p-3 bg-background-main hover:bg-accent-primary/10 border border-border-color hover:border-accent-primary/30 rounded-lg transition-all disabled:opacity-50"
                                            >
                                                {loading ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin text-accent-primary" />
                                                ) : (
                                                    option.icon
                                                )}
                                                <span className="text-xs font-medium text-foreground-primary">
                                                    {option.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!user && (
                        <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <Lock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                        Sign in to track events
                                    </p>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                                        Create an account to save events and get personalized recommendations.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col items-center">
                        {hasHappeningNow ? (
                            <ModalHappeningNow start_time={event.start_time} end_time={event.end_time} title={eventTitle} event_type_id={event.event_type_id || undefined} />
                        ) : !hasEnded && (
                            <ModalCountdown start_time={event.start_time} end_time={event.end_time} />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="flex items-start space-x-4">
                            <Calendar className="w-5 h-5 mt-0.5 text-accent-primary flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-foreground-primary">Date & Time</h3>
                                <p className="text-foreground-secondary">
                                    <EventTime timeUtc={event.start_time} userTimezone={userTimezone} format="EEEE, MMM d, yyyy" />
                                    <br />
                                    <EventTime timeUtc={event.start_time} userTimezone={userTimezone} format="h:mm a" />
                                    {event.end_time && (
                                        <>
                                            {' - '}
                                            <EventTime timeUtc={event.end_time} userTimezone={userTimezone} format="h:mm a zzz" />
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            <MapPin className="w-5 h-5 mt-0.5 text-accent-primary flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-foreground-primary">Location</h3>
                                <p className="text-foreground-secondary">{eventLocation}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-foreground-primary mb-2">About this event</h3>
                        <p className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-wrap">
                            {eventDescription}
                        </p>
                    </div>
                </div>

                <footer className="p-6 border-t border-border-color bg-background-tertiary/50 backdrop-blur-lg rounded-b-2xl sticky bottom-0">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <a href={eventSourceUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-accent-primary hover:bg-accent-primary-hover text-white font-medium py-3 px-6 rounded-lg text-center transition-colors flex items-center justify-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            View Event Source
                        </a>
                        <button onClick={handleCopyLink} className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-border-color dark:border-border-color-strong text-foreground-primary font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                            <Copy className="w-4 h-4" />
                            Copy Link
                        </button>
                    </div>

                    <div className="border-t border-border-color mt-4 pt-4">
                        <p className="text-xs font-medium text-foreground-tertiary mb-3 uppercase tracking-wider">Add to Calendar</p>
                        <div className="flex flex-wrap gap-2">
                            <a href={googleCalendarLink} target="_blank" rel="noopener noreferrer" className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-foreground-primary font-medium py-2 px-4 rounded-lg text-sm transition-colors">
                                Google
                            </a>
                            <button onClick={handleIcsDownload} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-foreground-primary font-medium py-2 px-4 rounded-lg text-sm transition-colors">
                                Download .ics
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}