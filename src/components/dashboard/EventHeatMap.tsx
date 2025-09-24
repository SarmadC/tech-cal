import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardCard } from './DashboardCard';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { formatDateForURL } from '@/utils/dateUtils';
import type { Event } from '@/types';

interface EventHeatMapProps {
  events: Event[];
  className?: string;
}

/**
 * Simple calendar heat map showing event density
 */
export function EventHeatMap({ events, className = '' }: EventHeatMapProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(today);
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay(); // 0 = Sunday
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long' });

  // Count events per day
  const eventsByDay: { [key: number]: number } = {};
  events.forEach(event => {
    const eventDate = new Date(event.startTime);
    if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
      const day = eventDate.getDate();
      eventsByDay[day] = (eventsByDay[day] || 0) + 1;
    }
  });

  // Generate calendar grid
  const calendarDays = [];

  // Empty cells for days before month starts
  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="w-6 h-6"></div>);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const eventCount = eventsByDay[day] || 0;
    const intensity = Math.min(eventCount, 4); // Cap at 4 for styling

    const intensityClasses = {
      0: 'bg-gray-100 dark:bg-gray-800',
      1: 'bg-blue-200 dark:bg-blue-900',
      2: 'bg-blue-300 dark:bg-blue-800',
      3: 'bg-blue-400 dark:bg-blue-700',
      4: 'bg-blue-500 dark:bg-blue-600'
    };

    const textClasses = {
      0: 'text-gray-600 dark:text-gray-400',
      1: 'text-blue-800 dark:text-blue-100',
      2: 'text-blue-900 dark:text-blue-100',
      3: 'text-blue-100 dark:text-white',
      4: 'text-blue-50 dark:text-white'
    };

    const dayDate = new Date(currentYear, currentMonth, day);
    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

    calendarDays.push(
      <Link
        key={day}
        href={`/calendar?date=${formatDateForURL(dayDate)}&view=day`}
        className={`w-6 h-6 rounded-sm flex items-center justify-center text-xs font-medium transition-colors hover:scale-110 cursor-pointer ${intensityClasses[intensity as keyof typeof intensityClasses]} ${textClasses[intensity as keyof typeof textClasses]} ${
          eventCount === 0 ? 'hover:bg-gray-200 dark:hover:bg-gray-700' : 'hover:opacity-80'
        } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
        title={eventCount > 0 ? `${eventCount} event${eventCount > 1 ? 's' : ''} - Click to view` : `${monthName} ${day} - Click to view`}
      >
        {day}
      </Link>
    );
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setViewDate(newDate);
  };

  return (
    <DashboardCard
      title="Event Calendar"
      className={className}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Previous month"
          >
            <CaretLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {monthName} {currentYear}
          </div>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Next month"
          >
            <CaretRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={index} className="w-6 h-6 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-200 dark:bg-blue-900 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-300 dark:bg-blue-800 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-400 dark:bg-blue-700 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-500 dark:bg-blue-600 rounded-sm"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </DashboardCard>
  );
}