// src/components/CountdownTimer.tsx

'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  startTime: string;
  endTime?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
  hasEnded: boolean;
}

export default function CountdownTimer({ 
  startTime, 
  endTime, 
  className = '',
  size = 'md' 
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false,
    hasEnded: false
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const end = endTime ? new Date(endTime).getTime() : start + (2 * 60 * 60 * 1000); // Default 2 hours if no end time

      // Check if event is currently live
      if (now >= start && now <= end) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isLive: true,
          hasEnded: false
        });
        return;
      }

      // Check if event has ended
      if (now > end) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isLive: false,
          hasEnded: true
        });
        return;
      }

      // Calculate time until event starts
      const difference = start - now;
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeRemaining({
          days,
          hours,
          minutes,
          seconds,
          isLive: false,
          hasEnded: false
        });
      }
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'text-xs',
          number: 'text-sm font-bold',
          label: 'text-xs'
        };
      case 'lg':
        return {
          container: 'text-base',
          number: 'text-2xl font-bold',
          label: 'text-sm'
        };
      default: // md
        return {
          container: 'text-sm',
          number: 'text-lg font-bold',
          label: 'text-xs'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Live indicator
  if (timeRemaining.isLive) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className="relative">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
        </div>
        <span className={`font-semibold text-red-600 ${sizeClasses.container}`}>
          LIVE NOW
        </span>
      </div>
    );
  }

  // Event ended
  if (timeRemaining.hasEnded) {
    return (
      <div className={`inline-flex items-center space-x-1 ${className}`}>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className={`text-gray-500 ${sizeClasses.container}`}>
          Event Ended
        </span>
      </div>
    );
  }

  // Format time display based on how far away the event is
  const formatTimeDisplay = () => {
    const { days, hours, minutes, seconds } = timeRemaining;

    // If more than 7 days away, just show days
    if (days > 7) {
      return (
        <div className="flex items-center space-x-1">
          <span className={`${sizeClasses.number} text-accent-primary`}>{days}</span>
          <span className={`${sizeClasses.label} text-foreground-tertiary`}>
            day{days !== 1 ? 's' : ''}
          </span>
        </div>
      );
    }

    // If more than 1 day away, show days and hours
    if (days > 0) {
      return (
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className={`${sizeClasses.number} text-accent-primary`}>{days}</span>
            <span className={`${sizeClasses.label} text-foreground-tertiary`}>d</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`${sizeClasses.number} text-accent-primary`}>{hours}</span>
            <span className={`${sizeClasses.label} text-foreground-tertiary`}>h</span>
          </div>
        </div>
      );
    }

    // If same day, show hours and minutes (and seconds if less than 1 hour)
    if (hours > 0) {
      return (
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className={`${sizeClasses.number} text-accent-primary`}>{hours}</span>
            <span className={`${sizeClasses.label} text-foreground-tertiary`}>h</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`${sizeClasses.number} text-accent-primary`}>{minutes}</span>
            <span className={`${sizeClasses.label} text-foreground-tertiary`}>m</span>
          </div>
        </div>
      );
    }

    // If less than 1 hour, show minutes and seconds
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <span className={`${sizeClasses.number} text-red-600`}>{minutes}</span>
          <span className={`${sizeClasses.label} text-foreground-tertiary`}>m</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className={`${sizeClasses.number} text-red-600`}>{seconds}</span>
          <span className={`${sizeClasses.label} text-foreground-tertiary`}>s</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      {formatTimeDisplay()}
    </div>
  );
}

// Utility component for compact countdown in calendar grid
export function CompactCountdown({ startTime, endTime }: { startTime: string; endTime?: string | null }) {
  return (
    <CountdownTimer 
      startTime={startTime} 
      endTime={endTime} 
      size="sm"
      className="bg-background-secondary/80 backdrop-blur-sm px-2 py-1 rounded-full"
    />
  );
}

// Utility component for event modal countdown
export function ModalCountdown({ startTime, endTime }: { startTime: string; endTime?: string | null }) {
  return (
    <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground-primary">Event starts in:</span>
        <CountdownTimer 
          startTime={startTime} 
          endTime={endTime} 
          size="lg"
        />
      </div>
    </div>
  );
}