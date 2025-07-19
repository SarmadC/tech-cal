// src/components/HappeningNowIndicator.tsx (Final Corrected Version)

'use client';

import { useMemo } from 'react';

// --- Type Definitions (using snake_case) ---
interface EventForStatus {
  start_time: string;
  end_time?: string | null;
  title: string;
  event_type_id?: string;
}

interface HappeningNowStatus {
  type: 'none' | 'live' | 'deadline' | 'starting' | 'registration' | 'ticket' | 'multiday' | 'progress';
  priority: number;
  color: string;
  pulse?: boolean;
}


// --- Exported Components ---

// ✅ FIXED: Added 'export' back to the function signature
export function CalendarDayDots({ events }: { events: EventForStatus[] }) {
  return (
    <div className="absolute top-1 right-1">
      <MultiStatusDots events={events} size="sm" />
    </div>
  );
}

export function ModalHappeningNow({ start_time, end_time, title }: EventForStatus) {
  const status = useMemo(() => {
    const now = new Date();
    const start = new Date(start_time);
    const end = end_time ? new Date(end_time) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    
    const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const titleLower = title.toLowerCase();
    
    if (now >= start && now <= end) {
      if (durationHours <= 4 && (titleLower.includes('keynote') || titleLower.includes('livestream'))) {
        return { label: 'LIVE NOW', bg: 'bg-red-500', text: 'text-white', pulse: true };
      }
      if (durationHours > 24) {
        const daysPassed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return { label: `DAY ${daysPassed} OF ${Math.ceil(durationHours / 24)}`, bg: 'bg-orange-500', text: 'text-white' };
      }
      return { label: 'IN PROGRESS', bg: 'bg-blue-500', text: 'text-white' };
    }
    
    if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
      return { label: 'STARTS TODAY', bg: 'bg-green-500', text: 'text-white' };
    }
    
    if ((titleLower.includes('registration') || titleLower.includes('ticket')) && hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
      return { label: 'DEADLINE TODAY', bg: 'bg-red-600', text: 'text-white', pulse: true };
    }
    
    return null;
  }, [start_time, end_time, title]);

  if (!status) return null;

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${status.bg} ${status.text} ${status.pulse ? 'animate-pulse' : ''}`}>
      {status.label}
    </div>
  );
}


// --- Internal Components (Not Exported) ---

function MultiStatusDots({ events, size = 'sm', className = '' }: {
  events: EventForStatus[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const statuses = useMemo(() => {
    const statusMap = new Map<string, HappeningNowStatus>();
    
    events.forEach(event => {
      const { status } = getEventStatus(event);
      if (status.type !== 'none') {
        // If a status of the same type already exists, only keep the one with higher priority
        if (!statusMap.has(status.type) || status.priority > statusMap.get(status.type)!.priority) {
          statusMap.set(status.type, status);
        }
      }
    });
    
    return Array.from(statusMap.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }, [events]);

  if (statuses.length === 0) return null;

  const getSizeClasses = () => (size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-3 h-3' : 'w-2 h-2');

  return (
    <div className={`flex gap-1 ${className}`}>
      {statuses.map((status, index) => (
        <div key={index} className={`${getSizeClasses()} ${status.color} rounded-full ${status.pulse ? 'animate-pulse' : ''}`} />
      ))}
    </div>
  );
}

// --- Helper Functions ---

function getEventStatus(event: EventForStatus): { status: HappeningNowStatus } {
    const now = new Date();
    const start = new Date(event.start_time);
    const end = event.end_time ? new Date(event.end_time) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const titleLower = event.title.toLowerCase();

    const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Check for deadlines first
    if ((titleLower.includes('registration') || titleLower.includes('ticket')) && hoursUntilEnd > 0 && hoursUntilEnd <= 24) {
      return { status: { type: 'deadline', priority: 9, color: 'bg-red-600', pulse: true } };
    }
    
    // Check for live / in-progress events
    if (now >= start && now <= end) {
      if (titleLower.includes('keynote') || titleLower.includes('livestream')) {
        return { status: { type: 'live', priority: 10, color: 'bg-red-500', pulse: true } };
      }
      return { status: { type: 'progress', priority: 7, color: 'bg-blue-500' } };
    }
    
    // Check for events starting soon
    if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
      return { status: { type: 'starting', priority: 6, color: 'bg-green-500' } };
    }
    
    return { status: { type: 'none', priority: 0, color: '' } };
}

export function hasHappeningNowStatus(start_time: string, end_time?: string | null, title?: string): boolean {
  if (!title) return false;
  const { status } = getEventStatus({ start_time, end_time, title });
  return status.type !== 'none';
}