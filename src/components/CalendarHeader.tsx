// src/components/CalendarHeader.tsx

import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="h-16 px-6 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center gap-2">
        <button onClick={() => onNavigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <button onClick={onSetCurrentDate} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          Today
        </button>
        <button onClick={() => onNavigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">
        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
      </h2>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button onClick={() => onSetView('month')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Month</button>
        <button onClick={() => onSetView('week')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Week</button>
        <button onClick={() => onSetView('day')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${view === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Day</button>
      </div>
    </div>
  );
}