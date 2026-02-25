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
    
    // If options are provided, use them directly - but allowing options to be partial
    // We want to merge but only if the specific key isn't provided.
    // However, for this fix, if any options are provided, we should probably be careful.
    // Actually, getDateRange provides a full set now.
    
    return new Date(dateString).toLocaleDateString('en-US', options || defaultOptions);
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
export const getDateRange = (hackathon: HackathonEvent, shortFormat = false, includeYear = true): string => {
  const options = {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
    ...(shortFormat ? {} : { weekday: 'short' })
  } as Intl.DateTimeFormatOptions;
    
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

/**
 * Get human-readable time-until string
 */
export const getTimeUntil = (dateString: string): string => {
  try {
    const target = new Date(dateString).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return 'Passed';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 30) return `${Math.ceil(days / 30)} month${days > 60 ? 's' : ''}`;
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return 'Less than an hour';
  } catch {
    return '';
  }
};

/**
 * Get registration countdown with urgency level for color-coding
 */
export const getRegistrationCountdown = (
  deadline: string | null | undefined
): { text: string; urgency: 'low' | 'medium' | 'high' } | null => {
  if (!deadline) return null;

  try {
    const target = new Date(deadline).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return null; // deadline passed

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    const timeText = getTimeUntil(deadline);
    const text = `Registration closes in ${timeText}`;

    let urgency: 'low' | 'medium' | 'high' = 'low';
    if (days <= 2) urgency = 'high';
    else if (days <= 7) urgency = 'medium';

    return { text, urgency };
  } catch {
    return null;
  }
};

/**
 * Format hackathon location for display
 * Unifies logic for virtual status, city/country, and general location field
 */
export const formatLocation = (hackathon: HackathonEvent): string => {
  if (hackathon.isVirtual) {
    return hackathon.locationCity ? `Remote (${hackathon.locationCity})` : 'Remote';
  }

  if (hackathon.locationCity && hackathon.locationCountry) {
    return `${hackathon.locationCity}, ${hackathon.locationCountry}`;
  }

  if (hackathon.locationCity) return hackathon.locationCity;
  
  return hackathon.location || 'Location TBD';
};
