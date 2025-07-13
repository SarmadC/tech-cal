'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Menu, User, Plus, Filter } from 'lucide-react';
import EventModal from '@/components/EventModal';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(categories.map((c) => c.id)));
  const [selectedEvent, setSelectedEvent] = useState<EnrichedEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const enrichedEvents = useMemo(() => {
    const categoryColorMap = new Map(categories.map(c => [c.id, c.color]));
    return initialEvents.map(event => ({ 
      ...event, 
      color: categoryColorMap.get(event.category_id) || '#737373' 
    }));
  }, [initialEvents, categories]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: daysInPrevMonth - i,
        isCurrentMonth: false,
        isPrevMonth: true
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        isCurrentMonth: true,
        isPrevMonth: false
      });
    }
    
    // Next month days
    const remainingDays = 35 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        isCurrentMonth: false,
        isPrevMonth: false
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
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

  const getEventsForDay = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const totalEvents = filteredEvents.length;
  const upcomingEvents = filteredEvents.filter(event => {
    const eventDate = new Date(event.start_time);
    return eventDate >= new Date();
  }).length;

  const isToday = (day: number, isCurrentMonth: boolean) => {
    const today = new Date();
    return isCurrentMonth && 
           day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="text-xl font-bold text-blue-600">TechCalendar</div>
          <div className="hidden lg:flex items-center gap-6">
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Events</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Calendar</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Resources</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <User className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex flex-1 mt-16">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-gray-50 border-r border-gray-200 overflow-hidden transition-all duration-300 flex-shrink-0`}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Event Categories</h2>
            
            <div className="space-y-3 mb-6">
              {categories.map(category => (
                <label key={category.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="flex-1 text-sm text-gray-700">{category.name}</span>
                  <input
                    type="checkbox"
                    checked={selectedCategories.has(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Add Event
              </button>
              <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col bg-gray-100">
          {/* Top Bar */}
          <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="hidden lg:flex items-center gap-6 ml-8">
              <div className="text-sm">
                <div className="text-gray-500">Total Events</div>
                <div className="text-xl font-semibold text-gray-900">{totalEvents}</div>
              </div>
              <div className="text-sm">
                <div className="text-gray-500">Upcoming</div>
                <div className="text-xl font-semibold text-gray-900">{upcomingEvents}</div>
              </div>
            </div>
          </div>

          {/* Calendar Container */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
              {/* Calendar Header */}
              <div className="h-16 px-6 flex items-center justify-between border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button 
                    onClick={() => setCurrentDate(new Date())}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button 
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <h2 className="text-xl font-semibold text-gray-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>

                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setView('month')}
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                      view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Month
                  </button>
                  <button 
                    onClick={() => setView('week')}
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                      view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Week
                  </button>
                  <button 
                    onClick={() => setView('day')}
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                      view === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Day
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="flex-1 flex flex-col">
                {/* Weekdays */}
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {weekDays.map(day => (
                    <div key={day} className="py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="flex-1 grid grid-cols-7 grid-rows-5">
                  {getDaysInMonth(currentDate).map((day, index) => {
                    const dayEvents = getEventsForDay(day.date, day.isCurrentMonth);
                    const todayClass = isToday(day.date, day.isCurrentMonth);

                    return (
                      <div 
                        key={index}
                        className={`border-r border-b border-gray-200 p-2 min-h-[120px] last:border-r-0 ${
                          day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                        } ${todayClass ? 'bg-blue-50' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                        } ${todayClass ? 'text-blue-600' : ''}`}>
                          {day.date}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <div 
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className="text-xs px-2 py-1 rounded text-white truncate cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: event.color }}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 px-2">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Event Modal */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}