// src/types/componentProps.ts
// Consolidated base prop interfaces to reduce duplication and ensure consistency

import type { Event, TrackedEventRecord, AppProfile, EventType } from './index';

// ============================================
// BASE COMPONENT PROPS
// ============================================

/**
 * Base props that most components should extend
 */
export interface BaseComponentProps {
  className?: string;
}

/**
 * Base props for components that handle events
 */
export interface BaseEventProps extends BaseComponentProps {
  events: Event[];
}

/**
 * Base props for components that handle tracked events
 */
export interface BaseTrackedEventProps extends BaseComponentProps {
  trackedEvents: TrackedEventRecord[];
}

/**
 * Base props for components that handle both events and tracked events
 */
export interface BaseEventAndTrackedProps extends BaseComponentProps {
  events: Event[];
  trackedEvents: TrackedEventRecord[];
}

/**
 * Base props for components that handle user profiles
 */
export interface BaseProfileProps extends BaseComponentProps {
  profile: AppProfile | null;
}

/**
 * Base props for components that handle event types/categories
 */
export interface BaseCategoryProps extends BaseComponentProps {
  categories: EventType[];
}

// ============================================
// DASHBOARD SPECIFIC PROPS
// ============================================

/**
 * Standard props for dashboard analytics components
 */
export interface DashboardAnalyticsProps extends BaseEventAndTrackedProps {
  userProfile: AppProfile;
}

/**
 * Standard props for dashboard event display components
 */
export interface DashboardEventDisplayProps extends BaseEventAndTrackedProps {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
}

/**
 * Standard props for dashboard chart components
 */
export interface DashboardChartProps extends BaseComponentProps {
  height?: number;
  color?: string;
}

// ============================================
// CALENDAR SPECIFIC PROPS
// ============================================

/**
 * Standard props for calendar view components
 */
export interface CalendarViewProps extends BaseComponentProps {
  events: Event[];
  initialDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event) => void;
  onEventClick?: (clickInfo: { event: Event; el: HTMLElement }) => void;
}

/**
 * Standard props for mobile calendar components
 */
export interface MobileCalendarProps extends CalendarViewProps {
  trackedEvents?: TrackedEventRecord[];
  onEventTrack?: (event: Event) => void;
}

// ============================================
// CALLBACK PROPS
// ============================================

/**
 * Standard callback props for event interactions
 */
export interface EventCallbackProps {
  onEventClick?: (event: Event) => void;
  onEventTrack?: (event: Event) => void;
  onEventSelect?: (event: Event) => void;
}

/**
 * Standard callback props for navigation
 */
export interface NavigationCallbackProps {
  onNavigate?: (direction: 'prev' | 'next' | 'today') => void;
  onViewChange?: (view: string) => void;
  onDateChange?: (date: Date) => void;
}

/**
 * Standard callback props for calendar interactions
 */
export interface CalendarCallbackProps {
  onEventClick?: (clickInfo: { event: Event; el: HTMLElement }) => void;
  onRefresh?: () => Promise<void>;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Make all properties optional except specified ones
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make specified properties required
 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;
