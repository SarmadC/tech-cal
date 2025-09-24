'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Event, TrackedEvent, MultiDayEventInstance, EventType } from '@/types';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isEventLive, formatTime, formatDate, getEventDuration } from '@/utils/dateUtils';
import { getEventStatus } from '@/utils/eventStatusUtils';
import { CalendarPlusIcon, ShareNetworkIcon, Info, Star, ArrowDown, X, Clock, MapPin, WifiHigh, Users, Calendar } from '@phosphor-icons/react';
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
    const { trackEvent, untrackEvent, isLoading } = useTrackedEventsUnified();
  const { handleShare: originalHandleShare, googleCalendarLink, handleIcsDownload } = useEventActions(event);
  const previewRef = useRef<HTMLDivElement>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Use the tracking status from our utility function
  const { isTracked } = getEventStatus(event);

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
  const handleTrackEvent = async () => {
    if (!user) {
      toast.error('Please sign in to track events');
      return;
    }

    // Use originalEventId for multi-day event instances, otherwise use the regular id
    const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;

    if (isTracked) {
      await untrackEvent(trackingEventId);
    } else {
      await trackEvent(trackingEventId);
    }

    // Notify parent component
    onTrackEvent?.(event);
  };



  const handleViewDetails = () => {
    setShowDetailPanel(true);
  };

  const handleCloseDetailPanel = () => {
    setShowDetailPanel(false);
  };

  // Enhanced share function with multiple options
  const handleShare = () => {
    setShowShareMenu(true);
  };

  const handleWebShare = async () => {
    const shareData = {
      title: event.title,
      text: `Check out this event: ${event.title}${event.description ? `\n\n${event.description}` : ''}`,
      url: `${window.location.origin}/events/${event.id}`
    };

    // Check if Web Share API is supported (mobile devices)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShowShareMenu(false);
      } catch (error) {
        // User cancelled sharing or error occurred
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          // Fallback to copy link
          originalHandleShare();
          setShowShareMenu(false);
        }
      }
    } else {
      // Fallback for desktop or unsupported browsers
      originalHandleShare();
      setShowShareMenu(false);
    }
  };

  const handleAddToGoogleCalendar = () => {
    window.open(googleCalendarLink, '_blank');
    setShowShareMenu(false);
  };

  const handleDownloadIcs = () => {
    handleIcsDownload();
    setShowShareMenu(false);
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
            <X size={24} />
          </button>
        </div>

        {/* Title */}
        <div className="mobile-event-preview-title">
          <h2 className="mobile-event-title">{event.title}</h2>
        </div>

        {/* Event Details */}
        <div className="mobile-event-preview-details">
          <div className="mobile-event-detail">
            <Clock size={20} />
            <span>{formatDate(event.startTime, event.timezone)} • {formatTime(event.startTime, event.timezone)}</span>
          </div>
          
          <div className="mobile-event-detail">
            {isVirtual ? <WifiHigh size={20} /> : <MapPin size={20} />}
            <span>{isVirtual ? 'Virtual Event' : (event.location || 'Location TBA')}</span>
          </div>
          
          <div className="mobile-event-detail">
            <Users size={20} />
            <span>{event.organizer}</span>
          </div>
          
          <div className="mobile-event-detail">
            <Calendar size={20} />
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
          {/* Single Row Button Layout - Optimized Order */}
          <div className="flex gap-3 justify-between">
            {/* Primary CTA - Favorite (first position for prominence) */}
            <Button
              onClick={handleTrackEvent}
              disabled={isLoading}
              variant="default"
              className="mobile-track-button mobile-icon-only-row mobile-favorite-cta"
              title={isTracked ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Star size={18} weight={isTracked ? "fill" : "regular"} />
            </Button>

            <Button
              onClick={() => window.open(googleCalendarLink, '_blank')}
              variant="outline"
              className="mobile-calendar-button mobile-icon-only-row"
              title="Add to Calendar"
            >
              <CalendarPlusIcon size={16} />
            </Button>
            
            <Button
              onClick={handleShare}
              variant="outline"
              className="mobile-share-button mobile-icon-only-row"
              title="Share & Export"
            >
              <ShareNetworkIcon size={16} />
            </Button>

            <Button
              onClick={handleViewDetails}
              variant="outline"
              className="mobile-details-button mobile-icon-only-row"
              title="View Details"
            >
              <Info size={18} />
            </Button>
          </div>

          {/* Share Menu */}
          {showShareMenu && (
            <div className="mobile-share-menu-overlay" onClick={() => setShowShareMenu(false)}>
              <div className="mobile-share-menu" onClick={(e) => e.stopPropagation()}>
                <div className="mobile-share-menu-header">
                  <h3>Share & Export</h3>
                  <Button
                    onClick={() => setShowShareMenu(false)}
                    variant="ghost"
                    className="mobile-share-menu-close"
                  >
                    <X size={20} />
                  </Button>
                </div>
                
                <div className="mobile-share-menu-options">
                  <Button
                    onClick={handleWebShare}
                    variant="outline"
                    className="mobile-share-menu-option"
                  >
                    <ShareNetworkIcon size={20} />
                    <span>Share Event</span>
                  </Button>
                  
                  <Button
                    onClick={handleAddToGoogleCalendar}
                    variant="outline"
                    className="mobile-share-menu-option"
                  >
                    <CalendarPlusIcon size={20} />
                    <span>Add to Google Calendar</span>
                  </Button>
                  
                  <Button
                    onClick={handleDownloadIcs}
                    variant="outline"
                    className="mobile-share-menu-option"
                  >
                    <ArrowDown size={20} />
                    <span>Download .ics File</span>
                  </Button>
                </div>
              </div>
            </div>
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
