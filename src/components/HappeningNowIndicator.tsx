'use client';

import { useMemo } from 'react';

interface HappeningNowIndicatorProps {
  startTime: string;
  endTime?: string | null;
  title: string;
  eventType?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface HappeningNowStatus {
  type: 'none' | 'live' | 'deadline' | 'starting' | 'registration' | 'ticket';
  priority: number;
  color: string;
  pulse?: boolean;
  tooltip: string;
}

export default function HappeningNowIndicator({ 
  startTime, 
  endTime, 
  title,
  eventType = '', // eslint-disable-line @typescript-eslint/no-unused-vars
  className = '',
  size = 'md' 
}: HappeningNowIndicatorProps) {
  
  const status = useMemo((): HappeningNowStatus => {
    const now = new Date();
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    
    // Calculate time differences in hours
    const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    // Event is currently happening
    if (now >= start && now <= end) {
      // Check if it's a livestream (short duration, likely has livestream keywords)
      if (durationHours <= 4 && (
        title.toLowerCase().includes('keynote') ||
        title.toLowerCase().includes('livestream') ||
        title.toLowerCase().includes('announcement') ||
        title.toLowerCase().includes('launch')
      )) {
        return {
          type: 'live',
          priority: 10,
          color: 'bg-red-500',
          pulse: true,
          tooltip: 'Live now'
        };
      }
      
      // Multi-day events - SMART LOGIC: Only show on first day
      if (durationHours > 24) {
        const isFirstDay = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) === 0;
        
        // Only show indicator on first day of multi-day events
        if (!isFirstDay) {
          return {
            type: 'none',
            priority: 0,
            color: '',
            tooltip: ''
          };
        }
        
        const totalDays = Math.ceil(durationHours / 24);
        return {
          type: 'live',
          priority: 8,
          color: 'bg-orange-500',
          tooltip: `Multi-day event (${totalDays} days)`
        };
      }
      
      // Event ending soon (within 2 hours)
      if (hoursUntilEnd <= 2 && hoursUntilEnd > 0) {
        return {
          type: 'deadline',
          priority: 9,
          color: 'bg-amber-500',
          tooltip: 'Ending soon'
        };
      }
      
      // Regular event in progress
      return {
        type: 'live',
        priority: 7,
        color: 'bg-blue-500',
        tooltip: 'In progress'
      };
    }
    
    // Event starts within 24 hours
    if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
      return {
        type: 'starting',
        priority: 6,
        color: 'bg-green-500',
        tooltip: 'Starts today'
      };
    }
    
    // Check for registration/deadline patterns in title
    const titleLower = title.toLowerCase();
    
    // Registration deadlines
    if (titleLower.includes('registration') || titleLower.includes('signup') || titleLower.includes('submit')) {
      if (hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
        return {
          type: 'deadline',
          priority: 9,
          color: 'bg-red-600',
          pulse: true,
          tooltip: 'Registration deadline today'
        };
      }
      
      if (now >= start && now <= end) {
        return {
          type: 'registration',
          priority: 5,
          color: 'bg-blue-500',
          tooltip: 'Registration open'
        };
      }
    }
    
    // Ticket sales
    if (titleLower.includes('ticket') || titleLower.includes('sale') || titleLower.includes('early bird')) {
      if (hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
        return {
          type: 'deadline',
          priority: 8,
          color: 'bg-purple-600',
          pulse: true,
          tooltip: 'Sale ends today'
        };
      }
      
      if (now >= start && now <= end) {
        return {
          type: 'ticket',
          priority: 4,
          color: 'bg-purple-500',
          tooltip: 'Tickets on sale'
        };
      }
    }
    
    return {
      type: 'none',
      priority: 0,
      color: '',
      tooltip: ''
    };
  }, [startTime, endTime, title]);

  // Don't render if no status
  if (status.type === 'none') return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-1.5 h-1.5';
      case 'lg':
        return 'w-3 h-3';
      default: // md
        return 'w-2 h-2';
    }
  };

  return (
    <div 
      className={`
        ${getSizeClasses()} ${status.color} rounded-full
        ${status.pulse ? 'animate-pulse' : ''}
        ${className}
      `}
      title={status.tooltip}
    />
  );
}

