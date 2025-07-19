// src/components/EventModal.tsx (Phase 1.1 - Better Error Handling)

'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatToUTC } from '@/lib/calendarUtils';
import { ModalCountdown } from './CountdownTimer';
import { ModalHappeningNow, hasHappeningNowStatus } from './HappeningNowIndicator';
import { useUserId } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

type Event = {
  id: string;
  title: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  organizer: string | null;
  location: string | null;
  status: string | null;
  source_url: string | null;
  livestream_url: string | null;
  event_type_id?: string | null;
  color?: string;
};

interface EventModalProps {
  event: Event;
  onClose: () => void;
  onEventTracked?: () => void;
}

// Error types for better UX
type ErrorType = 'network' | 'auth' | 'rateLimit' | 'unknown';

interface ErrorState {
  type: ErrorType;
  message: string;
  action?: string;
  retryable: boolean;
}

export default function EventModal({ event, onClose, onEventTracked }: EventModalProps) {
  const userId = useUserId();
  const [isTracking, setIsTracking] = useState(false);
  const [isTracked, setIsTracked] = useState(false);
  const [showCopiedBanner, setShowCopiedBanner] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [lastTrackingAttempt, setLastTrackingAttempt] = useState<number>(0);

  // Rate limiting: prevent rapid clicks
  const RATE_LIMIT_MS = 1000; // 1 second between attempts

  const eventTitle = event.title || 'Untitled Event';
  const eventDescription = event.description || 'No description available.';
  const eventOrganizer = event.organizer || 'Unknown Organizer';
  const eventLocation = event.location || 'Location TBD';
  const eventStatus = event.status || 'unknown';
  const eventSourceUrl = event.source_url || '#';

  const eventDate = new Date(event.start_time).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const eventTime = new Date(event.start_time).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  const hasEnded = new Date() > new Date(event.end_time || event.start_time);
  const hasHappeningNow = hasHappeningNowStatus(event.start_time, event.end_time, eventTitle);

  // Helper function to create user-friendly error messages
  const createErrorState = (err: unknown): ErrorState => {
    const errorObj = err as any;
    
    // Network/API errors
    if (errorObj?.code === 'PGRST301' || errorObj?.message?.includes('JWT')) {
      return {
        type: 'auth',
        message: 'Your session has expired. Please refresh the page and try again.',
        action: 'Refresh Page',
        retryable: false
      };
    }
    
    if (errorObj?.code === '23505' || errorObj?.message?.includes('duplicate')) {
      return {
        type: 'unknown',
        message: 'This event is already in your tracking list.',
        retryable: false
      };
    }
    
    if (errorObj?.message?.includes('rate limit') || errorObj?.message?.includes('limit exceeded')) {
      return {
        type: 'rateLimit',
        message: 'You\'re tracking events too quickly. Please wait a moment and try again.',
        action: 'Try Again',
        retryable: true
      };
    }
    
    if (errorObj?.message?.includes('network') || errorObj?.message?.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network connection issue. Please check your internet and try again.',
        action: 'Retry',
        retryable: true
      };
    }
    
    // Generic error
    return {
      type: 'unknown',
      message: 'Something went wrong while tracking this event. Please try again.',
      action: 'Try Again',
      retryable: true
    };
  };

  // Check if user has already tracked this event
  useEffect(() => {
    const checkIfTracked = async () => {
      if (!userId) {
        setIsTracked(false);
        return;
      }

      try {
        const { data, error: checkError } = await supabase
          .from('user_events')
          .select('id')
          .eq('user_id', userId)
          .eq('event_id', event.id)
          .maybeSingle();
        
        if (checkError) {
          console.error('Error checking tracked status:', checkError);
          // Don't show error for initial check, just assume not tracked
          setIsTracked(false);
        } else {
          setIsTracked(!!data);
        }
      } catch (err) {
        console.error('Unexpected error checking tracked status:', err);
        setIsTracked(false);
      }
    };

    checkIfTracked();
  }, [userId, event.id]);

  // Event tracking logic with rate limiting
  const handleTrackEvent = async () => {
    if (!userId) {
      setError({
        type: 'auth',
        message: 'Please sign in to track events.',
        action: 'Sign In',
        retryable: false
      });
      return;
    }

    if (!event.id) {
      setError({
        type: 'unknown',
        message: 'Invalid event. Please try refreshing the page.',
        retryable: false
      });
      return;
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastTrackingAttempt < RATE_LIMIT_MS) {
      setError({
        type: 'rateLimit',
        message: 'Please wait a moment before tracking another event.',
        retryable: true
      });
      return;
    }

    setIsTracking(true);
    setError(null);
    setLastTrackingAttempt(now);

    try {
      // Check if already tracked to avoid duplicate key error
      const { data: existing } = await supabase
        .from('user_events')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', event.id)
        .maybeSingle();

      if (existing) {
        setIsTracked(true);
        return;
      }

      const { data, error: insertError } = await supabase
        .from('user_events')
        .insert({ 
          user_id: userId, 
          event_id: event.id, 
          status: hasEnded ? 'attended' : 'bookmarked',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setIsTracked(true);
      onEventTracked?.();
      
      // Clear any previous errors on success
      if (error) {
        setError(null);
      }
    } catch (err) {
      const errorState = createErrorState(err);
      setError(errorState);
      console.error('Error tracking event:', err);
    } finally {
      setIsTracking(false);
    }
  };

  const handleUntrackEvent = async () => {
    if (!userId) return;

    setIsTracking(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('user_events')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', event.id);

      if (deleteError) {
        throw deleteError;
      }

      setIsTracked(false);
      onEventTracked?.();
    } catch (err) {
      const errorState = createErrorState(err);
      setError(errorState);
      console.error('Error untracking event:', err);
    } finally {
      setIsTracking(false);
    }
  };

  const handleErrorAction = () => {
    if (error?.type === 'auth' && error.action === 'Refresh Page') {
      window.location.reload();
    } else if (error?.retryable) {
      // Retry the last action
      if (isTracked) {
        handleUntrackEvent();
      } else {
        handleTrackEvent();
      }
    }
  };

  const handleCopyLink = () => {
    const eventSlug = eventTitle
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const shortId = event.id.slice(0, 8);
    const link = `${window.location.origin}/event/${eventSlug}-${shortId}`;
    
    navigator.clipboard.writeText(link);
    setShowCopiedBanner(true);
    setTimeout(() => {
      setShowCopiedBanner(false);
    }, 2500);
  };

  // Calendar Links
  const googleCalendarLink = useMemo(() => {
    const utcStartTime = formatToUTC(event.start_time);
    const utcEndTime = formatToUTC(event.end_time || new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000));
    const url = new URL('https://www.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', eventTitle);
    url.searchParams.append('dates', `${utcStartTime}/${utcEndTime}`);
    url.searchParams.append('details', eventDescription);
    url.searchParams.append('location', eventLocation);
    return url.href;
  }, [event.start_time, event.end_time, eventTitle, eventDescription, eventLocation]);

  const handleIcsDownload = () => {
    const utcStartTime = formatToUTC(event.start_time);
    const utcEndTime = formatToUTC(event.end_time || new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000));
    const icsContent = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TechCalendar//EN', 'BEGIN:VEVENT',
      `UID:${event.id}@techcalendar.app`, `DTSTAMP:${formatToUTC(new Date())}`, `DTSTART:${utcStartTime}`,
      `DTEND:${utcEndTime}`, `SUMMARY:${eventTitle}`, `DESCRIPTION:${eventDescription}`, `LOCATION:${eventLocation}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${eventTitle}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case 'network':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.018a10 10 0 100 0z" />
          </svg>
        );
      case 'auth':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'rateLimit':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" 
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-20 w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {showCopiedBanner && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-30 transition-opacity duration-300">
            Link copied to clipboard!
          </div>
        )}

        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 pr-12">
              {eventTitle}
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`text-sm font-medium capitalize ${getStatusColor(eventStatus)}`}>
                {eventStatus}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Organized by {eventOrganizer}
              </span>
            </div>
          </div>

          {/* Enhanced Error Display */}
          {error && (
            <div className={`mb-6 border rounded-lg p-4 ${
              error.type === 'auth' ? 'bg-yellow-50 border-yellow-200' :
              error.type === 'network' ? 'bg-blue-50 border-blue-200' :
              error.type === 'rateLimit' ? 'bg-orange-50 border-orange-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 ${
                  error.type === 'auth' ? 'text-yellow-600' :
                  error.type === 'network' ? 'text-blue-600' :
                  error.type === 'rateLimit' ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {getErrorIcon(error.type)}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    error.type === 'auth' ? 'text-yellow-800' :
                    error.type === 'network' ? 'text-blue-800' :
                    error.type === 'rateLimit' ? 'text-orange-800' :
                    'text-red-800'
                  }`}>
                    {error.message}
                  </p>
                  {error.action && error.retryable && (
                    <button
                      onClick={handleErrorAction}
                      className={`mt-2 text-sm font-medium underline hover:no-underline ${
                        error.type === 'auth' ? 'text-yellow-700 hover:text-yellow-800' :
                        error.type === 'network' ? 'text-blue-700 hover:text-blue-800' :
                        error.type === 'rateLimit' ? 'text-orange-700 hover:text-orange-800' :
                        'text-red-700 hover:text-red-800'
                      }`}
                    >
                      {error.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Track Event Button */}
          {userId && (
            <div className="mb-6">
              {isTracked ? (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-800 font-medium">Event tracked!</span>
                  </div>
                  <button 
                    onClick={handleUntrackEvent} 
                    disabled={isTracking} 
                    className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {isTracking ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleTrackEvent} 
                  disabled={isTracking || !!error} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                >
                  {isTracking ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Tracking...</span>
                    </>
                  ) : (
                    <span>+ Track Event</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Status Banners / Countdown */}
          {hasHappeningNow ? (
            <div className="mb-6">
              <ModalHappeningNow
                // Props are now snake_case
                start_time={event.start_time}
                end_time={event.end_time}
                title={eventTitle}
                event_type_id={event.event_type_id || undefined}
              />
            </div>
          ) : !hasEnded && (
            <div className="mb-6">
              <ModalCountdown
                // Props are now snake_case
                start_time={event.start_time}
                end_time={event.end_time}
              />
            </div>
          )}

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Date & Time</h3>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{eventDate}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{eventTime}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Location</h3>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{eventLocation}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">About this event</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {eventDescription}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href={eventSourceUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-colors"
              >
                View Event Details
              </a>
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Copy Link
              </button>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Add to Calendar</p>
              <div className="flex flex-wrap gap-2">
                <a 
                  href={googleCalendarLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Google
                </a>
                <button 
                  onClick={handleIcsDownload} 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Download .ics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}