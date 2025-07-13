// src/components/CalendarHeader.tsx

import { ChevronLeft, ChevronRight } from 'lucide-react';

// The interface for props remains the same
interface CalendarHeaderProps {
  currentDate: Date;
  view: string;
  onNavigateMonth: (direction: number) => void;
  onSetCurrentDate: () => void;
  onSetView: (view: string) => void;
  monthNames: string[];
}

export default function CalendarHeader({
  currentDate, view, onNavigateMonth, onSetCurrentDate, onSetView, monthNames,
}: CalendarHeaderProps) {
  return (
    // Main container with theme-aware bottom border
    <div className="h-16 px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
      
      {/* Left-side navigation controls */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onNavigateMonth(-1)} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <button 
          onClick={onSetCurrentDate} 
          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          Today
        </button>
        <button 
          onClick={() => onNavigateMonth(1)} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Center month and year title */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
      </h2>

      {/* Right-side view switcher */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button 
          onClick={() => onSetView('month')} 
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            view === 'month' 
              ? 'bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Month
        </button>
        <button 
          onClick={() => onSetView('week')} 
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            view === 'week' 
              ? 'bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Week
        </button>
        <button 
          onClick={() => onSetView('day')} 
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            view === 'day' 
              ? 'bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Day
        </button>
      </div>
    </div>
  );
}