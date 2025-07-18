// src/components/EventModal.tsx (Corrected)

'use client';

import { useState, useEffect } from 'react';
import { formatToUTC } from '@/lib/calendarUtils';
import { ModalCountdown } from './CountdownTimer';
import { ModalHappeningNow, hasHappeningNowStatus } from './HappeningNowIndicator';
import { useAuth } from '@/contexts/AuthContext';
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
  onEventTracked?: () => void; // Callback to refresh dashboard
}

// Helper function to create appealing event slugs
const createEventSlug = (title: string, id: string) => {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  const shortId = id.slice(0, 8);
  return `${slug}-${shortId}`;
};

// Helper function to check if event is happening soon (within 48 hours)
const isHappeningSoon = (startTime: string) => {
  const now = new Date();
  const eventStart = new Date(startTime);
  const hoursDiff = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= 0 && hoursDiff <= 48;
};

// Helper function to check if event is live
const isEventLive = (startTime: string, endTime: string | null) => {
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return now >= start && now <= end;
};

export default function EventModal({ event, onClose, onEventTracked }: EventModalProps) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'tracking' | 'tracked' | 'error'>('idle');
  const [isTracked, setIsTracked] = useState(false);

  // Safe title and fallbacks for nullable fields
  const eventTitle = event.title || 'Untitled Event';
  const eventDescription = event.description || 'No description available.';
  const eventOrganizer = event.organizer || 'Unknown Organizer';
  const eventLocation = event.location || 'Location TBD';
  const eventStatus = event.status || 'unknown';
  const eventSourceUrl = event.source_url || '#';

  // Check event status
  const isLive = isEventLive(event.start_time, event.end_time);
  const isSoon = isHappeningSoon(event.start_time);
  const hasEnded = new Date() > new Date(event.end_time || event.start_time);
  const hasHappeningNow = hasHappeningNowStatus(event.start_time, event.end_time, eventTitle);

  // Format dates
  const eventDate = new Date(event.start_time).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const eventTime = new Date(event.start_time).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  // Check if user has already tracked this event
  useEffect(() => {
    const checkIfTracked = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_events')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_id', event.id)
          .single();

        if (!error && data) {
          setIsTracked(true);
          setTrackingStatus('tracked');
        }
      } catch (err) {
        console.error('Error checking if event is tracked:', err);
      }
    };

    checkIfTracked();
  }, [user, event.id]);

  // Track event function - updated for your schema
  const handleTrackEvent = async () => {
    if (!user || isTracked) return;

    setIsTracking(true);
    setTrackingStatus('tracking');

    try {
      // First, ensure user exists in public.users table
      const { error: userError } = await supabase
        .from('users')
        .upsert([
          {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            preferences: {
              notifications: true,
              theme: 'system',
              categories: []
            }
          }
        ], { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (userError) {
        console.error('Error upserting user:', userError);
      }

      // Track the event
      const { error } = await supabase
        .from('user_events')
        .insert([
          {
            user_id: user.id,
            event_id: event.id,
            status: hasEnded ? 'attended' : 'bookmarked', // Use 'bookmarked' as per your schema
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Error tracking event:', error);
        setTrackingStatus('error');
      } else {
        setTrackingStatus('tracked');
        setIsTracked(true);
        
        // Call the callback to refresh dashboard data
        if (onEventTracked) {
          onEventTracked();
        }
      }
    } catch (err) {
      console.error('Unexpected error tracking event:', err);
      setTrackingStatus('error');
    } finally {
      setIsTracking(false);
    }
  };

  // Untrack event function
  const handleUntrackEvent = async () => {
    if (!user || !isTracked) return;

    setIsTracking(true);

    try {
      const { error } = await supabase
        .from('user_events')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id);

      if (error) {
        console.error('Error untracking event:', error);
        setTrackingStatus('error');
      } else {
        setTrackingStatus('idle');
        setIsTracked(false);
        
        // Call the callback to refresh dashboard data
        if (onEventTracked) {
          onEventTracked();
        }
      }
    } catch (err) {
      console.error('Unexpected error untracking event:', err);
      setTrackingStatus('error');
    } finally {
      setIsTracking(false);
    }
  };

  // Calendar Links
  const utcStartTime = formatToUTC(event.start_time);
  const utcEndTime = formatToUTC(event.end_time || new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000));

  const googleCalendarLink = new URL('https://www.google.com/calendar/render');
  googleCalendarLink.searchParams.append('action', 'TEMPLATE');
  googleCalendarLink.searchParams.append('text', eventTitle);
  googleCalendarLink.searchParams.append('dates', `${utcStartTime}/${utcEndTime}`);
  googleCalendarLink.searchParams.append('details', eventDescription);
  googleCalendarLink.searchParams.append('location', eventLocation);

  const handleIcsDownload = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TechCalendar//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@techcalendar.app`,
      `DTSTAMP:${formatToUTC(new Date())}`,
      `DTSTART:${utcStartTime}`,
      `DTEND:${utcEndTime}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${eventDescription}`,
      `LOCATION:${eventLocation}`,
      'END:VEVENT',
      'END:VCALENDAR',
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" 
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-10 w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 pr-12">
                {eventTitle}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4 mb-4">
              <span className={`text-sm font-medium ${getStatusColor(eventStatus)}`}>
                {eventStatus.charAt(0).toUpperCase() + eventStatus.slice(1)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Organized by {eventOrganizer}
              </span>
            </div>

            {/* Happening Now Indicator */}
            {hasHappeningNow && (
              <div className="mb-4">
                <ModalHappeningNow 
                  startTime={event.start_time}
                  endTime={event.end_time}
                  title={eventTitle}
                  eventType={event.event_type_id || undefined}
                />
              </div>
            )}
          </div>

          {/* Countdown Timer - Show for upcoming events without happening now status */}
          {!hasEnded && !hasHappeningNow && isSoon && (
            <div className="mb-6">
              <ModalCountdown startTime={event.start_time} endTime={event.end_time} />
            </div>
          )}

          {/* Track Event Button */}
          {user && (
            <div className="mb-6">
              {!isTracked ? (
                <button
                  onClick={handleTrackEvent}
                  disabled={isTracking}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2"
                >
                  {isTracking ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Tracking...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Track Event</span>
                    </>
                  )}
                </button>
              ) : (
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
                    className="text-red-600 hover:text-red-700 transition-colors text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Special banners based on happening now status */}
          {isLive && (
            <div className="mb-6 bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center space-x-2">
                    <span className="animate-pulse">🔴</span>
                    <span>Event is happening now!</span>
                  </h3>
                  <p className="text-red-100 text-sm">Don&apos;t miss out on the live coverage</p>
                </div>
                {event.livestream_url && (
                  <a
                    href={event.livestream_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white text-red-600 hover:bg-red-50 font-medium py-2 px-4 rounded-lg transition-all"
                  >
                    Watch Live
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Date & Time */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Date & Time</h3>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{eventDate}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{eventTime}</p>
            </div>

            {/* Location */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={eventSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
              >
                <span>View Event Details</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              {event.livestream_url && (
                <a
                  href={event.livestream_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    flex-1 font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-sm hover:shadow-md
                    ${isLive 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                      : 'bg-red-500 hover:bg-red-600 text-white'
                    }
                  `}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{isLive ? 'Watch Live Now' : 'Watch Livestream'}</span>
                </a>
              )}

              <button
                onClick={() => {
                  const eventSlug = createEventSlug(eventTitle, event.id);
                  navigator.clipboard.writeText(
                    `${window.location.origin}/event/${eventSlug}`
                  );
                  alert('Link copied!');
                }}
                className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Link</span>
              </button>
            </div>

            {/* Add to Calendar */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Add to Calendar</p>
              <div className="flex flex-wrap gap-2">
                <a 
                  href={googleCalendarLink.href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 font-medium py-2 px-4 rounded-lg transition-all text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Google</span>
                </a>
                
                <button 
                  onClick={handleIcsDownload} 
                  className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 font-medium py-2 px-4 rounded-lg transition-all text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                  <span>Download .ics</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}