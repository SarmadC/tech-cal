'use client';

import React, { useRef, useEffect } from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Event, EventStatus, isTrackedEvent, TrackedEvent, MultiDayEventInstance } from '@/types';
import { useEventTracking } from '@/hooks/useEventTracking';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isEventLive, formatTime, formatDate, getEventDuration } from '@/utils/dateUtils';

interface MobileEventPreviewProps {
  event: Event | TrackedEvent | MultiDayEventInstance;
  isVisible: boolean;
  onClose: () => void;
  onTrackEvent?: (event: Event) => void;
}

const MobileEventPreview: React.FC<MobileEventPreviewProps> = ({
  event,
  isVisible,
  onClose,
  onTrackEvent
}) => {
  const { user } = useAuth();
  const { trackEvent, untrackEvent, isLoading } = useEventTracking();
  const previewRef = useRef<HTMLDivElement>(null);

  // Use the tracking status directly from the event prop
  const isTracked = isTrackedEvent(event) ? event.isTracked : false;

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
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

  const handleShare = async () => {
    const shareUrl = event.sourceUrl || window.location.href;

    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out this tech event: ${event.title}`,
          url: shareUrl
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    await navigator.clipboard.writeText(shareUrl);
    toast.success('Event link copied to clipboard');
  };

  const handleJoinEvent = () => {
    if (event.livestreamUrl) {
      window.open(event.livestreamUrl, '_blank');
    } else if (event.sourceUrl) {
      window.open(event.sourceUrl, '_blank');
    }
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
            onClick={handleShare}
            variant="outline"
            className="mobile-share-button"
          >
            <MaterialIcon name="arrow-forward" size={16} />
            <span>Share</span>
          </Button>
          
          {(event.livestreamUrl || event.sourceUrl) && (
            <Button
              onClick={handleJoinEvent}
              variant="default"
              className="mobile-join-button"
            >
              <MaterialIcon name="arrow-forward" size={16} />
              <span>{event.livestreamUrl ? 'Join Live' : 'View Details'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileEventPreview;
