'use client';

import { useState, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import FilterSidebar from './FilterSidebar';
import TechCalendar from './TechCalendar';
import EventModal from './EventModal';
import SearchBar from './SearchBar';
import { EventClickArg } from '@fullcalendar/core';

type EnrichedEvent = { 
  id: string; 
  category_id: string; 
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
  [key: string]: any; 
};

type Category = { 
  id: string; 
  name: string; 
  color: string; 
};

interface CalendarViewProps { 
  initialEvents: any[]; 
  categories: Category[]; 
}

export default function CalendarView({ initialEvents, categories }: CalendarViewProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(categories.map((c) => c.id)));
  const [selectedEvent, setSelectedEvent] = useState<EnrichedEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const calendarRef = useRef<FullCalendar | null>(null);

  const enrichedEvents = useMemo(() => {
    const categoryColorMap = new Map(categories.map(c => [c.id, c.color]));
    return initialEvents.map(event => ({ 
      ...event, 
      color: categoryColorMap.get(event.category_id) || '#737373' 
    }));
  }, [initialEvents, categories]);

  const handleFilterChange = (categoryId: string, isChecked: boolean) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (isChecked) newSet.add(categoryId); 
      else newSet.delete(categoryId);
      return newSet;
    });
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = enrichedEvents.find(e => e.id === clickInfo.event.id);
    if (event) setSelectedEvent(event);
  };

  const suggestions = useMemo(() => {
    if (!searchTerm) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return enrichedEvents
      .filter(event => 
        event.title.toLowerCase().includes(lowercasedTerm) || 
        event.organizer.toLowerCase().includes(lowercasedTerm)
      )
      .slice(0, 5);
  }, [searchTerm, enrichedEvents]);

  const handleSuggestionClick = (suggestion: EnrichedEvent) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) calendarApi.gotoDate(suggestion.start_time);
    setSelectedEvent(suggestion);
    setSearchTerm('');
  };

  const filteredEvents = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return enrichedEvents.filter((event) => {
      const isCategoryMatch = selectedCategories.has(event.category_id);
      if (!isCategoryMatch) return false;
      if (searchTerm) {
        return event.title.toLowerCase().includes(lowercasedSearchTerm) || 
               event.organizer.toLowerCase().includes(lowercasedSearchTerm);
      }
      return true;
    });
  }, [enrichedEvents, selectedCategories, searchTerm]);

  return (
    <div className="flex h-full w-full bg-background-main">
      
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block w-72 flex-shrink-0 border-r border-border-color bg-background-secondary">
        <FilterSidebar 
          categories={categories} 
          selectedCategories={selectedCategories} 
          onFilterChange={handleFilterChange} 
        />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-col bg-background-secondary">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-background-main shadow-md"
              >
                <svg className="h-6 w-6 text-foreground-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FilterSidebar 
              categories={categories} 
              selectedCategories={selectedCategories} 
              onFilterChange={handleFilterChange} 
            />
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="flex-shrink-0 bg-background-main border-b border-border-color">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-background-secondary transition-colors"
            >
              <svg className="h-5 w-5 text-foreground-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Logo/Title */}
            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold text-foreground-primary">TechCalendar</h1>
            </div>
            
            {/* Search */}
            <div className="flex-1 max-w-2xl mx-4 lg:mx-8">
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                suggestions={suggestions}
                onSuggestionClick={handleSuggestionClick}
              />
            </div>
            
            {/* Stats */}
            <div className="hidden lg:flex items-center space-x-6">
              <div className="text-sm">
                <span className="text-foreground-tertiary">Events:</span>
                <span className="ml-2 font-medium text-foreground-primary">{filteredEvents.length}</span>
              </div>
              <div className="text-sm">
                <span className="text-foreground-tertiary">Categories:</span>
                <span className="ml-2 font-medium text-foreground-primary">{selectedCategories.size}/{categories.length}</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Calendar Container */}
        <div className="flex-1 p-4 lg:p-8 overflow-auto bg-background-secondary">
          <div className="h-full bg-background-main rounded-lg border border-border-color p-4 lg:p-6">
            <TechCalendar
              ref={calendarRef}
              events={filteredEvents}
              onEventClick={handleEventClick}
            />
          </div>
        </div>
      </div>
      
      {/* Event Modal */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}