// src/components/HappeningNowIndicator.tsx (Modern Gradient Version)

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
  variant: 'live' | 'progress' | 'deadline' | 'starting' | 'registration' | 'ticket' | 'ending';
  pulse?: boolean;
}

// Modern SVG Icon Components
const LiveIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="6" fill="currentColor"/>
    <circle cx="6" cy="6" r="3" fill="white" fillOpacity="0.3"/>
  </svg>
);

const ProgressIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="none">
    <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="6" cy="6" r="1" fill="currentColor"/>
  </svg>
);

const ClockIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const RocketIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="none">
    <path d="M8 2l1.5 1.5-3 3L5 5l3-3z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.2"/>
    <path d="M5 6.5L2 10l3.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const DocumentIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="none">
    <path d="M3 2h6v8H3V2z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1"/>
    <path d="M5 4h2M5 6h2M5 8h1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const TicketIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="none">
    <path d="M2 3h8v2.5c-.5 0-1 .5-1 1s.5 1 1 1V10H2V7.5c.5 0 1-.5 1-1s-.5-1-1-1V3z" 
          stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1"/>
    <path d="M4 5h4M4 7h4" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
  </svg>
);

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
          variant: 'live',
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
          variant: 'progress'
        };
      }
      
      // Event ending soon (within 2 hours)
      if (hoursUntilEnd <= 2 && hoursUntilEnd > 0) {
        return {
          type: 'ending_soon',
          label: 'ENDING SOON',
          variant: 'ending'
        };
      }
      
      // Regular event in progress
      return {
        type: 'multi_day',
        label: 'IN PROGRESS',
        variant: 'progress'
      };
    }
    
    // Event starts within 24 hours
    if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
      return {
        type: 'starting_soon',
        label: 'STARTS TODAY',
        variant: 'starting'
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
          variant: 'deadline',
          pulse: true
        };
      }
      
      if (now >= start && now <= end) {
        return {
          type: 'registration_open',
          label: 'OPEN NOW',
          variant: 'registration'
        };
      }
    }
    
    // Ticket sales
    if (titleLower.includes('ticket') || titleLower.includes('sale') || titleLower.includes('early bird')) {
      if (hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
        return {
          type: 'deadline_today',
          label: 'SALE ENDS TODAY',
          variant: 'deadline',
          pulse: true
        };
      }
      
      if (now >= start && now <= end) {
        return {
          type: 'on_sale',
          label: 'ON SALE NOW',
          variant: 'ticket'
        };
      }
    }
    
    return {
      type: 'none',
      label: '',
      variant: 'live'
    };
  }, [startTime, endTime, title]);

  // Don't render if no status
  if (status.type === 'none') return null;

  // Variant configurations with modern gradients
  const variants = {
    live: {
      bg: 'bg-gradient-to-r from-red-500 to-red-600',
      text: 'text-white',
      border: 'border-red-500/20',
      shadow: 'shadow-lg shadow-red-500/25',
      icon: LiveIcon
    },
    progress: {
      bg: 'bg-gradient-to-r from-orange-500 to-amber-500',
      text: 'text-white',
      border: 'border-orange-500/20',
      shadow: 'shadow-lg shadow-orange-500/25',
      icon: ProgressIcon
    },
    deadline: {
      bg: 'bg-gradient-to-r from-red-600 to-pink-600',
      text: 'text-white',
      border: 'border-red-600/20',
      shadow: 'shadow-lg shadow-red-600/25',
      icon: ClockIcon
    },
    starting: {
      bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
      text: 'text-white',
      border: 'border-emerald-500/20',
      shadow: 'shadow-lg shadow-emerald-500/25',
      icon: RocketIcon
    },
    registration: {
      bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
      text: 'text-white',
      border: 'border-blue-500/20',
      shadow: 'shadow-lg shadow-blue-500/25',
      icon: DocumentIcon
    },
    ticket: {
      bg: 'bg-gradient-to-r from-purple-500 to-violet-500',
      text: 'text-white',
      border: 'border-purple-500/20',
      shadow: 'shadow-lg shadow-purple-500/25',
      icon: TicketIcon
    },
    ending: {
      bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      text: 'text-white',
      border: 'border-amber-500/20',
      shadow: 'shadow-lg shadow-amber-500/25',
      icon: ClockIcon
    }
  };

  const config = variants[status.variant];
  const Icon = config.icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs gap-1',
          icon: 'w-3 h-3'
        };
      case 'lg':
        return {
          container: 'px-4 py-2 text-sm gap-2',
          icon: 'w-4 h-4'
        };
      default: // md
        return {
          container: 'px-3 py-1.5 text-xs gap-1.5',
          icon: 'w-3 h-3'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`
      inline-flex items-center font-semibold tracking-wide
      rounded-full border backdrop-blur-sm
      ${config.bg} ${config.text} ${config.border} ${config.shadow}
      ${sizeClasses.container}
      ${status.pulse ? 'animate-pulse' : ''}
      transition-all duration-200 hover:scale-105
      ${className}
    `}>
      <Icon className={sizeClasses.icon} />
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