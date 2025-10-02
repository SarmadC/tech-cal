// src/utils/navigation.ts
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { formatDateForURL } from './dateUtils';

/**
 * Navigation utilities for consistent routing patterns
 */
export class NavigationUtils {
    constructor(private router: AppRouterInstance) {}

    /**
     * Navigate to calendar with event selected
     */
    toEvent(eventId: string) {
        this.router.push(`/calendar?eventId=${eventId}`);
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
        this.router.push('/discover');
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
