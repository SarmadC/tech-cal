// src/components/calendar/CalendarComponents.tsx
'use client';

import { FC, useMemo, useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    Tag,
    Users,
    X,
    Check,
    Calendar as CalendarIcon,
    Star,
    UserCheck,
    RefreshCw,
    Share2,
    AlertTriangle
} from 'lucide-react';
import { EventContentArg } from '@fullcalendar/core';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTracking, EventStatus } from '@/hooks/useEventTracking';
import { formatToUTC } from '@/lib/calendarUtils';
import { AppEvent, AppEventType } from '@/types'; // Import centralized types

// Local type for this component
type CalendarViewType = 'month' | 'week' | 'day';

// --- MiniCalendar Component ---
const MiniCalendar: FC<{ date: Date; setDate: (d: Date) => void; events: AppEvent[]; currentDate: Date }> = ({ date, setDate, events, currentDate }) => {
    const monthNames = useMemo(() => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], []);
    const weekDays = useMemo(() => ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], []);

    const eventCounts = useMemo(() => {
        const counts = new Map<number, number>();
        const currentMonth = date.getMonth();
        const currentYear = date.getFullYear();

        for (const event of events) {
            const eventDate = new Date(event.startTime);
            if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
                const day = eventDate.getDate();
                counts.set(day, (counts.get(day) || 0) + 1);
            }
        }
        return counts;
    }, [events, date]);

    const maxEvents = useMemo(() => Math.max(1, ...eventCounts.values()), [eventCounts]);

    const getHeatmapStyle = (count: number) => {
        if (count === 0) return {};
        const intensity = Math.min(count / maxEvents, 1);
        return { backgroundColor: `rgba(59, 130, 246, ${intensity * 0.8 + 0.1})` };
    };

    const daysInMonth = useMemo(() => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonthCount = new Date(year, month + 1, 0).getDate();
        const days = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
        const blanks = Array(firstDay).fill(null);
        return [...blanks, ...days];
    }, [date]);

    const navigateMonth = (dir: number) => {
        setDate(new Date(date.getFullYear(), date.getMonth() + dir, 1));
    };

    return (
        <div className="p-1">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">{monthNames[date.getMonth()]} {date.getFullYear()}</h3>
                <div className="flex space-x-1">
                    <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-gray-700 rounded"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-gray-700 rounded"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400">
                {weekDays.map(d => <div key={d}>{d}</div>)}
                {daysInMonth.map((day, i) => {
                    const count = day ? eventCounts.get(day) || 0 : 0;
                    const isSelected = day === currentDate.getDate() && date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
                    const heatmapStyle = getHeatmapStyle(count);
                    const textColor = count > (maxEvents / 2) ? 'text-white' : '';
                    const hoverClass = count === 0 ? 'hover:bg-gray-700' : '';
                    const selectedClass = isSelected ? 'ring-2 ring-white' : '';

                    return (
                        <button
                            key={i}
                            disabled={!day}
                            onClick={() => day && setDate(new Date(date.getFullYear(), date.getMonth(), day))}
                            className={`w-8 h-8 rounded-lg transition-colors ${!day ? 'cursor-default' : ''} ${textColor} ${hoverClass} ${selectedClass}`}
                            style={heatmapStyle}
                        >
                            {day}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};


// --- Sidebar Component ---
export const Sidebar: FC<{
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    categories: AppEventType[];
    selectedCategories: Set<string>;
    setSelectedCategories: (categories: Set<string>) => void;
    nextUpcomingEvent?: AppEvent;
    user: { name: string; role: string };
    events: AppEvent[];
}> = ({ currentDate, setCurrentDate, categories, selectedCategories, setSelectedCategories, nextUpcomingEvent, user, events }) => {
    const handleCategoryChange = (categoryId: string) => {
        const newSet = new Set(selectedCategories);
        if (newSet.has(categoryId)) {
            newSet.delete(categoryId);
        } else {
            newSet.add(categoryId);
        }
        setSelectedCategories(newSet);
    };

    return (
        <aside className="w-80 bg-[#1e1e1e] border-r border-gray-800 p-6 flex flex-col space-y-6">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center font-bold text-white">
                    {user.name.charAt(0)}
                </div>
                <div>
                    <p className="font-semibold text-white">{user.name}</p>
                    <p className="text-sm text-gray-400">{user.role}</p>
                </div>
            </div>

            <MiniCalendar date={currentDate} setDate={setCurrentDate} events={events} currentDate={currentDate} />

            {nextUpcomingEvent && (
                <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">
                        {new Date(nextUpcomingEvent.startTime).toLocaleString('en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <h4 className="font-semibold text-white mb-1">{nextUpcomingEvent.title}</h4>
                    <p className="text-sm text-gray-400">{nextUpcomingEvent.location}</p>
                    <div className="flex space-x-2 mt-3">
                        <button className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md">Details</button>
                        <button className="text-sm bg-gray-900 hover:bg-black px-3 py-1 rounded-md">Later</button>
                    </div>
                </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto">
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Filter by Category</h3>
                    <div className="space-y-2">
                        {categories.map(cat => (
                            <label key={cat.id} className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.has(cat.id)}
                                    onChange={() => handleCategoryChange(cat.id)}
                                    className="form-checkbox bg-gray-700 border-gray-600 rounded"
                                    style={{ accentColor: cat.color }}
                                />
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                <span className="text-sm">{cat.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
};

// --- CalendarHeader Component ---
export const CalendarHeader: FC<{
    currentDate: Date;
    view: CalendarViewType;
    onNavigate: (dir: 'prev' | 'next' | 'today') => void;
    onChangeView: (view: CalendarViewType) => void;
}> = ({ currentDate, view, onNavigate, onChangeView }) => {
    return (
        <header className="h-20 flex-shrink-0 px-6 flex items-center justify-between border-b border-gray-800">
            <h1 className="text-xl font-semibold text-white">
                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </h1>
            <div className="flex items-center space-x-4">
                <div className="flex items-center bg-gray-800 rounded-lg">
                    {(['month', 'week', 'day'] as CalendarViewType[]).map(v => (
                        <button
                            key={v}
                            onClick={() => onChangeView(v)}
                            className={`px-4 py-2 text-sm rounded-md transition-colors capitalize ${view === v ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => onNavigate('prev')} className="p-2 hover:bg-gray-800 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => onNavigate('today')} className="text-sm px-3 py-1.5 border border-gray-700 rounded-lg hover:bg-gray-800">Today</button>
                    <button onClick={() => onNavigate('next')} className="p-2 hover:bg-gray-800 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
                </div>
            </div>
        </header>
    );
};

// --- EventDetailPanel Component ---
export const EventDetailPanel: FC<{ event: AppEvent; onClose: () => void; categories: AppEventType[] }> = ({ event, onClose, categories }) => {
    const { user } = useAuth();
    const { trackEvent, untrackEvent, isEventTracked, loading } = useEventTracking();
    const [trackingStatus, setTrackingStatus] = useState<{ isTracked: boolean; status?: EventStatus; }>({ isTracked: false });
    const [notes, setNotes] = useState('');
    const [showCopiedBanner, setShowCopiedBanner] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            if (!user) return;
            const status = await isEventTracked(event.id);
            setTrackingStatus(status);
        };
        checkStatus();
    }, [event, user, isEventTracked]);

    const handleTrackEvent = async (status: EventStatus) => {
        if (!user) return;
        setError(null);
        const result = await trackEvent(event.id, status, notes);
        if (result.success) {
            setTrackingStatus({ isTracked: true, status });
        } else {
            setError(result.error || 'Failed to track event');
        }
    };

    const handleUntrackEvent = async () => {
        if (!user) return;
        setError(null);
        const result = await untrackEvent(event.id);
        if (result.success) {
            setTrackingStatus({ isTracked: false });
        } else {
            setError(result.error || 'Failed to untrack event');
        }
    };

    const handleShare = () => {
        const link = `${window.location.origin}/event/${event.id}`;
        navigator.clipboard.writeText(link);
        setShowCopiedBanner(true);
        setTimeout(() => setShowCopiedBanner(false), 2500);
    };

    const googleCalendarLink = useMemo(() => {
        const utcStartTime = formatToUTC(event.startTime);
        const utcEndTime = formatToUTC(event.endTime || new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000));
        const url = new URL('https://www.google.com/calendar/render');
        url.searchParams.set('action', 'TEMPLATE');
        url.searchParams.set('text', event.title);
        url.searchParams.set('dates', `${utcStartTime}/${utcEndTime}`);
        url.searchParams.set('details', event.description);
        url.searchParams.set('location', event.location);
        return url.href;
    }, [event]);

    const handleIcsDownload = () => {
        const utcStartTime = formatToUTC(event.startTime);
        const utcEndTime = formatToUTC(event.endTime || new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000));
        const icsContent = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KureCal//EN', 'BEGIN:VEVENT',
            `UID:${event.id}@kurecal.app`, `DTSTAMP:${formatToUTC(new Date())}`, `DTSTART:${utcStartTime}`, `DTEND:${utcEndTime}`,
            `SUMMARY:${event.title}`, `DESCRIPTION:${event.description}`, `LOCATION:${event.location}`,
            'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n');
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const category = categories.find(c => c.id === event.eventTypeId);

    return (
        <aside className="w-96 bg-[#1e1e1e] border-l border-gray-800 p-6 flex flex-col relative">
            {showCopiedBanner && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-30 transition-opacity duration-300">
                    Link copied to clipboard!
                </div>
            )}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Event Details</h2>
                <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto">
                <h3 className="text-2xl font-bold text-white">{event.title}</h3>

                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-sm">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span>{new Date(event.startTime).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <span>{event.location}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                        <Users className="w-5 h-5 text-gray-400" />
                        <span>Organized by {event.organizer}</span>
                    </div>
                </div>
                {category && (
                    <div className="flex items-center space-x-2">
                        <div className="px-3 py-1 text-xs rounded-full flex items-center space-x-2" style={{ backgroundColor: `${category.color}33`, color: category.color }}>
                            <Tag className="w-3 h-3" />
                            <span>{category.name}</span>
                        </div>
                    </div>
                )}

                <p className="text-sm leading-relaxed text-gray-300">
                    {event.description}
                </p>

            </div>

            <div className="mt-6 space-y-4">
                {error && (
                    <div className="bg-red-500/10 text-red-300 text-xs p-3 rounded-lg flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}
                {user && (
                    <div>
                        {trackingStatus.isTracked ? (
                            <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <Check className="w-5 h-5 text-green-400" />
                                    <span className="text-green-300 font-medium text-sm">Tracked as {trackingStatus.status}</span>
                                </div>
                                <button onClick={handleUntrackEvent} disabled={loading} className="text-red-400 hover:text-red-300 text-sm font-medium">
                                    {loading ? 'Removing...' : 'Remove'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add a note..."
                                    rows={2}
                                    className="w-full bg-gray-800 text-sm p-2 rounded-lg border border-gray-700 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => handleTrackEvent('bookmarked')} disabled={loading} className="flex flex-col items-center space-y-1 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                                        <span className="text-xs">Bookmark</span>
                                    </button>
                                    <button onClick={() => handleTrackEvent('attending')} disabled={loading} className="flex flex-col items-center space-y-1 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                        <span className="text-xs">Attending</span>
                                    </button>
                                    <button onClick={() => handleTrackEvent('attended')} disabled={loading} className="flex flex-col items-center space-y-1 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        <span className="text-xs">Attended</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="flex space-x-3">
                    <a href={googleCalendarLink} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-center">Add to Google</a>
                    <button onClick={handleIcsDownload} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg"><CalendarIcon className="w-5 h-5" /></button>
                    <button onClick={handleShare} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg"><Share2 className="w-5 h-5" /></button>
                </div>
            </div>
        </aside>
    );
};

// --- CustomEventContent Component ---
export const CustomEventContent: FC<EventContentArg> = ({ event }) => {
    const { title, extendedProps } = event;
    const { color, startTime, endTime } = extendedProps as AppEvent;

    const formatTime = (time: string) => new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    return (
        <div className="p-1 h-full w-full">
            <div
                className="p-2 h-full w-full flex flex-col text-white rounded-lg"
                style={{ backgroundColor: color }}
            >
                <div className="flex-grow overflow-hidden">
                    <p className="font-bold text-sm text-white break-words">{title}</p>
                    <p className="text-xs opacity-90 mt-1 text-white/80">
                        {formatTime(startTime)} - {endTime ? formatTime(endTime) : ''}
                    </p>
                </div>
            </div>
        </div>
    );
};