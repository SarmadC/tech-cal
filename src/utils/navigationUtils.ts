/**
 * Unified navigation utilities for consistent routing across the application
 */

export const NavigationUtils = {
  /**
   * Navigate to event details page
   */
  goToEvent: (eventId: string) => `/events/${eventId}`,
  
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
   * Navigate to dashboard settings
   */
  goToSettings: (tab?: string) => {
    return `/dashboard/settings${tab ? `?tab=${tab}` : ''}`;
  },
  
  /**
   * Navigate to calendar discovery
   */
  goToDiscovery: () => '/calendar?view=discover',
  
  /**
   * Navigate to growth dashboard
   */
  goToGrowth: () => '/dashboard/growth',
  
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
