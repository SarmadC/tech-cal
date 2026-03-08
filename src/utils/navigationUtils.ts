/**
 * Unified navigation utilities for consistent routing across the application
 */

import { generateEventSlug } from './slugUtils';

export const NavigationUtils = {
  /**
   * Navigate to event details page with SEO-friendly slug
   * @param eventId - The event ID (UUID)
   * @param eventTitle - Optional event title for generating a readable slug
   */
  goToEvent: (eventId: string, eventTitle?: string) => {
    if (eventTitle) {
      const slug = generateEventSlug(eventTitle, eventId);
      return `/events/${slug}`;
    }
    return `/events/${eventId}`;
  },
  
  /**
   * Navigate to calendar with specific date
   */
  goToCalendar: (date?: string, view?: string) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (view) params.set('view', view);
    return `/calendar${params.toString() ? `?${params.toString()}` : ''}`;
  },

  /**
   * Navigate to calendar with a prefilled search term.
   */
  goToCalendarSearch: (searchTerm: string, view: string = 'month') => {
    const params = new URLSearchParams();
    params.set('searchTerm', searchTerm);
    params.set('view', view);
    return `/calendar?${params.toString()}`;
  },
  
  /**
   * Navigate to dashboard settings
   */
  goToSettings: (tab?: string) => {
    return `/dashboard/settings${tab ? `?tab=${tab}` : ''}`;
  },
  
  /**
   * Navigate to calendar discovery
   */
  goToDiscovery: () => '/events',
  
  
  /**
   * Navigate to main dashboard
   */
  goToDashboard: () => '/dashboard',
  
  /**
   * Navigate to login with redirect
   */
  goToLogin: (redirectTo?: string) => {
    return `/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`;
  }
} as const;
