'use client';

import React, { useMemo, useState, memo } from 'react';
import { 
  CalendarPlus, 
  Bell, 
  MapPin, 
  Clock, 
  ArrowRight, 
  DotsThree,
  ArrowSquareOut,
  ShareNetwork
} from '@phosphor-icons/react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { scoreAttendanceLikelihood } from '@/utils/predictionUtils';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { EVENT_STATUS } from '@/types/events';
import { generateICS, downloadICS } from '@/utils/calendarUtils';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { TrackedEventRecord, Event } from '@/types';

interface UpcomingEventsNextStepsProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  className?: string;
}

// Configuration constants - single source of truth
const CONFIG = {
  maxVisibleEvents: 5,
  reminderMinutesBefore: 15,
  urgentThresholdDays: 30,
  soonThresholdDays: 7,
  bookmarkConversionMultiplier: 2,
  maxTimeoutMs: 2 ** 31 - 1,
  defaultEventName: 'event',
  notificationIcon: '/favicon.svg',
  prepTasksTotal: 3,
  // UI dimensions
  locationMaxWidth: 120, // px
  likelihoodBadgeMinWidth: 52, // px
  // Toast message truncation
  toastTitleMaxLength: 30,
  toastReminderMaxLength: 25,
  // Likelihood styling
  likelihood: {
    high: { threshold: 70, label: 'High', color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-400/30' },
    medium: { threshold: 40, label: 'Medium', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-400/30' },
    low: { label: 'Low', color: 'text-white/50', bg: 'bg-white/5', border: 'border-white/10' }
  }
} as const;

// Overflow menu action config
const OVERFLOW_ACTIONS = [
  { 
    key: 'open-site', 
    label: 'Open Site', 
    icon: ArrowSquareOut, 
    action: (event: Event) => window.open(event.sourceUrl, '_blank') 
  },
  { 
    key: 'share', 
    label: 'Share', 
    icon: ShareNetwork, 
    action: (event: Event) => navigator.clipboard.writeText(event.sourceUrl) 
  }
] as const;

// Memoized event row component for performance
const EventRow = memo(({ 
  event, 
  tracked: _tracked,
  likelihoodScore,
  prepState,
  onToggleCalendar,
  onToggleReminder,
  onClickRow,
  isLoading
}: {
  event: Event;
  tracked?: TrackedEventRecord;
  likelihoodScore: number;
  prepState: { calendar: boolean; reminder: boolean; tasks: number; completedTasks: number };
  onToggleCalendar: () => void;
  onToggleReminder: () => void;
  onClickRow: () => void;
  isLoading: boolean;
}) => {
  const [showOverflow, setShowOverflow] = useState(false);
  const eventDate = new Date(event.startTime);
  const daysUntil = differenceInDays(eventDate, new Date());
  const isSoon = daysUntil <= CONFIG.soonThresholdDays;
  
  // Likelihood color mapping (inverted - higher is better, uses centralized config)
  const getLikelihoodStyle = (score: number) => {
    if (score >= CONFIG.likelihood.high.threshold) return CONFIG.likelihood.high;
    if (score >= CONFIG.likelihood.medium.threshold) return CONFIG.likelihood.medium;
    return CONFIG.likelihood.low;
  };
  
  const likelihoodStyle = getLikelihoodStyle(likelihoodScore);
  
  return (
    <div
      onClick={onClickRow}
      onKeyDown={(e) => e.key === 'Enter' && onClickRow()}
      role="button"
      tabIndex={0}
      className="group relative flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/30 motion-reduce:transition-none"
      aria-label={`${event.title}, ${format(eventDate, 'MMMM d')}, ${likelihoodScore}% likelihood`}
    >
      {/* Date Token */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 glass-card flex flex-col items-center justify-center">
          <span className="text-[10px] font-medium text-white/60 uppercase">
            {format(eventDate, 'MMM')}
          </span>
          <span className="text-base font-bold text-white/95 leading-none">
            {format(eventDate, 'd')}
          </span>
        </div>
      </div>

      {/* Center: Title + Meta (Single Line) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <h4 className="text-sm font-semibold text-white/95 truncate">
            {event.title}
          </h4>
          {isSoon && (
            <span className="flex-shrink-0 text-[10px] font-medium text-amber-400">
              Soon
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <div 
            className="flex items-center gap-1" 
            title={formatDistanceToNow(eventDate, { addSuffix: true })}
            aria-label={`${format(eventDate, 'MMMM d, yyyy')} - ${formatDistanceToNow(eventDate, { addSuffix: true })}`}
          >
            <Clock className="w-3 h-3" weight="regular" />
            <span className="truncate">
              {format(eventDate, 'MMM d')} · in {Math.abs(daysUntil)}d
            </span>
          </div>
          {event.location && (
            <>
              <span className="text-white/30">·</span>
              <div className="flex items-center gap-1 min-w-0" title={event.location}>
                <MapPin className="w-3 h-3 flex-shrink-0" weight="regular" />
                <span className="truncate" style={{ maxWidth: `${CONFIG.locationMaxWidth}px` }}>{event.location}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions + Likelihood */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Prep Status Micro-badge - Aligned with icon row */}
        {prepState.tasks > 0 && (
          <div 
            className="px-1.5 py-1 rounded text-[10px] font-medium bg-white/10 text-white/70 mr-1"
            title={`${prepState.completedTasks} of ${prepState.tasks} preparation tasks completed`}
            aria-label={`${prepState.completedTasks} of ${prepState.tasks} preparation tasks completed`}
          >
            {prepState.completedTasks}/{prepState.tasks}
          </div>
        )}

        {/* Inline Toggle: Calendar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCalendar();
          }}
          disabled={isLoading}
          className={`p-2 rounded-lg transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed ${
            prepState.calendar 
              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'
          }`}
          title={prepState.calendar ? 'Added to calendar - Click to remove' : 'Add event to your calendar'}
          aria-label={prepState.calendar ? 'Remove from calendar' : 'Add to calendar'}
        >
          <CalendarPlus className="w-4 h-4" weight={prepState.calendar ? 'fill' : 'regular'} />
        </button>

        {/* Inline Toggle: Reminder */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleReminder();
          }}
          disabled={isLoading}
          className={`p-2 rounded-lg transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed ${
            prepState.reminder 
              ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'
          }`}
          title={prepState.reminder ? 'Reminder set - Click to remove' : 'Set reminder 15 minutes before event'}
          aria-label={prepState.reminder ? 'Remove reminder' : 'Set reminder for 15 minutes before event starts'}
        >
          <Bell className="w-4 h-4" weight={prepState.reminder ? 'fill' : 'regular'} />
        </button>

        {/* Likelihood Badge */}
        <div 
          className={`px-2 py-1 rounded-full text-[10px] font-medium border text-center ${likelihoodStyle.bg} ${likelihoodStyle.color} ${likelihoodStyle.border}`}
          style={{ minWidth: `${CONFIG.likelihoodBadgeMinWidth}px` }}
          title={`${likelihoodScore}% attendance likelihood`}
        >
          {likelihoodStyle.label}
        </div>

        {/* Overflow Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOverflow(!showOverflow);
            }}
            className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90 transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="More actions"
          >
            <DotsThree className="w-4 h-4" weight="bold" />
          </button>
          
          {showOverflow && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowOverflow(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-40 glass-card border border-white/20 rounded-lg shadow-xl z-50 overflow-hidden">
                {OVERFLOW_ACTIONS.map(({ key, label, icon: Icon, action }) => (
                  <button
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation();
                      action(event);
                      setShowOverflow(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" weight="regular" />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
EventRow.displayName = 'EventRow';

export function UpcomingEventsNextSteps({ trackedEvents, upcomingEvents, className = '' }: UpcomingEventsNextStepsProps) {
  const [prepState, setPrepState] = useState<Record<string, { calendar: boolean; reminder: boolean }>>({});
  const { trackEvent } = useTrackedEventsUnified();
  const [isConverting, setIsConverting] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { showSuccess, showError, showInfo } = useSnackbar();

  // Helper to truncate text for toast messages (DRY)
  const truncateForToast = (text: string, maxLength: number) => 
    text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  const data = useMemo(() => {
    // Get tracked event IDs
    const trackedIds = new Set(trackedEvents.map(t => t.eventId));

    // Upcoming tracked events sorted by date then by likelihood
    const nextTracked = upcomingEvents
      .filter(event => trackedIds.has(event.id))
      .map(event => ({
        event,
        likelihood: scoreAttendanceLikelihood(event, trackedEvents),
        daysUntil: differenceInDays(new Date(event.startTime), new Date())
      }))
      .sort((a, b) => {
        // Sort by days until (urgency first)
        const dateCompare = a.daysUntil - b.daysUntil;
        if (dateCompare !== 0) return dateCompare;
        // Then by likelihood (higher first)
        return b.likelihood.score - a.likelihood.score;
      })
      .slice(0, CONFIG.maxVisibleEvents)
      .map(item => item.event);

    // Bookmarks convertible to RSVP
    const upcomingIds = new Set(upcomingEvents.map(e => e.id));
    const convertibleBookmarks = trackedEvents.filter(
      e => e.status === 'bookmarked' && upcomingIds.has(e.eventId)
    );

    // Determine next best action
    const registeredCount = trackedEvents.filter(e => e.status === 'attending').length;
    const bookmarkedCount = convertibleBookmarks.length;
    
    let nextBestAction = null;
    if (bookmarkedCount > registeredCount * CONFIG.bookmarkConversionMultiplier && bookmarkedCount > 0) {
      nextBestAction = {
        title: 'Convert Bookmarks to RSVPs',
        description: `${bookmarkedCount} bookmarked event${bookmarkedCount === 1 ? '' : 's'} ready to RSVP`,
        icon: Bell,
        action: 'Convert Now',
        actionFn: async () => {
          setIsConverting(true);
          try {
            await Promise.all(
              convertibleBookmarks.map(b => trackEvent(b.eventId, EVENT_STATUS.ATTENDING))
            );
            showSuccess(`${bookmarkedCount} event${bookmarkedCount === 1 ? '' : 's'} converted to RSVP`);
          } catch {
            showError('Failed to convert bookmarks');
          } finally {
            setIsConverting(false);
          }
        }
      };
    } else if (registeredCount > 0) {
      const upcomingSoon = nextTracked.filter(e => 
        differenceInDays(new Date(e.startTime), new Date()) <= CONFIG.urgentThresholdDays
      ).length;
      nextBestAction = {
        title: 'Set Prep Checklist',
        description: `Add reminders, travel, and materials for ${upcomingSoon || registeredCount} upcoming event${registeredCount === 1 ? '' : 's'}`,
        icon: CalendarPlus,
        action: 'Prepare Now',
        actionFn: () => {
          showInfo('Scroll down to add calendar events and reminders');
        }
      };
    }

    return { nextTracked, nextBestAction, bookmarkedCount };
  }, [trackedEvents, upcomingEvents, trackEvent, showSuccess, showError, showInfo]);

  const eventIdToTracked = useMemo(() => {
    const map = new Map<string, TrackedEventRecord>();
    trackedEvents.forEach(t => map.set(t.eventId, t));
    return map;
  }, [trackedEvents]);

  // Consolidated toggle handler (DRY principle)
  const handleToggle = (
    eventId: string,
    event: Event,
    type: 'calendar' | 'reminder'
  ) => {
    const current = prepState[eventId]?.[type] || false;
    const otherType = type === 'calendar' ? 'reminder' : 'calendar';
    
    if (!current) {
      setLoadingStates(prev => ({ ...prev, [eventId]: true }));
      try {
        if (type === 'calendar') {
          const ics = generateICS(event);
          downloadICS(`${event.title || CONFIG.defaultEventName}.ics`, ics);
          setPrepState(prev => ({
            ...prev,
            [eventId]: { ...prev[eventId], [type]: true, [otherType]: prev[eventId]?.[otherType] || false }
          }));
          showSuccess(`✓ ${truncateForToast(event.title, CONFIG.toastTitleMaxLength)} added to calendar`);
        } else {
          const start = new Date(event.startTime).getTime();
          const fireAt = start - CONFIG.reminderMinutesBefore * 60 * 1000;
          const now = Date.now();
          
          if (fireAt > now) {
            const timeoutMs = Math.min(fireAt - now, CONFIG.maxTimeoutMs);
            window.setTimeout(() => {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`Reminder: ${event.title}`, {
                  body: `Starts in ${CONFIG.reminderMinutesBefore} minutes`,
                  icon: CONFIG.notificationIcon
                });
              }
            }, timeoutMs);
            
            setPrepState(prev => ({
              ...prev,
              [eventId]: { ...prev[eventId], [type]: true, [otherType]: prev[eventId]?.[otherType] || false }
            }));
            showSuccess(`✓ Reminder set for ${CONFIG.reminderMinutesBefore} min before ${truncateForToast(event.title, CONFIG.toastReminderMaxLength)}`);
          } else {
            showInfo('Event is too soon to schedule a reminder');
          }
        }
      } catch {
        showError(`Failed to ${type === 'calendar' ? 'create calendar file' : 'schedule reminder'}`);
      } finally {
        setLoadingStates(prev => ({ ...prev, [eventId]: false }));
      }
    } else {
      setPrepState(prev => ({
        ...prev,
        [eventId]: { ...prev[eventId], [type]: false }
      }));
      showInfo(type === 'calendar' ? 'Removed from calendar' : 'Reminder removed');
    }
  };

  const handleRowClick = (event: Event) => {
    // Navigate to event detail page
    window.location.href = `/events/${event.id}`;
  };

  return (
    <div className={`glass-card glass-glow p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-white/95 mb-1">
              Next Steps
            </h3>
        <p className="text-xs text-white/60">
          {data.nextTracked.length} {data.nextTracked.length === 1 ? 'tracked event' : 'tracked events'}
            </p>
          </div>

      {/* Next Best Action - Elevated with Accent */}
        {data.nextBestAction && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-3">
            Next Best Step
            </p>
            <button
            onClick={() => data.nextBestAction?.actionFn()}
              disabled={isConverting}
            className="w-full group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-4 text-left transition-all hover:border-white/30 hover:from-white/15 hover:to-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm">
                  <data.nextBestAction.icon className="w-5 h-5 text-white/95" weight="bold" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/95 mb-0.5">
                    {data.nextBestAction.title}
                  </p>
                  <p className="text-xs text-white/70 leading-snug">
                    {data.nextBestAction.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80 group-hover:text-white/95 transition-colors">
                <span>{isConverting ? 'Processing…' : data.nextBestAction.action}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" weight="bold" />
              </div>
              </div>
            </button>
          </div>
        )}

      {/* Tracked Events List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
            Upcoming Events
          </p>
          {data.nextTracked.length >= CONFIG.maxVisibleEvents && (
              <button
              onClick={() => window.location.href = '/calendar'}
              className="text-[10px] font-medium text-white/60 hover:text-white/90 transition-colors"
            >
              Show All
              </button>
          )}
        </div>

        <div className="space-y-2">
          {data.nextTracked.length > 0 ? (
            data.nextTracked.map((event) => {
              const likelihood = scoreAttendanceLikelihood(event, trackedEvents);
              const tracked = eventIdToTracked.get(event.id);
              const eventPrep = prepState[event.id] || { calendar: false, reminder: false };
              
              // Mock prep tasks (in production, fetch from backend)
              const prepTasks = {
                tasks: CONFIG.prepTasksTotal,
                completedTasks: (eventPrep.calendar ? 1 : 0) + (eventPrep.reminder ? 1 : 0)
              };
              
              return (
                <EventRow
                  key={event.id}
                  event={event}
                  tracked={tracked}
                  likelihoodScore={likelihood.score}
                  prepState={{ ...eventPrep, ...prepTasks }}
                  onToggleCalendar={() => handleToggle(event.id, event, 'calendar')}
                  onToggleReminder={() => handleToggle(event.id, event, 'reminder')}
                  onClickRow={() => handleRowClick(event)}
                  isLoading={loadingStates[event.id] || false}
                />
              );
            })
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-xl bg-white/5 mb-4">
                <CalendarPlus className="w-8 h-8 text-white/40" weight="regular" />
              </div>
              <p className="text-sm font-medium text-white/70 mb-1">
                No Tracked Events Yet
              </p>
              <p className="text-xs text-white/50 mb-4 max-w-[240px] mx-auto">
                Start exploring events and bookmark or RSVP to see them here
              </p>
              <button
                onClick={() => window.location.href = '/discover'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white/90 transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Explore Events
                <ArrowRight className="w-3.5 h-3.5" weight="bold" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
