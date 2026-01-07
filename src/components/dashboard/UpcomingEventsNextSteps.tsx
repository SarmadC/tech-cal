'use client';

import React, { useMemo, useState, memo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CalendarPlus, 
  MapPin, 
  Clock, 
  ArrowRight
} from '@phosphor-icons/react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { scoreAttendanceLikelihood, PREDICTION_WEIGHTS, type AttendancePrediction } from '@/utils/predictionUtils';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { EVENT_STATUS } from '@/types/events';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { TrackedEventRecord, Event, EventType } from '@/types';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Dynamically import EventDetailPanel to avoid SSR issues
const EventDetailPanel = dynamic(
  () => import('@/components/calendar/EventDetailPanel'),
  { ssr: false }
);

/**
 * UpcomingEventsNextSteps Component
 * 
 * Performance Optimizations:
 * 1. Memoization: Likelihood scores computed once and cached per event
 * 2. Stable Callbacks: useCallback prevents unnecessary EventRow re-renders
 * 3. Memo'd EventRow: Child component only re-renders when props actually change
 * 4. Pre-computed Data: All expensive calculations done once in useMemo
 * 
 * This ensures clicks and interactions don't trigger full section re-renders.
 */
interface UpcomingEventsNextStepsProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  eventTypes?: EventType[];
  className?: string;
}

