'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Filter } from 'lucide-react';

import { createClient } from '@/utils/supabase/client';

import CalendarSidebar from '@/components/calendar/CalendarSidebar';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import EventDetailPanel from '@/components/calendar/EventDetailPanel';
import Loading from '@/components/Loading';
import CalendarWithPreview from '@/components/calendar/CalendarWithPreview';
import SmartFilterPanel from '@/components/calendar/SmartFilterPanel';
import { useSmartFilters } from '@/hooks/useSmartFilters';

import { AppEvent, AppEventType, AppProfile, AppTrackedEvent } from '@/types';
import { UserEventService } from '@/services/userEventService';
import { useAuth } from '@/contexts/AuthContext';
import { EventService } from '@/services/eventServices';

interface CalendarClientViewProps {
    initialEvents: AppEvent[];
    initialCategories: AppEventType[];
    profile: AppProfile | null;
}

type CalendarViewType = 'month' | 'week' | 'day';

const viewMap: { [key: string]: string } = {
    day: 'timeGridDay',
    week: 'timeGridWeek',
    month: 'dayGridMonth',
};

export default function CalendarClientView({
    initialEvents,
    initialCategories,
    profile,
}: CalendarClientViewProps) {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();

    const calendarRef = useRef<FullCalendar>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

    // Smart Filters - handles ALL filtering now
    const {
        filters,
        filteredEvents,
        updateFilter,
        resetFilters,
        applyQuickFilter,
        activeFilterCount,
        isFilterPanelOpen,
        setIsFilterPanelOpen,
    } = useSmartFilters(initialEvents, profile);

    // --- DATA FETCHING ---
    const { data: trackedEvents, isLoading: isLoadingTracked } = useQuery({
        queryKey: ['trackedEvents', user?.id],
        queryFn: () => {
            if (!user) return [];
            return UserEventService.getTrackedEvents(user.id, supabase);
        },
        enabled: !!user,
    });

    // Use smart filtered events instead of server-side filtering for most cases
    const { data: events, isLoading: isLoadingEvents, isError, error } = useQuery({
        queryKey: ['events', filters],
        queryFn: () => {
            // For basic filters, use client-side filtering from useSmartFilters
            if (filters.searchTerm || filters.dateRange.start || filters.dateRange.end) {
                // Only fetch from server if we have search terms or date ranges
                return EventService.getEvents({
                    categories: filters.categories,
                    searchTerm: filters.searchTerm,
                    startDate: filters.dateRange.start || undefined,
                    endDate: filters.dateRange.end || undefined,
                }, supabase);
            }
            // Otherwise use client-side filtered events
            return Promise.resolve(filteredEvents);
        },
        initialData: filteredEvents,
        placeholderData: keepPreviousData,
        enabled: !!user,
    });

    // --- DERIVED/MEMOIZED STATE ---
    const trackedEventIds = useMemo(() => {
        return new Set((trackedEvents || []).map((e: AppTrackedEvent) => e.eventId));
    }, [trackedEvents]);

    const enrichedEvents = useMemo(() => {
        const categoryColorMap = new Map(initialCategories.map(c => [c.id, c.color]));
        return (events || []).map((event: AppEvent) => ({
            ...event,
            color: categoryColorMap.get(event.eventTypeId) || '#737373',
            isTracked: trackedEventIds.has(event.id)
        }));
    }, [events, initialCategories, trackedEventIds]);

    const nextUpcomingEvent = useMemo(() => {
        const now = new Date();
        return enrichedEvents
            .filter((e: AppEvent) => new Date(e.startTime) > now)
            .sort((a: AppEvent, b: AppEvent) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
    }, [enrichedEvents]);

    // --- CALLBACKS & HANDLERS ---
    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        setSelectedEvent(clickInfo.event.extendedProps as AppEvent);
    }, []);

    const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        api[direction]();
        setCurrentDate(api.getDate());
    };

    const changeView = (newView: CalendarViewType) => {
        calendarRef.current?.getApi().changeView(viewMap[newView]);
        setView(newView);
    };

    if (isLoadingTracked && !trackedEvents) {
        return <Loading />;
    }

    if (isError) {
        return <div>Error loading events: {error?.message}</div>
    }

    return (
        <div className="flex h-screen bg-[#171717] text-gray-300 font-sans">
            {/* UPDATED Sidebar - No more category filters, handled by Smart Filters */}
            <CalendarSidebar
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                categories={initialCategories} // Still needed for mini calendar dots
                selectedCategories={new Set()} // Not used anymore
                setSelectedCategories={() => { }} // Not used anymore
                nextUpcomingEvent={nextUpcomingEvent}
                user={{
                    name: profile?.fullName || 'Kure-Cal User',
                    role: 'Product Designer'
                }}
                events={enrichedEvents}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Header with Smart Filter Toggle */}
                <div className="flex items-center justify-between">
                    <CalendarHeader
                        currentDate={currentDate}
                        view={view}
                        onNavigate={navigateCalendar}
                        onChangeView={changeView}
                    />

                    {/* Smart Filter Toggle Button - Now the ONLY filtering interface */}
                    <div className="flex items-center space-x-2 mr-6">
                        <button
                            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                            className={`px-3 py-2 rounded-lg border transition-colors ${isFilterPanelOpen || activeFilterCount > 0
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                                }`}
                        >
                            <div className="flex items-center space-x-2">
                                <Filter className="w-4 h-4" />
                                <span className="text-sm">Smart Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Calendar and Filter Panel Container */}
                <div className="flex-1 flex relative">
                    {/* Calendar Container */}
                    <div className={`flex-1 transition-all duration-300 ${isFilterPanelOpen ? 'mr-80' : ''
                        }`}>
                        <div className="flex-1 overflow-hidden p-6">
                            {/* Loading Indicator */}
                            {isLoadingEvents && (
                                <div className="absolute top-24 right-10 z-10 p-2 bg-gray-600/50 rounded-lg text-xs animate-pulse">
                                    Loading...
                                </div>
                            )}

                            {/* Enhanced Calendar with Preview Cards */}
                            <CalendarWithPreview
                                events={enrichedEvents}
                                onEventClick={handleEventClick}
                                view={viewMap[view]}
                                date={currentDate}
                                calendarRef={calendarRef}
                            />
                        </div>
                    </div>

                    {/* Smart Filter Panel - Comprehensive filtering */}
                    {isFilterPanelOpen && (
                        <div className="w-80 border-l border-gray-700 bg-[#1e1e1e]">
                            <SmartFilterPanel
                                filters={filters}
                                onUpdateFilter={updateFilter}
                                onResetFilters={resetFilters}
                                onApplyQuickFilter={applyQuickFilter}
                                activeFilterCount={activeFilterCount}
                                isOpen={isFilterPanelOpen}
                                onClose={() => setIsFilterPanelOpen(false)}
                            />
                        </div>
                    )}
                </div>
            </main>

            {/* Event Detail Panel */}
            {selectedEvent && (
                <EventDetailPanel
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    categories={initialCategories}
                />
            )}

            {/* Custom Styles for Dark Theme */}
            <style jsx global>{`
                /* Smart Filter Panel Dark Theme Override */
                .smart-filter-panel {
                    background: #1e1e1e !important;
                    color: #d1d5db !important;
                }
                
                .smart-filter-panel h3,
                .smart-filter-panel h4 {
                    color: #f9fafb !important;
                }
                
                .smart-filter-panel input[type="radio"],
                .smart-filter-panel input[type="checkbox"] {
                    accent-color: #3b82f6 !important;
                }
                
                .smart-filter-panel label:hover {
                    background-color: rgba(75, 85, 99, 0.3) !important;
                    border-radius: 6px;
                    padding: 4px;
                    margin: -4px;
                }
                
                /* Enhanced Event Styling */
                .tracked-event {
                    border-left: 4px solid #10B981 !important;
                }
                
                .virtual-event {
                    border-right: 2px solid #8B5CF6 !important;
                }
                
                .priority-event {
                    box-shadow: 0 0 0 2px #F59E0B !important;
                }
                
                .fc-event:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 10;
                }
                
                .fc-event {
                    border-radius: 6px;
                    border: none !important;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                
                .fc-daygrid-event {
                    margin: 1px;
                }
                
                .fc-event-main {
                    padding: 2px 4px;
                }
            `}</style>
        </div>
    );
}