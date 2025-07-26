'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import MainNavbar from '@/components/MainNavbar';
import EventModal from '@/components/EventModal';
import CalendarGrid from '@/components/CalendarGrid';
import TechCalendar from '@/components/TechCalendar';
import { useEventTracking } from '@/hooks/useEventTracking';
// cspell:disable-next-line
import { EventClickArg } from '@fullcalendar/core';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Plus,
    Search,
    Settings,
    ChevronDown,
    Clock,
    MapPin,
    Users
} from 'lucide-react';

// Clean type definitions
type EnrichedEvent = {
    id: string;
    event_type_id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string | null;
    organizer: string;
    location: string;
    status: string;
    source_url: string;
    livestream_url: string | null;
    color: string;
    isTracked?: boolean;
};

type Category = {
    id: string;
    name: string;
    color: string;
    count?: number;
};

type CalendarViewType = 'month' | 'week' | 'day';

const viewMap: { [key: string]: string } = {
    day: 'timeGridDay',
    week: 'timeGridWeek',
    month: 'dayGridMonth',
};

export default function CleanCalendarPage() {
    const { user } = useAuth();
    const { getTrackedEvents } = useEventTracking();

    // Core state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [selectedEvent, setSelectedEvent] = useState<EnrichedEvent | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [events, setEvents] = useState<EnrichedEvent[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [trackedEventIds, setTrackedEventIds] = useState<Set<string>>(new Set());

    const searchRef = useRef<HTMLInputElement>(null);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Data fetching
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [
                { data: eventTypesData, error: eventTypesError },
                { data: eventsData, error: eventsError },
                trackedEventsData
            ] = await Promise.all([
                supabase.from('event_type').select('*').order('name'),
                supabase
                    .from('events')
                    .select('*')
                    .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                    .order('start_time', { ascending: true }),
                user ? getTrackedEvents() : Promise.resolve([])
            ]);

            if (eventTypesError) throw new Error('Failed to load event categories.');
            if (eventsError) throw new Error('Failed to load events.');

            const eventTypes: Category[] = (eventTypesData || []).map(type => ({
                ...type,
                count: eventsData?.filter(e => e.event_type_id === type.id).length || 0
            }));

            setCategories(eventTypes);
            setSelectedCategories(new Set(eventTypes.map(c => c.id)));

            const enhancedEvents: EnrichedEvent[] = (eventsData || []).map(event => ({
                ...event,
                location: event.location || '',
                status: event.status || 'active',
                source_url: event.source_url || '',
            }));

            setEvents(enhancedEvents);
            setTrackedEventIds(new Set(trackedEventsData.map((e: { event_id: string }) => e.event_id)));

        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [user, getTrackedEvents]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Enhanced event processing
    const enrichedEvents = useMemo(() => {
        const categoryColorMap = new Map(categories.map(c => [c.id, c.color]));
        return events.map(event => ({
            ...event,
            color: categoryColorMap.get(event.event_type_id) || '#737373',
            isTracked: trackedEventIds.has(event.id)
        }));
    }, [events, categories, trackedEventIds]);

    // Filtered events
    const filteredEvents = useMemo(() => {
        let result = enrichedEvents;

        // Apply category filter
        result = result.filter(event => selectedCategories.has(event.event_type_id));

        // Apply search filter
        if (searchTerm) {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            result = result.filter(event =>
                (event.title || '').toLowerCase().includes(lowercasedSearchTerm) ||
                (event.organizer || '').toLowerCase().includes(lowercasedSearchTerm) ||
                (event.description || '').toLowerCase().includes(lowercasedSearchTerm)
            );
        }

        return result.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }, [enrichedEvents, selectedCategories, searchTerm]);

    // Calendar helpers
    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const days: { date: number; isCurrentMonth: boolean }[] = [];

        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ date: daysInPrevMonth - i, isCurrentMonth: false });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: i, isCurrentMonth: true });
        }
        const totalDays = days.length > 35 ? 42 : 35;
        const remainingDays = totalDays - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ date: i, isCurrentMonth: false });
        }
        return days;
    }, [currentDate]);

    const getEventsForDay = useCallback((day: number, isCurrentMonth: boolean): EnrichedEvent[] => {
        if (!isCurrentMonth) return [];
        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return filteredEvents.filter(event => {
            const eventDate = new Date(event.start_time);
            return eventDate.toDateString() === dayDate.toDateString();
        });
    }, [currentDate, filteredEvents]);

    const isToday = useCallback((day: number, isCurrentMonth: boolean) => {
        const today = new Date();
        return isCurrentMonth &&
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear();
    }, [currentDate]);

    const fullCalendarEvents = useMemo(() => {
        return filteredEvents.map(event => ({
            id: event.id,
            title: event.title || 'Untitled Event',
            start: event.start_time,
            end: event.end_time || undefined,
            color: event.color,
        }));
    }, [filteredEvents]);

    // Event handlers
    const handleEventClick = useCallback((event: EnrichedEvent) => {
        setSelectedEvent(event);
    }, []);

    const handleFullCalendarEventClick = useCallback((clickInfo: EventClickArg) => {
        const eventId = clickInfo.event.id;
        const clickedEvent = enrichedEvents.find(e => e.id === eventId);
        if (clickedEvent) {
            handleEventClick(clickedEvent);
        }
    }, [enrichedEvents, handleEventClick]);

    const navigateCalendar = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else if (view === 'week') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const formatHeaderDate = () => {
        if (view === 'month') {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        } else if (view === 'week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                return `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
            } else {
                return `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${monthNames[endOfWeek.getMonth()]} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
            }
        } else {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <MainNavbar />
                <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <MainNavbar />

            <div className="flex h-[calc(100vh-4rem)]">
                {/* Clean Sidebar */}
                <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="h-full flex flex-col">
                        {/* Mini Calendar */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h3>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => navigateCalendar('prev')}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => navigateCalendar('next')}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Mini calendar grid */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {weekDays.map(day => (
                                    <div key={day} className="text-xs text-gray-500 text-center p-1">
                                        {day.slice(0, 2)}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {daysInMonth.map((day, index) => {
                                    const isSelected = isToday(day.date, day.isCurrentMonth);
                                    const hasEvents = day.isCurrentMonth && getEventsForDay(day.date, true).length > 0;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                if (day.isCurrentMonth) {
                                                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day.date));
                                                }
                                            }}
                                            className={`
                                                text-xs p-1 h-8 w-8 rounded transition-colors relative
                                                ${day.isCurrentMonth
                                                    ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    : 'text-gray-400 dark:text-gray-600'
                                                }
                                                ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                                            `}
                                        >
                                            {day.date}
                                            {hasEvents && (
                                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* My Calendars */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">My Calendars</h3>
                                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                    <Settings className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={true}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        readOnly
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Tech Events</span>
                                    <span className="text-xs text-gray-500 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                                        {filteredEvents.length}
                                    </span>
                                </label>

                                {user && (
                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={true}
                                            className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                            readOnly
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">My Events</span>
                                        <span className="text-xs text-gray-500 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                            {filteredEvents.filter(e => e.isTracked).length}
                                        </span>
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="p-6 flex-1 overflow-y-auto">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Categories</h3>

                            <div className="space-y-2">
                                {categories.map(category => (
                                    <label key={category.id} className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedCategories.has(category.id)}
                                            onChange={(e) => {
                                                const newSet = new Set(selectedCategories);
                                                if (e.target.checked) {
                                                    newSet.add(category.id);
                                                } else {
                                                    newSet.delete(category.id);
                                                }
                                                setSelectedCategories(newSet);
                                            }}
                                            className="w-4 h-4 rounded border-gray-300 focus:ring-2"
                                            style={{ accentColor: category.color }}
                                        />
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: category.color }}
                                        ></div>
                                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                            {category.name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {category.count || 0}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Calendar Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {formatHeaderDate()}
                                </h1>
                                <button
                                    onClick={goToToday}
                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Today
                                </button>
                            </div>

                            <div className="flex items-center space-x-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        ref={searchRef}
                                        type="text"
                                        placeholder="Search events..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* View Toggle */}
                                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                    {(['month', 'week', 'day'] as CalendarViewType[]).map((viewType) => (
                                        <button
                                            key={viewType}
                                            onClick={() => setView(viewType)}
                                            className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${view === viewType
                                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                                }`}
                                        >
                                            {viewType}
                                        </button>
                                    ))}
                                </div>

                                {/* Navigation */}
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => navigateCalendar('prev')}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                    <button
                                        onClick={() => navigateCalendar('next')}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Content */}
                    <div className="flex-1 overflow-auto p-6">
                        {view === 'month' ? (
                            <CalendarGrid
                                days={daysInMonth}
                                weekDays={weekDays}
                                getEventsForDay={getEventsForDay}
                                isToday={isToday}
                                onEventClick={handleEventClick}
                                selectedEvents={new Set()}
                                isSelected={() => false}
                                layoutMode="comfortable"
                            />
                        ) : (
                            <TechCalendar
                                events={fullCalendarEvents}
                                initialView={viewMap[view]}
                                onEventClick={handleFullCalendarEventClick}
                            />
                        )}
                    </div>
                </div>

                {/* Event Detail Panel */}
                {selectedEvent && (
                    <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="h-full flex flex-col">
                            {/* Event Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            {selectedEvent.title}
                                        </h2>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {selectedEvent.organizer}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedEvent(null)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Event Details */}
                            <div className="flex-1 p-6 space-y-4">
                                <div className="flex items-center space-x-3">
                                    <Clock className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {new Date(selectedEvent.start_time).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {new Date(selectedEvent.start_time).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                            {selectedEvent.end_time && (
                                                ` - ${new Date(selectedEvent.end_time).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}`
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {selectedEvent.location && (
                                    <div className="flex items-center space-x-3">
                                        <MapPin className="w-5 h-5 text-gray-400" />
                                        <div className="text-sm text-gray-900 dark:text-white">
                                            {selectedEvent.location}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center space-x-3">
                                    <Users className="w-5 h-5 text-gray-400" />
                                    <div className="text-sm text-gray-900 dark:text-white">
                                        {selectedEvent.organizer}
                                    </div>
                                </div>

                                {selectedEvent.description && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {selectedEvent.description}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex space-x-3">
                                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
                                        {selectedEvent.isTracked ? 'Untrack Event' : 'Track Event'}
                                    </button>
                                    {selectedEvent.source_url && (
                                        <a
                                            href={selectedEvent.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg font-medium transition-colors text-center"
                                        >
                                            View Details
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Add Button */}
            <button
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all md:hidden"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Error State */}
            {error && (
                <div className="fixed bottom-4 left-4 right-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
                    <div className="text-red-800 dark:text-red-200 text-sm">
                        {error}
                    </div>
                </div>
            )}
        </div>
    );
}