// Multi-dot component for days with multiple statuses
export function MultiStatusDots({ 
  events, 
  size = 'sm',
  className = '' 
}: { 
  events: Array<{ startTime: string; endTime?: string | null; title: string; eventType?: string }>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const statuses = useMemo(() => {
    const statusMap = new Map();
    
    events.forEach(event => {
      const now = new Date();
      const start = new Date(event.startTime);
      const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
      
      const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
      const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const titleLower = event.title.toLowerCase();
      
      // Live events (highest priority)
      if (now >= start && now <= end) {
        if (durationHours <= 4 && (
          titleLower.includes('keynote') ||
          titleLower.includes('livestream') ||
          titleLower.includes('announcement') ||
          titleLower.includes('launch')
        )) {
          statusMap.set('live', { color: 'bg-red-500', pulse: true, priority: 10 });
        } else if (durationHours > 24) {
          // Multi-day: only show on first day
          const isFirstDay = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) === 0;
          if (isFirstDay) {
            statusMap.set('multiday', { color: 'bg-orange-500', pulse: false, priority: 8 });
          }
        } else {
          statusMap.set('progress', { color: 'bg-blue-500', pulse: false, priority: 7 });
        }
      }
      
      // Deadlines
      if ((titleLower.includes('registration') || titleLower.includes('ticket') || titleLower.includes('submit')) && 
          hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
        statusMap.set('deadline', { color: 'bg-red-600', pulse: true, priority: 9 });
      }
      
      // Starting today
      if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
        statusMap.set('starting', { color: 'bg-green-500', pulse: false, priority: 6 });
      }
      
      // Registration/tickets open
      if (now >= start && now <= end) {
        if (titleLower.includes('registration')) {
          statusMap.set('registration', { color: 'bg-blue-500', pulse: false, priority: 5 });
        } else if (titleLower.includes('ticket')) {
          statusMap.set('ticket', { color: 'bg-purple-500', pulse: false, priority: 4 });
        }
      }
    });
    
    // Convert to array and sort by priority (highest first)
    return Array.from(statusMap.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3); // Max 3 dots
  }, [events]);

  if (statuses.length === 0) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-1.5 h-1.5';
      case 'lg':
        return 'w-3 h-3';
      default:
        return 'w-2 h-2';
    }
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      {statuses.map((status, index) => (
        <div
          key={index}
          className={`
            ${getSizeClasses()} ${status.color} rounded-full
            ${status.pulse ? 'animate-pulse' : ''}
          `}
        />
      ))}
    </div>
  );
}

// Utility component for compact display in calendar grid
export function CompactHappeningNow({ 
  startTime, 
  endTime, 
  title, 
  eventType 
}: { 
  startTime: string; 
  endTime?: string | null; 
  title: string; 
  eventType?: string; 
}) {
  return (
    <HappeningNowIndicator 
      startTime={startTime}
      endTime={endTime}
      title={title}
      eventType={eventType}
      size="sm"
    />
  );
}

// Enhanced version for calendar days with multiple events
export function CalendarDayDots({ 
  events 
}: { 
  events: Array<{ startTime: string; endTime?: string | null; title: string; eventType?: string }> 
}) {
  return (
    <div className="absolute top-1 right-1">
      <MultiStatusDots events={events} size="sm" />
    </div>
  );
}

// Utility component for modal display (shows detailed badges)
export function ModalHappeningNow({ 
  startTime, 
  endTime, 
  title, 
  eventType = '' // eslint-disable-line @typescript-eslint/no-unused-vars
}: { 
  startTime: string; 
  endTime?: string | null; 
  title: string; 
  eventType?: string; 
}) {
  const status = useMemo(() => {
    const now = new Date();
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    
    const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const titleLower = title.toLowerCase();
    
    if (now >= start && now <= end) {
      if (durationHours <= 4 && (
        titleLower.includes('keynote') ||
        titleLower.includes('livestream') ||
        titleLower.includes('announcement') ||
        titleLower.includes('launch')
      )) {
        return { label: 'LIVE NOW', bg: 'bg-red-500', text: 'text-white', pulse: true };
      }
      
      if (durationHours > 24) {
        const totalDays = Math.ceil(durationHours / 24);
        const daysPassed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return { label: `DAY ${daysPassed} OF ${totalDays}`, bg: 'bg-orange-500', text: 'text-white' };
      }
      
      return { label: 'IN PROGRESS', bg: 'bg-blue-500', text: 'text-white' };
    }
    
    if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
      return { label: 'STARTS TODAY', bg: 'bg-green-500', text: 'text-white' };
    }
    
    if ((titleLower.includes('registration') || titleLower.includes('ticket')) && 
        hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
      return { label: 'DEADLINE TODAY', bg: 'bg-red-600', text: 'text-white', pulse: true };
    }
    
    return null;
  }, [startTime, endTime, title]);

  if (!status) return null;

  return (
    <div className={`
      inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold
      ${status.bg} ${status.text}
      ${status.pulse ? 'animate-pulse' : ''}
    `}>
      {status.label}
    </div>
  );
}

// Helper function to check if event has happening now status (for filtering)
export function hasHappeningNowStatus(startTime: string, endTime?: string | null, title?: string): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  
  const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  
  // Currently happening
  if (now >= start && now <= end) {
    // For multi-day events, only show on first day
    if (durationHours > 24) {
      const isFirstDay = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) === 0;
      return isFirstDay;
    }
    return true;
  }
  
  // Starting within 24 hours
  if (hoursUntilStart > 0 && hoursUntilStart <= 24) return true;
  
  // Has deadline today
  if (title) {
    const titleLower = title.toLowerCase();
    const hasDeadlineKeywords = titleLower.includes('registration') || 
                               titleLower.includes('ticket') || 
                               titleLower.includes('submit') ||
                               titleLower.includes('deadline') ||
                               titleLower.includes('sale');
    
    if (hasDeadlineKeywords && hoursUntilEnd <= 24 && hoursUntilEnd > 0) return true;
    if (hasDeadlineKeywords && now >= start && now <= end) return true;
  }
  
  return false;
}