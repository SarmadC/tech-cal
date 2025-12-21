'use client';

import { useMemo, useCallback } from 'react';
import { useEventEngagement } from './useEventEngagement';
import { useLocalStorage } from './useLocalStorage';
import { TrackedEventRecord } from '@/types';

interface SnoozeEntry {
  eventId: string;
  snoozedAt: number; // timestamp
}

interface UsePastEventAttendancePromptOptions {
  /** Maximum number of events to prompt about at once */
  maxPrompts?: number;
  /** Snooze duration in milliseconds (default: 24 hours) */
  snoozeDurationMs?: number;
}

interface UsePastEventAttendancePromptReturn {
  /** Events that need attendance confirmation */
  pendingEvents: TrackedEventRecord[];
  /** Snooze an event (ask later) */
  snoozeEvent: (eventId: string) => void;
  /** Mark event as attended */
  markAttended: (eventId: string) => Promise<void>;
  /** Mark event as not attended (cancelled) */
  markNotAttended: (eventId: string) => Promise<void>;
  /** Check if there are any pending prompts */
  hasPendingPrompts: boolean;
  /** Loading state */
  isLoading: boolean;
}

const SNOOZE_STORAGE_KEY = 'past-event-attendance-snooze';
const DEFAULT_MAX_PROMPTS = 2;
const DEFAULT_SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook to manage prompts for past bookmarked events that need attendance confirmation.
 * 
 * Filters events where:
 * - isBookmarked === true
 * - endTime (or startTime if no endTime) is in the past
 * - status === null (no attendance status set yet)
 * - Not currently snoozed
 */
export function usePastEventAttendancePrompt(
  options: UsePastEventAttendancePromptOptions = {}
): UsePastEventAttendancePromptReturn {
  const {
    maxPrompts = DEFAULT_MAX_PROMPTS,
    snoozeDurationMs = DEFAULT_SNOOZE_DURATION_MS
  } = options;

  const {
    trackedEvents,
    setAttendanceStatus,
    isLoading
  } = useEventEngagement();

  const [snoozedEvents, setSnoozedEvents] = useLocalStorage<SnoozeEntry[]>(
    SNOOZE_STORAGE_KEY,
    []
  );

  // Filter out expired snoozes
  const activeSnoozes = useMemo(() => {
    const now = Date.now();
    return snoozedEvents.filter(
      (entry) => now - entry.snoozedAt < snoozeDurationMs
    );
  }, [snoozedEvents, snoozeDurationMs]);

  // Set of actively snoozed event IDs for O(1) lookup
  const snoozedEventIds = useMemo(() => {
    return new Set(activeSnoozes.map((entry) => entry.eventId));
  }, [activeSnoozes]);

  // Filter events that need attendance confirmation
  const pendingEvents = useMemo(() => {
    const now = new Date();
    
    const eligibleEvents = trackedEvents.filter((record) => {
      // Must be bookmarked
      if (!record.isBookmarked) return false;
      
      // Must not have an attendance status yet
      if (record.status !== null) return false;
      
      // Must not be snoozed
      if (snoozedEventIds.has(record.eventId)) return false;
      
      // Must have passed (use endTime if available, otherwise startTime)
      const event = record.event;
      if (!event) return false;
      
      const eventEndTime = event.endTime 
        ? new Date(event.endTime) 
        : new Date(event.startTime);
      
      return eventEndTime < now;
    });

    // Sort by most recent first (events that just passed should be prompted first)
    eligibleEvents.sort((a, b) => {
      const aTime = a.event?.endTime || a.event?.startTime || '';
      const bTime = b.event?.endTime || b.event?.startTime || '';
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    // Limit to maxPrompts
    return eligibleEvents.slice(0, maxPrompts);
  }, [trackedEvents, snoozedEventIds, maxPrompts]);

  // Snooze an event
  const snoozeEvent = useCallback((eventId: string) => {
    setSnoozedEvents((prev) => {
      // Remove any existing entry for this event
      const filtered = prev.filter((entry) => entry.eventId !== eventId);
      // Add new snooze entry
      return [...filtered, { eventId, snoozedAt: Date.now() }];
    });
  }, [setSnoozedEvents]);

  // Mark event as attended
  const markAttended = useCallback(async (eventId: string) => {
    await setAttendanceStatus(eventId, 'attended');
  }, [setAttendanceStatus]);

  // Mark event as not attended (cancelled)
  const markNotAttended = useCallback(async (eventId: string) => {
    await setAttendanceStatus(eventId, 'cancelled');
  }, [setAttendanceStatus]);

  return {
    pendingEvents,
    snoozeEvent,
    markAttended,
    markNotAttended,
    hasPendingPrompts: pendingEvents.length > 0,
    isLoading
  };
}
