// src/components/HappeningNowIndicator.tsx

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
  type: 'none' | 'live' | 'multi_day' | 'ending_soon' | 'starting_soon' | 'deadline_today' | 'registration_open' | 'on_sale';
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  pulse?: boolean;
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
          label: 'LIVE NOW',
          icon: '🔴',
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          pulse: true
        };
      }
      
      // Multi-day conference or long event
      if (durationHours > 24) {
        const totalDays = Math.ceil(durationHours / 24);
        const daysPassed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return {
          type: 'multi_day',
          label: `DAY ${daysPassed} OF ${totalDays}`,
          icon: '🔥',
          bgColor: 'bg-orange-500',
          textColor: 'text-white'
        };
      }
      
      // Event ending soon (within 2 hours)
      if (hoursUntilEnd <= 2 && hoursUntilEnd > 0) {
        return {
          type: 'ending_soon',
          label: 'ENDING SOON',
          icon: '⏰',
          bgColor: 'bg-amber-500',
          textColor: 'text-white'
        };
      }
      
      // Regular event in progress
      return {
        type: 'multi_day',
        label: 'IN PROGRESS',
        icon: '▶️',
        bgColor: 'bg-blue-500',
        textColor: 'text-white'
      };
    }
    
    // Event starts within 24 hours
    if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
      return {
        type: 'starting_soon',
        label: 'STARTS TODAY',
        icon: '🚀',
        bgColor: 'bg-green-500',
        textColor: 'text-white'
      };
    }
    
    // Check for registration/deadline patterns in title
    const titleLower = title.toLowerCase();
    
    // Registration deadlines
    if (titleLower.includes('registration') || titleLower.includes('signup') || titleLower.includes('submit')) {
      if (hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
        return {
          type: 'deadline_today',
          label: 'DEADLINE TODAY',
          icon: '📝',
          bgColor: 'bg-red-600',
          textColor: 'text-white',
          pulse: true
        };
      }
      
      if (now >= start && now <= end) {
        return {
          type: 'registration_open',
          label: 'OPEN NOW',
          icon: '📝',
          bgColor: 'bg-emerald-500',
          textColor: 'text-white'
        };
      }
    }
    
    // Ticket sales
    if (titleLower.includes('ticket') || titleLower.includes('sale') || titleLower.includes('early bird')) {
      if (hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
        return {
          type: 'deadline_today',
          label: 'SALE ENDS TODAY',
          icon: '🎫',
          bgColor: 'bg-purple-600',
          textColor: 'text-white',
          pulse: true
        };
      }
      
      if (now >= start && now <= end) {
        return {
          type: 'on_sale',
          label: 'ON SALE NOW',
          icon: '🎫',
          bgColor: 'bg-purple-500',
          textColor: 'text-white'
        };
      }
    }
    
    return {
      type: 'none',
      label: '',
      icon: '',
      bgColor: '',
      textColor: ''
    };
  }, [startTime, endTime, title]);

  // Don't render if no status
  if (status.type === 'none') return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-sm px-4 py-2';
      default:
        return 'text-xs px-3 py-1.5';
    }
  };

  return (
    <div className={`
      inline-flex items-center space-x-1 rounded-full font-bold tracking-wider
      ${status.bgColor} ${status.textColor} ${getSizeClasses()}
      ${status.pulse ? 'animate-pulse' : ''}
      ${className}
    `}>
      <span className="text-xs">{status.icon}</span>
      <span>{status.label}</span>
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
      className="shadow-sm"
    />
  );
}

// Utility component for modal display
export function ModalHappeningNow({ 
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
      size="lg"
      className="shadow-md"
    />
  );
}

// Helper function to check if event has happening now status (for filtering)
export function hasHappeningNowStatus(startTime: string, endTime?: string | null, title?: string): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  
  const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Currently happening
  if (now >= start && now <= end) return true;
  
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