import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ClockIcon, UsersIcon, MapPinIcon, ArrowSquareOut } from '@phosphor-icons/react';
import { formatDateTime, getTimeUntilEvent } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { Event, TrackedEventRecord } from '@/types';

interface RecommendationMetadata {
  matchedTags: string[];
  matchExplanation?: string;
  matchScore: number;
  impactScore: number;
  profileBoost: number;
  recencyBoost: number;
  popularityBoost: number;
  totalScore: number;
  reasons: string[];
}

interface EventCardProps {
  event: Event | TrackedEventRecord;
  variant?: 'upcoming' | 'recommended' | 'compact';
  className?: string;
  onClick?: () => void;
}

/**
 * Enhanced event card component with better UX and accessibility
 */
export function EventCard({ event, variant = 'upcoming', className = '', onClick }: EventCardProps) {
  // Handle both Event and TrackedEventRecord types
  const eventData = 'event' in event ? event.event : event;

  if (!eventData) return null;

  const recommendationMetadata = (eventData as Event & { recommendationMetadata?: RecommendationMetadata }).recommendationMetadata;

  const timeInfo = getTimeUntilEvent(eventData.startTime);
  const isUpcoming = timeInfo.days >= 0;
  const isToday = timeInfo.days === 0 && !timeInfo.hasEnded;

  // Compact variant for dashboard list view
  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          "flex items-center justify-between py-4 px-0 border-b border-gray-100 dark:border-gray-700 last:border-b-0",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 rounded-lg",
          "hover:mx-[-1rem] hover:px-4 cursor-pointer group",
          className
        )}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        aria-label={`View details for ${eventData.title}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isToday ? "bg-green-500" : isUpcoming ? "bg-blue-500" : "bg-gray-400"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {eventData.title}
              </h4>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span className="flex items-center">
                  <ClockIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{formatDateTime(eventData.startTime, eventData.timezone)}</span>
                </span>
                <span className="flex items-center">
                  <UsersIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{eventData.organizer}</span>
                </span>
                {eventData.location && (
                  <span className="flex items-center">
                    <MapPinIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{eventData.location}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          <ArrowSquareOut className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    );
  }

  // Enhanced card layout for other variants
  return (
    <Card 
      className={cn(
        "group p-4 rounded-lg border border-gray-100 dark:border-gray-700",
        "hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800",
        "transition-all duration-200 cursor-pointer",
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`View details for ${eventData.title}`}
    >
      <CardContent className="p-0">
        <div className="flex items-start justify-between mb-3">
          <h3 className={cn(
            "font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors",
            variant === 'recommended' ? 'font-medium' : ''
          )}>
            {eventData.title}
          </h3>
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            isToday ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
            isUpcoming ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          )}>
            {isToday ? "Today" : isUpcoming ? `${timeInfo.days}d` : "Past"}
          </div>
        </div>

        {variant === 'recommended' && recommendationMetadata && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-300 font-medium">
              <span>Match Score: {Math.round(recommendationMetadata.totalScore)}</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Skills alignment {Math.round(recommendationMetadata.matchScore)}
              </span>
            </div>
            {recommendationMetadata.matchedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recommendationMetadata.matchedTags.slice(0, 4).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-100 dark:border-blue-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {(recommendationMetadata.reasons[0] || recommendationMetadata.matchExplanation) && (
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                {recommendationMetadata.reasons[0] ?? recommendationMetadata.matchExplanation}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Career impact: {Math.round(recommendationMetadata.impactScore)}</span>
              <span>Profile boost: {Math.round(recommendationMetadata.profileBoost)}</span>
              <span>Timing boost: {Math.round(recommendationMetadata.recencyBoost)}</span>
              <span>Popularity: {Math.round(recommendationMetadata.popularityBoost)}</span>
            </div>
          </div>
        )}
        
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center">
            <ClockIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{formatDateTime(eventData.startTime, eventData.timezone)}</span>
          </div>
          <div className="flex items-center">
            <UsersIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{eventData.organizer}</span>
          </div>
          {eventData.location && (
            <div className="flex items-center">
              <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{eventData.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
