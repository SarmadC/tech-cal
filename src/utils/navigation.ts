// src/utils/navigation.ts
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { formatDateForURL } from './dateUtils';
import { NavigationUtils as NavUtils } from './navigationUtils';

/**
 * Navigation utilities for consistent routing patterns
 */
export class NavigationUtils {
    constructor(private router: AppRouterInstance) {}

    /**
     * Navigate to event detail page
     */
    toEvent(eventId: string, eventTitle?: string) {
        this.router.push(NavUtils.goToEvent(eventId, eventTitle));
    }

    /**
     * Navigate to calendar with specific date
     */
    toDate(date: Date) {
        this.router.push(`/calendar?date=${formatDateForURL(date)}`);
    }

    /**
     * Navigate to calendar with view parameter
     */
    toView(view: string, date?: Date) {
        const params = new URLSearchParams();
        params.set('view', view);
        if (date) {
            params.set('date', formatDateForURL(date));
        }
        this.router.push(`/calendar?${params.toString()}`);
    }

    /**
     * Navigate to discover page
     */
    toDiscover() {
        this.router.push('/events');
    }

    /**
     * Navigate to calendar (default view)
     */
    toCalendar() {
        this.router.push('/calendar');
    }

    /**
     * Navigate to dashboard
     */
    toDashboard() {
        this.router.push('/dashboard');
    }
}

/**
 * Hook to get navigation utilities
 */
export function useNavigation(router: AppRouterInstance) {
    return new NavigationUtils(router);
}
