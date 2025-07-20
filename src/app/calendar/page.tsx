// src/app/calendar/page.tsx (Updated with Hybrid View Implementation)

'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import MainNavbar from '@/components/MainNavbar';
import FilterSidebar from '@/components/FilterSidebar';
import ContentHeader from '@/components/ContentHeader';
import CalendarHeader from '@/components/CalendarHeader';
import EventModal from '@/components/EventModal';
import CalendarGrid from '@/components/CalendarGrid';
import BulkActions, { useBulkSelection, useBulkKeyboardShortcuts } from '@/components/BulkActions';
import { SmartLoader, CalendarSkeleton, SidebarSkeleton } from '@/components/Loading';

// --- NEW IMPORTS ---
import TechCalendar from '@/components/TechCalendar'; // For Week, Day, and List views
import { EventClickArg } from '@fullcalendar/core'; // Type for FullCalendar's click event

// Type definitions (unchanged)
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
};

type Category = {
  id: string;
  name: string;
  color: string;
};

// --- NEW: Map for FullCalendar view names ---
const viewMap: { [key: string]: string } = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth', // Although we use a custom component for month view
  list: 'listWeek',
};

export default function CalendarPage() {
  // 1. STATE MANAGEMENT (unchanged)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedEvent, setSelectedEvent] = useState<EnrichedEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { user: _user } = useAuth(); // Prefixed to indicate it's intentionally unused for now
  
 const {
    selectedEvents,
    toggleEvent,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount,
    toggleMultiple
  } = useBulkSelection();

  // 2. DATA FETCHING (unchanged)
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const { data: eventTypesData, error: eventTypesError } = await supabase
          .from('event_type')
          .select('*');

        if (eventTypesError) throw new Error('Failed to load event categories.');
        
        const eventTypes: Category[] = eventTypesData || [];
        setCategories(eventTypes);
        setSelectedCategories(new Set(eventTypes.map(c => c.id)));

        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*');

        if (eventsError) throw new Error('Failed to load events.');

        setEvents(eventsData || []);

      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [refreshKey]);
  
  // --- NEW: HANDLER FOR RETRY BUTTON ---
  const handleRetry = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // 3. EFFECTS & LOGIC (largely unchanged, with additions)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === "ArrowLeft") { e.preventDefault(); setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); }
      if (e.key === "t" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCurrentDate(new Date()); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentDate]);

  const monthNames = useMemo(() => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], []);
  const weekDays = useMemo(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], []);

  const enrichedEvents = useMemo(() => {
    const categoryColorMap = new Map(categories.map(c => [c.id, c.color]));
    return events.map(event => ({
      ...event,
      color: categoryColorMap.get(event.event_type_id) || '#737373'
    }));
  }, [events, categories]);

  const filteredEvents = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return enrichedEvents.filter((event) => {
      if (!selectedCategories.has(event.event_type_id)) return false;
      if (searchTerm) {
        return event.title.toLowerCase().includes(lowercasedSearchTerm) ||
               event.organizer.toLowerCase().includes(lowercasedSearchTerm);
      }
      return true;
    });
  }, [enrichedEvents, selectedCategories, searchTerm]);
  
  const searchSuggestions = useMemo(() => {
    if (!searchTerm) return [];
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const uniqueSuggestions = new Map<string, EnrichedEvent>();
    enrichedEvents.forEach(event => {
      if (event.title.toLowerCase().includes(lowercasedSearchTerm) ||
          event.organizer.toLowerCase().includes(lowercasedSearchTerm)) {
        if (!uniqueSuggestions.has(event.id)) uniqueSuggestions.set(event.id, event);
      }
    });
    return Array.from(uniqueSuggestions.values()).slice(0, 5);
  }, [searchTerm, enrichedEvents]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) { days.push({ date: daysInPrevMonth - i, isCurrentMonth: false }); }
    for (let i = 1; i <= daysInMonth; i++) { days.push({ date: i, isCurrentMonth: true }); }
    const totalDays = days.length > 35 ? 42 : 35;
    const remainingDays = totalDays - days.length;
    for (let i = 1; i <= remainingDays; i++) { days.push({ date: i, isCurrentMonth: false }); }
    return days;
  }, [currentDate]);

  const visibleEventIds = useMemo(() => filteredEvents.map(event => event.id), [filteredEvents]);

  const getEventsForDay = useCallback((day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return filteredEvents.filter(event => new Date(event.start_time).toISOString().split('T')[0] === dayDate.toISOString().split('T')[0]);
  }, [currentDate, filteredEvents]);
  
  const isToday = useCallback((day: number, isCurrentMonth: boolean) => {
    const today = new Date();
    return isCurrentMonth && day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  }, [currentDate]);

  // --- NEW: Memoized event list for FullCalendar ---
  const fullCalendarEvents = useMemo(() => {
    return filteredEvents.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start_time,
      end: event.end_time || undefined,
      color: event.color,
    }));
  }, [filteredEvents]);

  const handleBulkTrack = async () => { if (selectedCount > 0) console.log(`Bulk tracking ${selectedCount} events`); };
  const handleBulkComplete = () => { setRefreshKey(prev => prev + 1); clearSelection(); };

  // This handler is now used by BOTH CalendarGrid and FullCalendar
  const handleEventClick = useCallback((event: EnrichedEvent, ctrlKey = false, shiftKey = false) => {
    if (ctrlKey) { toggleEvent(event.id); } 
    else if (shiftKey && selectedCount > 0) {
      const dayEvents = getEventsForDay(new Date(event.start_time).getDate(), true);
      toggleMultiple(dayEvents.map(e => e.id));
    } else if (selectedCount > 0) { clearSelection(); setSelectedEvent(event); } 
    else { setSelectedEvent(event); }
  }, [toggleEvent, selectedCount, getEventsForDay, toggleMultiple, clearSelection]);

  // --- NEW: Wrapper handler for FullCalendar's event click ---
  const handleFullCalendarEventClick = useCallback((clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id;
    const clickedEvent = enrichedEvents.find(e => e.id === eventId);
    if (clickedEvent) {
      // Call the main handler with the full event object and key press info
      handleEventClick(clickedEvent, clickInfo.jsEvent.ctrlKey, clickInfo.jsEvent.shiftKey);
    }
  }, [enrichedEvents, handleEventClick]);

  const handleEventTracked = () => { setRefreshKey(prev => prev + 1); };

  useBulkKeyboardShortcuts(selectedEvents, visibleEventIds, { onSelectAll: selectAll, onClearSelection: clearSelection, onBulkTrack: handleBulkTrack });
  
  // 4. RENDER LOGIC (UPDATED)
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <MainNavbar />
      <SmartLoader
        loading={loading}
        error={error}
        onRetry={handleRetry}
        skeleton={
          <div className="flex flex-1 mt-16">
             <div className="w-72 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
              <SidebarSkeleton />
            </div>
            <main className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900">
              <div className="h-20 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800" />
              <CalendarSkeleton />
            </main>
          </div>
        }
      >
        <div className="flex flex-1 mt-16">
          <div
            className={`
              ${sidebarOpen ? 'w-72' : 'w-0'}
              bg-gray-50 dark:bg-gray-950
              border-r border-gray-200 dark:border-gray-800
              overflow-hidden transition-all duration-300 flex-shrink-0
            `}
          >
            <FilterSidebar
              categories={categories}
              selectedCategories={selectedCategories}
              onToggleCategory={(catId) => setSelectedCategories(prev => {
                const newSet = new Set(prev);
                if (newSet.has(catId)) newSet.delete(catId);
                else newSet.add(catId);
                return newSet;
              })}
            />
          </div>

          <main className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900">
            <ContentHeader
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              isSearchFocused={isSearchFocused}
              onSearchFocus={() => setIsSearchFocused(true)}
              searchContainerRef={searchContainerRef}
              suggestions={searchSuggestions}
              onSuggestionClick={(suggestion) => {
                setSearchTerm(suggestion.title || 'Untitled Event');
                setIsSearchFocused(false);
              }}
              totalEvents={filteredEvents.length}
              upcomingEvents={filteredEvents.filter(e => new Date(e.start_time) >= new Date()).length}
            />

            <BulkActions
              selectedEvents={selectedEvents}
              onClearSelection={clearSelection}
              onBulkComplete={handleBulkComplete}
              className="mx-6 mt-4"
            />

            <div className="flex-1 p-6 overflow-auto">
              <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm h-full flex flex-col">
                <CalendarHeader
                  currentDate={currentDate}
                  view={view}
                  onNavigateMonth={(dir) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1))}
                  onSetCurrentDate={() => setCurrentDate(new Date())}
                  onSetView={setView}
                  monthNames={monthNames}
                />
                
                {view === 'month' ? (
                  <CalendarGrid
                    days={daysInMonth}
                    weekDays={weekDays}
                    getEventsForDay={getEventsForDay}
                    isToday={isToday}
                    onEventClick={handleEventClick}
                    isSelected={isSelected}
                    selectedCount={selectedCount}
                  />
                ) : (
                  <div className="p-4 flex-1 h-full"> {/* Ensure container has height for FC */}
                    <TechCalendar
                      initialView={viewMap[view]}
                      events={fullCalendarEvents} // This now matches TechCalendarProps.events
                      onEventClick={handleFullCalendarEventClick}
                    />
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        {selectedEvent && (
          <EventModal 
            event={selectedEvent} 
            onClose={() => setSelectedEvent(null)}
            onEventTracked={handleEventTracked}
          />
        )}

        {selectedCount > 0 && (
          <div className="fixed bottom-4 right-4 bg-background-secondary border border-border-color rounded-lg p-3 shadow-lg text-xs text-foreground-tertiary">
            <div className="space-y-1">
              <div><kbd className="px-1 py-0.5 bg-background-tertiary rounded">Ctrl+A</kbd> Select all</div>
              <div><kbd className="px-1 py-0.5 bg-background-tertiary rounded">Ctrl+T</kbd> Track selected</div>
              <div><kbd className="px-1 py-0.5 bg-background-tertiary rounded">Esc</kbd> Clear selection</div>
            </div>
          </div>
        )}
      </SmartLoader>
    </div>
  );
}