// Configuration constants - single source of truth
const CONFIG = {
  maxVisibleEvents: 5,
  urgentThresholdDays: 30,
  soonThresholdDays: 7,
  bookmarkConversionMultiplier: 2,
  // UI dimensions
  locationMaxWidth: 120, // px
  likelihoodBadgeMinWidth: 52, // px
  // Likelihood styling
  likelihood: {
    high: { threshold: 70, label: 'High', color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-400/30' },
    medium: { threshold: 40, label: 'Medium', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-400/30' },
    low: { label: 'Low', color: 'text-white/50', bg: 'bg-white/5', border: 'border-white/10' }
  }
} as const;

// Likelihood Tooltip Component (matching CareerImpactTooltip style)
interface LikelihoodTooltipProps {
  prediction: AttendancePrediction;
  isVisible: boolean;
  position?: { x: number; y: number };
  className?: string;
}

const LikelihoodTooltip = ({ prediction, isVisible, position, className }: LikelihoodTooltipProps) => {
  if (!isVisible || !position) return null;

  const category = {
    label: prediction.level.charAt(0).toUpperCase() + prediction.level.slice(1),
    color: prediction.color // Use the actual color from prediction
  };

  // Convert breakdown to weighted contributions for rendering (using centralized weights)
  const breakdownFactors = [
    { name: 'Event type match', value: Math.round(prediction.breakdown.eventTypeMatch * PREDICTION_WEIGHTS.eventTypeMatch) },
    { name: 'Topic match', value: Math.round(prediction.breakdown.tagMatch * PREDICTION_WEIGHTS.tagMatch) },
    { name: 'Skills alignment', value: Math.round(prediction.breakdown.skillsAlignment * PREDICTION_WEIGHTS.skillsAlignment) },
    { name: 'Past attendance', value: Math.round(prediction.breakdown.pastAttendance * PREDICTION_WEIGHTS.pastAttendance) },
    { name: 'Schedule fit', value: Math.round(prediction.breakdown.scheduleFit * PREDICTION_WEIGHTS.scheduleFit) }
  ];

  return (
    <div 
      className={cn(
        'fixed z-[9999] w-80 p-4 rounded-lg shadow-2xl',
        className
      )}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y - 10}px`,
        transform: 'translate(-50%, -100%)',
        backgroundColor: '#030303',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-white">Attendance Likelihood</h4>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{prediction.score}</span>
          <span className="text-sm text-gray-400">%</span>
        </div>
      </div>

      {/* Category and Confidence */}
      <div className="flex items-center justify-between mb-3 text-sm">
        <span className={cn('px-2 py-1 rounded-md bg-gray-800 text-gray-200', category.color)}>
          {category.label} Likelihood
        </span>
        <span className="text-gray-400">
          Based on your profile
        </span>
      </div>

      {/* Explanation */}
      <div className="mb-3">
        <p className="text-sm text-gray-300">{prediction.explanation}</p>
      </div>

      {/* Factor Breakdown */}
      <div className="space-y-2 mb-3">
        <h5 className="text-sm font-medium text-gray-200">Score Breakdown:</h5>
        {breakdownFactors.map((factor, index) => {
          const rawValues = [
            prediction.breakdown.eventTypeMatch,
            prediction.breakdown.tagMatch,
            prediction.breakdown.skillsAlignment, 
            prediction.breakdown.pastAttendance,
            prediction.breakdown.scheduleFit
          ];
          const rawValue = rawValues[index];
          const weights = [
            PREDICTION_WEIGHTS.eventTypeMatch,
            PREDICTION_WEIGHTS.tagMatch,
            PREDICTION_WEIGHTS.skillsAlignment,
            PREDICTION_WEIGHTS.pastAttendance,
            PREDICTION_WEIGHTS.scheduleFit
          ];
          const weight = weights[index];
          const contribution = Math.round(rawValue * weight);
          
          return (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-300">
                {factor.name}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-12 bg-gray-700 rounded h-1.5">
                  <div 
                    className="h-1.5 rounded bg-blue-400"
                    style={{ width: `${Math.min(contribution, 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-white font-medium">
                  {contribution}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Factors */}
      <div className="mb-3">
        <h5 className="text-sm font-medium text-gray-200 mb-2">Key factors:</h5>
        <ul className="text-sm text-gray-300 space-y-1">
          {prediction.keyFactors.map((factor, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Arrow pointer */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
        <div 
          className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
          style={{ borderTopColor: 'rgba(255, 255, 255, 0.1)' }}
        />
        <div 
          className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent absolute -top-px left-1/2 transform -translate-x-1/2"
          style={{ borderTopColor: '#030303' }}
        />
      </div>
    </div>
  );
};

// Memoized event row component for performance
const EventRow = memo(({ 
  event, 
  tracked: _tracked,
  likelihoodPrediction,
  onClickRow
}: {
  event: Event;
  tracked?: TrackedEventRecord;
  likelihoodPrediction: AttendancePrediction;
  onClickRow: () => void;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | undefined>();
  const eventDate = new Date(event.startTime);
  const daysUntil = differenceInDays(eventDate, new Date());
  const isSoon = daysUntil <= CONFIG.soonThresholdDays;
  
  // Use the prediction object's styling
  const likelihoodStyle = {
    threshold: likelihoodPrediction.score,
    label: likelihoodPrediction.level.charAt(0).toUpperCase() + likelihoodPrediction.level.slice(1),
    color: likelihoodPrediction.color,
    bg: likelihoodPrediction.bgColor,
    border: likelihoodPrediction.level === 'high' ? 'border-emerald-400/30' : 
           likelihoodPrediction.level === 'medium' ? 'border-amber-400/30' : 'border-red-400/30'
  };

  const handleTooltipMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top
    };
    console.log('[UpcomingEventsNextSteps] Tooltip hover:', { position, score: likelihoodPrediction.score });
    setTooltipPosition(position);
    setShowTooltip(true);
  };

  const handleTooltipMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setShowTooltip(false);
  };
  
  return (
    <div
      onClick={onClickRow}
      onKeyDown={(e) => e.key === 'Enter' && onClickRow()}
      role="button"
      tabIndex={0}
      className="group relative flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/30 motion-reduce:transition-none"
      aria-label={`${event.title}, ${format(eventDate, 'MMMM d')}, ${likelihoodPrediction.score}% likelihood`}
    >
      {/* Date Token */}
      <div className="flex-shrink-0 flex items-center">
        <div className="w-11 h-11 glass-card flex flex-col items-center justify-center">
          <span className="text-[9px] font-medium text-white/60 leading-tight">
            {format(eventDate, 'MMM')}
          </span>
          <span className="text-base font-bold text-white/95 leading-none mt-0.5">
            {format(eventDate, 'd')}
          </span>
        </div>
      </div>

      {/* Center: Title + Meta - Baseline aligned */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-baseline gap-2 leading-tight">
          <h4 className="text-sm font-semibold text-white/95 truncate leading-tight">
            {event.title}
          </h4>
          {isSoon && (
            <span className="flex-shrink-0 text-[10px] font-medium text-amber-400">
              Soon
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60 mt-1 leading-tight">
          <div 
            className="flex items-center gap-1" 
            title={formatDistanceToNow(eventDate, { addSuffix: true })}
            aria-label={`${format(eventDate, 'MMMM d, yyyy')} - ${formatDistanceToNow(eventDate, { addSuffix: true })}`}
          >
            <Clock className="w-3 h-3" weight="regular" />
            <span className="truncate">
              in {Math.abs(daysUntil)}d
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

      {/* Right: Likelihood Badge with Tooltip */}
      <div className="flex items-center">
        <div 
          data-likelihood-badge
          className={`flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-medium border text-center cursor-help ${likelihoodStyle.bg} ${likelihoodStyle.color} ${likelihoodStyle.border}`}
          style={{ minWidth: `${CONFIG.likelihoodBadgeMinWidth}px` }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          {likelihoodStyle.label}
        </div>
      </div>
      
      {/* Tooltip - rendered via portal to document body */}
      {typeof document !== 'undefined' && createPortal(
        <LikelihoodTooltip
          prediction={likelihoodPrediction}
          isVisible={showTooltip}
          position={tooltipPosition}
        />,
        document.body
      )}
    </div>
  );
});
EventRow.displayName = 'EventRow';

export function UpcomingEventsNextSteps({ trackedEvents, upcomingEvents, eventTypes = [], className = '' }: UpcomingEventsNextStepsProps) {
  const { trackEvent } = useTrackedEventsUnified();
  const [isConverting, setIsConverting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { showSuccess, showError, showInfo } = useSnackbar();

  // Handle event card click to open EventDetailPanel
  const handleEventClick = useCallback((event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

  // Handle escape key press and body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleModalClose();
      }
    };

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isModalOpen, handleModalClose]);

  // Memoize likelihood predictions per event to prevent expensive re-computations
  const eventLikelihoodMap = useMemo(() => {
    const map = new Map<string, AttendancePrediction>();
    upcomingEvents.forEach(event => {
      const prediction = scoreAttendanceLikelihood(event, trackedEvents);
      map.set(event.id, prediction);
    });
    return map;
  }, [upcomingEvents, trackedEvents]);

  const data = useMemo(() => {
    // Get tracked event IDs
    const trackedIds = new Set(trackedEvents.map(t => t.eventId));

    // Upcoming tracked events sorted by date then by likelihood
    const nextTracked = upcomingEvents
      .filter(event => trackedIds.has(event.id))
      .map(event => ({
        event,
        likelihoodPrediction: eventLikelihoodMap.get(event.id) || { score: 0, level: 'low' as const, color: '', bgColor: '', breakdown: { eventTypeMatch: 0, tagMatch: 0, skillsAlignment: 0, pastAttendance: 0, scheduleFit: 0 }, explanation: '', keyFactors: [] },
        daysUntil: differenceInDays(new Date(event.startTime), new Date())
      }))
      .sort((a, b) => {
        // Sort by days until (urgency first)
        const dateCompare = a.daysUntil - b.daysUntil;
        if (dateCompare !== 0) return dateCompare;
        // Then by likelihood (higher first)
        return b.likelihoodPrediction.score - a.likelihoodPrediction.score;
      })
      .slice(0, CONFIG.maxVisibleEvents)
      .map(item => ({ event: item.event, likelihoodPrediction: item.likelihoodPrediction }));

    // Bookmarks convertible to RSVP
    const upcomingIds = new Set(upcomingEvents.map(e => e.id));
    const convertibleBookmarks = trackedEvents.filter(
      e => e.isBookmarked && upcomingIds.has(e.eventId)
    );

    // Determine next best action
    const registeredCount = trackedEvents.filter(e => e.status === 'attending').length;
    const bookmarkedCount = convertibleBookmarks.length;
    
    let nextBestAction = null;
    if (bookmarkedCount > registeredCount * CONFIG.bookmarkConversionMultiplier && bookmarkedCount > 0) {
      nextBestAction = {
        title: 'Convert Bookmarks to RSVPs',
        description: `${bookmarkedCount} bookmarked event${bookmarkedCount === 1 ? '' : 's'} ready to RSVP`,
        icon: CalendarPlus,
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
      const upcomingSoon = nextTracked.filter(({ event }) => 
        differenceInDays(new Date(event.startTime), new Date()) <= CONFIG.urgentThresholdDays
      ).length;
      nextBestAction = {
        title: 'Review Upcoming Events',
        description: `${upcomingSoon || registeredCount} upcoming event${registeredCount === 1 ? '' : 's'} to prepare for`,
        icon: CalendarPlus,
        action: 'View Events',
        actionFn: () => {
          // Scroll to the upcoming events section
          const eventsSection = document.querySelector('[data-upcoming-events-list]');
          if (eventsSection) {
            eventsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            // Briefly highlight the section
            eventsSection.classList.add('ring-2', 'ring-blue-400/50', 'rounded-lg');
            setTimeout(() => {
              eventsSection.classList.remove('ring-2', 'ring-blue-400/50', 'rounded-lg');
            }, 2000);
          }
          showInfo('Click on an event to view details and take action');
        }
      };
    }

    return { nextTracked, nextBestAction, bookmarkedCount };
  }, [trackedEvents, upcomingEvents, trackEvent, showSuccess, showError, showInfo, eventLikelihoodMap]);

  const eventIdToTracked = useMemo(() => {
    const map = new Map<string, TrackedEventRecord>();
    trackedEvents.forEach(t => map.set(t.eventId, t));
    return map;
  }, [trackedEvents]);

  const handleRowClick = useCallback((event: Event) => {
    // Open EventDetailPanel modal
    handleEventClick(event);
  }, [handleEventClick]);

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
          <p className="text-[10px] font-bold text-white/50 tracking-wider mb-3">
            Next Best Step
            </p>
            <div
            onClick={() => !isConverting && data.nextBestAction?.actionFn()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isConverting) {
                e.preventDefault();
                data.nextBestAction?.actionFn();
              }
            }}
              role="button"
              tabIndex={isConverting ? -1 : 0}
            className={`w-full group relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-4 text-left transition-all hover:border-white/30 hover:from-white/15 hover:to-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:border-blue-400/50 cursor-pointer ${
              isConverting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
              aria-label={`${data.nextBestAction.title}: ${data.nextBestAction.description}`}
              aria-disabled={isConverting}
            >
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm flex-shrink-0">
                  <data.nextBestAction.icon className="w-5 h-5 text-white/95" weight="bold" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white/95 mb-0.5">
                    {data.nextBestAction.title}
                  </p>
                  <p className="text-xs text-white/70 leading-snug">
                    {data.nextBestAction.description}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  data.nextBestAction?.actionFn();
                }}
                disabled={isConverting}
                className="flex-shrink-0 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label={data.nextBestAction.action}
                tabIndex={0}
              >
                {isConverting ? 'Processing…' : data.nextBestAction.action}
              </button>
              </div>
              </div>
          </div>
        )}

      {/* Tracked Events List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-white/50 tracking-wider">
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

        <div className="divide-y divide-white/[0.08]" data-upcoming-events-list>
          {data.nextTracked.length > 0 ? (
            data.nextTracked.map(({ event, likelihoodPrediction }) => {
              const tracked = eventIdToTracked.get(event.id);
              
              return (
                <EventRow
                  key={event.id}
                  event={event}
                  tracked={tracked}
                  likelihoodPrediction={likelihoodPrediction}
                  onClickRow={() => handleRowClick(event)}
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

      {/* EventDetailPanel Modal */}
      {isModalOpen && selectedEvent && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in-0 duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 dark:bg-black/70 light:bg-black/50 backdrop-blur-lg transition-opacity duration-300"
            onClick={handleModalClose}
            aria-hidden="true"
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl max-h-[90vh] animate-in zoom-in-95 fade-in-0 duration-300 ease-out drop-shadow-2xl">
            <EventDetailPanel
              event={selectedEvent}
              onClose={handleModalClose}
              categories={eventTypes}
              variant="modal"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
