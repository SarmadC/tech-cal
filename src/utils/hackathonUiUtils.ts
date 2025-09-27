// src/utils/hackathonUiUtils.ts

import type { HackathonEvent } from '@/types/hackathon';
import { isHackathonRunning } from '@/types/hackathon';

// ==========================================
// SHARED UI UTILITY FUNCTIONS (DRY Principle Applied)
// ==========================================

/**
 * Format date string safely with error handling
 */
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format time string safely with error handling
 */
export const formatTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Invalid Time';
  }
};

/**
 * Get date range string for hackathon
 */
export const getDateRange = (hackathon: HackathonEvent, shortFormat = false): string => {
  const options = shortFormat 
    ? { month: 'short', day: 'numeric' } as Intl.DateTimeFormatOptions
    : undefined;
    
  const start = formatDate(hackathon.startDate, options);
  const end = hackathon.endDate ? formatDate(hackathon.endDate, options) : start;
  return start === end ? start : `${start} - ${end}`;
};

/**
 * Calculate progress percentage for running hackathons
 */
export const calculateProgress = (hackathon: HackathonEvent): number => {
  if (!isHackathonRunning(hackathon) || !hackathon.endDate) return 0;
  
  try {
    const start = new Date(hackathon.startDate);
    const end = new Date(hackathon.endDate);
    const now = new Date();
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  } catch {
    return 0;
  }
};

/**
 * Format progress percentage for display
 */
export const formatProgress = (hackathon: HackathonEvent): string => {
  return `${Math.round(calculateProgress(hackathon))}%`;
};
