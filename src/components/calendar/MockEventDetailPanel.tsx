'use client';

import { FC, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowSquareOutIcon,
    BookmarkSimple,
    CheckIcon,
    DotsThreeVerticalIcon,
    DownloadSimpleIcon,
    ShareNetworkIcon,
    UserCheckIcon,
    XIcon
} from '@phosphor-icons/react';

import { mockEvent, mockEventCategories } from '@/mocks/mockEvent';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { Event, EventType } from '@/types';
import { generateEventSlug } from '@/utils/slugUtils';
import AdaptiveTimeline from './AdaptiveTimeline';
import EventInfo from './EventInfo';
import TrackAgendaView, { groupAgendaByTrack } from './TrackAgendaView';
import { useSnackbar } from '@/contexts/SnackbarContext';

type AttendanceState = 'none' | 'attending' | 'attended';

interface MockEventDetailPanelProps {
    isOpen: boolean;
    onClose: () => void;
    event?: Event;
    categories?: EventType[];
}

const MockEventDetailPanel: FC<MockEventDetailPanelProps> = ({
    isOpen,
    onClose,
    event = mockEvent,
    categories = mockEventCategories
}) => {
    const theme = useTimelineTheme();
    const { showSuccess, showInfo } = useSnackbar();
    const [displayEvent, setDisplayEvent] = useState<Event>(event);
    const [agendaView, setAgendaView] = useState<'timeline' | 'tracks'>('timeline');
    const [isLoading, setIsLoading] = useState(true);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [attendance, setAttendance] = useState<AttendanceState>('none');
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [actionMessage, setActionMessage] = useState<string>('');
    const moreMenuRef = useRef<HTMLDivElement>(null);

    const category = categories.find(c => c.id === displayEvent.eventTypeId) || displayEvent.category;
    const trackGroups = useMemo(() => groupAgendaByTrack(displayEvent.agenda || []), [displayEvent.agenda]);
    const hasTrackAgenda = trackGroups.length > 0;

    useEffect(() => {
        setDisplayEvent(event);
        setAgendaView('timeline');
        setIsBookmarked(false);
        setAttendance('none');
    }, [event]);

    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 450);
        return () => clearTimeout(timer);
    }, [isOpen, displayEvent]);

    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!showMoreMenu) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
                setShowMoreMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMoreMenu]);

    const handleActionNotice = (message: string) => {
        setActionMessage(message);
        const timeout = setTimeout(() => setActionMessage(''), 2500);
        return () => clearTimeout(timeout);
    };

    const handleShare = async () => {
        const shareUrl = displayEvent.sourceUrl || `/events/${generateEventSlug(displayEvent.title, displayEvent.id)}`;
        const payload = {
            title: displayEvent.title,
            text: displayEvent.description,
            url: shareUrl
        };

        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share(payload);
                handleActionNotice('Shared (mock)');
                return;
            }
        } catch {
            // noop, fallback to clipboard
        }

        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
                handleActionNotice('Link copied (mock)');
                return;
            }
        } catch {
            // ignore clipboard failures
        }

        handleActionNotice('Share simulated');
    };

    const handleIcsDownload = () => {
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//MockEventDetailPanel//EN',
            'BEGIN:VEVENT',
            `UID:${displayEvent.id}`,
            `DTSTAMP:${displayEvent.startTime.replace(/[-:]/g, '').split('.')[0]}`,
            `DTSTART:${displayEvent.startTime.replace(/[-:]/g, '').split('.')[0]}`,
            displayEvent.endTime ? `DTEND:${displayEvent.endTime.replace(/[-:]/g, '').split('.')[0]}` : '',
            `SUMMARY:${displayEvent.title}`,
            `DESCRIPTION:${displayEvent.description}`,
            `LOCATION:${displayEvent.location}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ]
            .filter(Boolean)
            .join('\r\n');

        const blob = new Blob([ics], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${generateEventSlug(displayEvent.title, displayEvent.id)}.ics`;
        link.click();
        URL.revokeObjectURL(url);
        handleActionNotice('.ics download (mock)');
    };

    const toggleBookmark = () => {
        const wasBookmarked = isBookmarked;
        setIsBookmarked(prev => !prev);

        if (wasBookmarked) {
            showInfo(`Removed “${displayEvent.title}” from bookmarks (demo only).`, 3500);
        } else {
            showSuccess(`Saved “${displayEvent.title}” to bookmarks (demo only).`, 4000);
        }
    };

    const cycleAttendance = () => {
        setAttendance(prev => {
            if (prev === 'none') {
                handleActionNotice('Marked attending (mock)');
                return 'attending';
            }
            if (prev === 'attending') {
                handleActionNotice('Marked attended (mock)');
                return 'attended';
            }
            handleActionNotice('Attendance cleared (mock)');
            return 'none';
        });
    };

    const containerClasses =
        'h-full max-h-[90vh] event-detail-glass-sidebar border-l border-white/20 dark:border-white/10 shadow-2xl p-6 flex flex-col relative';

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                aria-label="Close event details overlay"
                onClick={onClose}
            />

            <div className="relative h-full w-full max-w-xl overflow-hidden">
                <div
                    className={containerClasses}
                    style={{
                        background: theme.isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px) saturate(120%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(120%)',
                        border: theme.isDark
                            ? '1px solid rgba(255, 255, 255, 0.2)'
                            : '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-6 p-2 rounded-full bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 text-gray-600 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 z-10"
                        aria-label="Close event details"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>

                    <div className="flex-1 space-y-6 overflow-y-auto pr-2 -mr-2">
                        <div className="flex items-start justify-between">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">{displayEvent.title}</h3>
                        </div>

                        <EventInfo event={displayEvent} category={category} />

                        <div className="mt-6 pt-6 border-t border-white/20 dark:border-white/10">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <p className="text-xs font-semibold tracking-widest text-gray-500 dark:text-gray-400 uppercase">
                                        Agenda
                                    </p>
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {agendaView === 'tracks' ? 'Track View' : 'Timeline View'}
                                    </h4>
                                </div>
                                {hasTrackAgenda && (
                                    <div className="inline-flex items-center gap-1 rounded-full border border-white/30 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur px-1 py-1">
                                        <button
                                            type="button"
                                            onClick={() => setAgendaView('timeline')}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                                                agendaView === 'timeline'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                            }`}
                                            aria-pressed={agendaView === 'timeline'}
                                        >
                                            Timeline
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAgendaView('tracks')}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                                                agendaView === 'tracks'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                            }`}
                                            aria-pressed={agendaView === 'tracks'}
                                        >
                                            Tracks
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isLoading ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-32 bg-white/10 dark:bg-black/10 rounded backdrop-blur-sm"></div>
                                        <div className="h-3 w-48 bg-white/5 dark:bg-black/5 rounded backdrop-blur-sm"></div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="h-20 bg-white/10 dark:bg-black/10 rounded backdrop-blur-sm"></div>
                                        <div className="h-20 bg-white/8 dark:bg-black/8 rounded backdrop-blur-sm"></div>
                                        <div className="h-20 bg-white/5 dark:bg-black/5 rounded backdrop-blur-sm"></div>
                                    </div>
                                </div>
                            ) : displayEvent.agenda && displayEvent.agenda.length > 0 ? (
                                agendaView === 'tracks' && hasTrackAgenda ? (
                                    <TrackAgendaView tracks={trackGroups} timezone={displayEvent.timezone} />
                                ) : (
                                    <AdaptiveTimeline event={displayEvent} />
                                )
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/20 dark:border-white/10">
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleBookmark}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 backdrop-blur-sm ${
                                        isBookmarked
                                            ? 'bg-yellow-500/20 dark:bg-yellow-500/20 light:bg-yellow-500/15 hover:bg-yellow-500/30 dark:hover:bg-yellow-500/30 light:hover:bg-yellow-500/20 border border-yellow-500/40 dark:border-yellow-500/40 light:border-yellow-500/30 text-yellow-600 dark:text-yellow-400 light:text-yellow-700'
                                            : 'bg-gray-900/90 hover:bg-gray-800/90 text-white dark:bg-white/90 dark:hover:bg-white/100 dark:text-gray-900 border border-white/20 dark:border-white/10'
                                    } shadow-sm hover:shadow-md`}
                                >
                                    <BookmarkSimple className="w-4 h-4" weight={isBookmarked ? 'fill' : 'regular'} />
                                    <span>{isBookmarked ? 'Unbookmark Event' : 'Bookmark Event'}</span>
                                </button>

                                <button
                                    onClick={cycleAttendance}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 border ${
                                        attendance === 'attending'
                                            ? theme.btnPrimary
                                            : attendance === 'attended'
                                              ? theme.btnSuccess
                                              : theme.btnSecondary
                                    }`}
                                >
                                    {attendance === 'attended' ? <CheckIcon className="w-4 h-4" /> : <UserCheckIcon className="w-4 h-4" />}
                                    <span>
                                        {attendance === 'none'
                                            ? 'Not attending'
                                            : attendance === 'attending'
                                              ? 'Attending'
                                              : 'Attended'}
                                    </span>
                                </button>

                                <button
                                    onClick={handleShare}
                                    className="flex items-center justify-center px-3 py-3 bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm border border-white/20 dark:border-white/10"
                                    title="Share event"
                                >
                                    <ShareNetworkIcon className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                                </button>

                                <div className="relative flex-shrink-0" ref={moreMenuRef}>
                                    <button
                                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                                        className="flex items-center justify-center px-3 py-3 bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm border border-white/20 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-offset-white"
                                        title="More actions"
                                        aria-expanded={showMoreMenu}
                                        aria-haspopup="true"
                                    >
                                        <DotsThreeVerticalIcon className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                                    </button>

                                    {showMoreMenu && (
                                        <div
                                            className="absolute right-0 mt-2 w-48 event-preview-glass-section rounded-lg shadow-lg z-[9999] border border-white/20 dark:border-white/10 backdrop-blur-md"
                                            role="menu"
                                            aria-orientation="vertical"
                                        >
                                            {displayEvent.agendaUrl ? (
                                                <a
                                                    href={displayEvent.agendaUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={() => setShowMoreMenu(false)}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 rounded-t-lg transition-colors focus:outline-none"
                                                    role="menuitem"
                                                >
                                                    <ArrowSquareOutIcon className="w-4 h-4" />
                                                    <span>View full agenda</span>
                                                </a>
                                            ) : (
                                                <a
                                                    href={displayEvent.sourceUrl || `/events/${generateEventSlug(displayEvent.title, displayEvent.id)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={() => setShowMoreMenu(false)}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 rounded-t-lg transition-colors focus:outline-none"
                                                    role="menuitem"
                                                >
                                                    <ArrowSquareOutIcon className="w-4 h-4" />
                                                    <span>View full page</span>
                                                </a>
                                            )}
                                            <button
                                                onClick={() => {
                                                    handleIcsDownload();
                                                    setShowMoreMenu(false);
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 rounded-b-lg transition-colors focus:outline-none"
                                                role="menuitem"
                                            >
                                                <DownloadSimpleIcon className="w-4 h-4" />
                                                <span>Download .ics</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {actionMessage && (
                                <div className="mt-4 text-sm text-gray-800 dark:text-gray-100 bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                                    {actionMessage}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MockEventDetailPanel;
