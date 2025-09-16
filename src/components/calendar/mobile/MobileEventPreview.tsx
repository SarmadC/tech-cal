'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Event, EventStatus, isTrackedEvent, TrackedEvent, MultiDayEventInstance, EventType } from '@/types';
import { useEventTracking } from '@/hooks/useEventTracking';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isEventLive, formatTime, formatDate, getEventDuration } from '@/utils/dateUtils';
import { CalendarPlusIcon, ShareNetworkIcon } from '@phosphor-icons/react';
import { useEventActions } from '@/hooks/useEventActions';
import MobileEventDetailPanel from './MobileEventDetailPanel';

interface MobileEventPreviewProps {
  event: Event | TrackedEvent | MultiDayEventInstance;
  isVisible: boolean;
  onClose: () => void;
  onTrackEvent?: (event: Event) => void;
  categories?: EventType[];
}

const MobileEventPreview: React.FC<MobileEventPreviewProps> = ({
  event,
  isVisible,
  onClose,
  onTrackEvent,
  categories = []
}) => {
  const { user } = useAuth();
  const { trackEvent, untrackEvent, isLoading } = useEventTracking();
  const { handleShare, googleCalendarLink } = useEventActions(event);
  const previewRef = useRef<HTMLDivElement>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // Use the tracking status directly from the event prop
  const isTracked = isTrackedEvent(event) ? event.isTracked : false;

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsidePreview = previewRef.current && previewRef.current.contains(target);
      const isInsideDetailPanel = target && (target as Element).closest('.mobile-event-detail-panel');
      
      if (!isInsidePreview && !isInsideDetailPanel) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible, onClose]);

  const isVirtual = event.livestreamUrl || event.location?.toLowerCase().includes('virtual');

  // Actions
  const handleTrackEvent = () => {
    if (!user) {
      toast.error('Please sign in to track events');
      return;
    }

    // Use originalEventId for multi-day event instances, otherwise use the regular id
    const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;

    if (isTracked) {
      untrackEvent({ eventId: trackingEventId });
    } else {
      trackEvent({
        eventId: trackingEventId,
        status: 'bookmarked' as EventStatus,
      });
    }

    // Notify parent component
    onTrackEvent?.(event);
  };


  const handleJoinEvent = () => {
    if (event.livestreamUrl) {
      window.open(event.livestreamUrl, '_blank');
    } else if (event.sourceUrl) {
      window.open(event.sourceUrl, '_blank');
    }
  };

  const handleViewDetails = () => {
    setShowDetailPanel(true);
  };

  const handleCloseDetailPanel = () => {
    setShowDetailPanel(false);
  };

  if (!isVisible) return null;

  return (
    <div className="mobile-event-preview-overlay">
      <div 
        ref={previewRef}
        className="mobile-event-preview-container"
      >
        {/* Header */}
        <div className="mobile-event-preview-header">
          <div className="mobile-event-preview-tags">
            {event.tags && event.tags.length > 0 ? (
              event.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="secondary" className="mobile-event-tag">
                  {tag.name}
                </Badge>
              ))
            ) : (
              event.eventTypeId && (
                <Badge variant="secondary" className="mobile-event-tag">
                  Event
                </Badge>
              )
            )}
            {event.tags && event.tags.length > 2 && (
              <Badge variant="outline" className="mobile-event-tag">
                +{event.tags.length - 2}
              </Badge>
            )}
            {isEventLive(event.startTime, event.endTime) && (
              <Badge variant="destructive" className="mobile-event-tag mobile-live-badge">
                <div className="mobile-live-indicator" />
                Live
              </Badge>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="mobile-event-preview-close"
            aria-label="Close event preview"
          >
            <MaterialIcon name="close" size={24} />
          </button>
        </div>

        {/* Title */}
        <div className="mobile-event-preview-title">
          <h2 className="mobile-event-title">{event.title}</h2>
        </div>

        {/* Event Details */}
        <div className="mobile-event-preview-details">
          <div className="mobile-event-detail">
            <MaterialIcon name="time" size={20} />
            <span>{formatDate(event.startTime, event.timezone)} • {formatTime(event.startTime, event.timezone)}</span>
          </div>
          
          <div className="mobile-event-detail">
            <MaterialIcon name={isVirtual ? "wifi" : "location"} size={20} />
            <span>{isVirtual ? 'Virtual Event' : (event.location || 'Location TBA')}</span>
          </div>
          
          <div className="mobile-event-detail">
            <MaterialIcon name="people" size={20} />
            <span>{event.organizer}</span>
          </div>
          
          <div className="mobile-event-detail">
            <MaterialIcon name="calendar" size={20} />
            <span>{getEventDuration(event.startTime, event.endTime)}</span>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="mobile-event-preview-description">
            <p className="mobile-event-description">{event.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mobile-event-preview-actions">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Button
              onClick={handleTrackEvent}
              disabled={isLoading}
              variant={isTracked ? "default" : "outline"}
              className="mobile-track-button"
            >
              <MaterialIcon name={isTracked ? "star" : "star"} size={16} />
              <span>{isTracked ? 'Tracked' : 'Track Event'}</span>
            </Button>
            
            <Button
              onClick={handleViewDetails}
              variant="outline"
              className="mobile-details-button"
            >
              <MaterialIcon name="info" size={16} />
              <span>Details</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <Button
              onClick={handleShare}
              variant="outline"
              className="mobile-share-button"
            >
              <ShareNetworkIcon className="w-4 h-4" />
              <span>Share</span>
            </Button>
            
            <a
              href={googleCalendarLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-calendar-button"
            >
              <CalendarPlusIcon className="w-4 h-4" />
              <span>Add to Calendar</span>
            </a>
          </div>
          
          {(event.livestreamUrl || event.sourceUrl) && (
            <Button
              onClick={handleJoinEvent}
              variant="default"
              className="mobile-join-button w-full"
            >
              <MaterialIcon name="arrow-forward" size={16} />
              <span>{event.livestreamUrl ? 'Join Live' : 'View Event'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Event Detail Panel */}
      {showDetailPanel && (
        <MobileEventDetailPanel
          event={event}
          onClose={handleCloseDetailPanel}
          categories={categories}
        />
      )}
    </div>
  );
};

export default MobileEventPreview;
