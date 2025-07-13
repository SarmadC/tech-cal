// src/app/calendar/page.tsx

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Import our clean components
import MainNavbar from '@/components/MainNavbar';
import FilterSidebar from '@/components/FilterSidebar';
import ContentHeader from '@/components/ContentHeader';
import CalendarHeader from '@/components/CalendarHeader';
import CalendarGrid from '@/components/CalendarGrid';
import EventModal from '@/components/EventModal';

// Type definitions
type EnrichedEvent = {
  id: string; category_id: string; title: string; description: string;
  start_time: string; end_time: string | null; organizer: string;
  location: string; status: string; source_url: string;
  livestream_url: string | null; color: string; [key: string]: any;
};
type Category = { id: string; name: string; color: string; };

export default function CalendarPage() {
  // 1. STATE MANAGEMENT
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedEvent, setSelectedEvent] = useState<EnrichedEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 2. EFFECTS
  useEffect(() => {
    async function fetchData() {
      const { data: categoriesData } = await supabase.from('categories').select('*');
      const cats = categoriesData || [];
      setCategories(cats);
      setSelectedCategories(new Set(cats.map(c => c.id)));

      const { data: eventsData } = await supabase.from('events').select('*');
      setEvents(eventsData || []);
    }
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. LOGIC & DERIVED STATE
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const enrichedEvents = useMemo(() => {
    const categoryColorMap = new Map(categories.map(c => [c.id, c.color]));
    return events.map(event => ({ ...event, color: categoryColorMap.get(event.category_id) || '#737373' }));
  }, [events, categories]);
  
  const searchSuggestions = useMemo(() => {
    if (!searchTerm) return [];
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const uniqueSuggestions = new Map<string, EnrichedEvent>();
    enrichedEvents.forEach(event => {
      if (event.title.toLowerCase().includes(lowercasedSearchTerm) || event.organizer.toLowerCase().includes(lowercasedSearchTerm)) {
        if (!uniqueSuggestions.has(event.id)) uniqueSuggestions.set(event.id, event);
      }
    });
    return Array.from(uniqueSuggestions.values()).slice(0, 5);
  }, [searchTerm, enrichedEvents]);

  const filteredEvents = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return enrichedEvents.filter((event) => {
      if (!selectedCategories.has(event.category_id)) return false;
      if (searchTerm) {
        return event.title.toLowerCase().includes(lowercasedSearchTerm) || event.organizer.toLowerCase().includes(lowercasedSearchTerm);
      }
      return true;
    });
  }, [enrichedEvents, selectedCategories, searchTerm]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) { days.push({ date: daysInPrevMonth - i, isCurrentMonth: false }); }
    for (let i = 1; i <= daysInMonth; i++) { days.push({ date: i, isCurrentMonth: true }); }
    const totalDays = days.length > 35 ? 42 : 35;
    const remainingDays = totalDays - days.length;
    for (let i = 1; i <= remainingDays; i++) { days.push({ date: i, isCurrentMonth: false }); }
    return days;
  }, [currentDate]);

  const getEventsForDay = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const dayDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), day));
    return filteredEvents.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = event.end_time ? new Date(event.end_time) : eventStart;
      const eventStartDate = new Date(Date.UTC(eventStart.getUTCFullYear(), eventStart.getUTCMonth(), eventStart.getUTCDate()));
      const eventEndDate = new Date(Date.UTC(eventEnd.getUTCFullYear(), eventEnd.getUTCMonth(), eventEnd.getUTCDate()));
      return dayDate >= eventStartDate && dayDate <= eventEndDate;
    });
  };

  const isToday = (day: number, isCurrentMonth: boolean) => {
    const today = new Date();
    return isCurrentMonth && day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };


  // 4. RENDER
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <MainNavbar />

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
              setSearchTerm(suggestion.title);
              setIsSearchFocused(false);
            }}
            totalEvents={filteredEvents.length}
            upcomingEvents={filteredEvents.filter(e => new Date(e.start_time) >= new Date()).length}
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
              <CalendarGrid
                days={daysInMonth}
                weekDays={weekDays}
                getEventsForDay={getEventsForDay}
                isToday={isToday}
                onEventClick={(event) => setSelectedEvent(event as EnrichedEvent)}
              />
            </div>
          </div>
        </main>
      </div>

      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}