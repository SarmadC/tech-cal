// src/components/EventModal.tsx (With "Link Copied" Banner)

'use client';

// Added useMemo
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

const isEventLive = (startTime: string, endTime: string | null) => {
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return now >= start && now <= end;
};

export default function EventModal({ event, onClose, onEventTracked }: EventModalProps) {
  const userId = useUserId();
  const [isTracking, setIsTracking] = useState(false);
  const [isTracked, setIsTracked] = useState(false);
  const [showCopiedBanner, setShowCopiedBanner] = useState(false); // ✅ ADDED: State for the banner

  const eventTitle = event.title || 'Untitled Event';
  const eventDescription = event.description || 'No description available.';
  const eventOrganizer = event.organizer || 'Unknown Organizer';
  const eventLocation = event.location || 'Location TBD';
  const eventStatus = event.status || 'unknown';
  const eventSourceUrl = event.source_url || '#';
  const isLive = isEventLive(event.start_time, event.end_time);
  const hasEnded = new Date() > new Date(event.end_time || event.start_time);

  const eventDate = new Date(event.start_time).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const eventTime = new Date(event.start_time).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  
  useEffect(() => {
    const checkIfTracked = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('user_events')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', event.id)
        .single();
      setIsTracked(!!data);
    };
    checkIfTracked();
  }, [userId, event.id]);

  const handleTrackEvent = async () => {
    if (!userId) return;
    setIsTracking(true);
    const { error } = await supabase
      .from('user_events')
      .insert({ user_id: userId, event_id: event.id, status: hasEnded ? 'attended' : 'bookmarked' });
    if (!error) {
      setIsTracked(true);
      onEventTracked?.();
    }
    setIsTracking(false);
  };

  const handleUntrackEvent = async () => {
    if (!userId) return;
    setIsTracking(true);
    const { error } = await supabase.from('user_events').delete().eq('user_id', userId).eq('event_id', event.id);
    if (!error) {
      setIsTracked(false);
      onEventTracked?.();
    }
    setIsTracking(false);
  };

  // ✅ ADDED: Handler for copying the link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/event/${createEventSlug(eventTitle, event.id)}`);
    setShowCopiedBanner(true);
    setTimeout(() => {
      setShowCopiedBanner(false);
    }, 2500); // The banner will disappear after 2.5 seconds
  };

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
          className="absolute top-6 right-6 z-20 w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* ✅ ADDED: The banner itself, with transitions */}
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
              <span className={`text-sm font-medium capitalize ${eventStatus === 'confirmed' ? 'text-green-600' : 'text-gray-500'}`}>
                {eventStatus}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Organized by {eventOrganizer}
              </span>
            </div>
          </div>

          {/* Status Banners / Countdown */}
          {hasHappeningNowStatus(event.start_time, event.end_time, eventTitle) ? (
            <div className="mb-6">
              <ModalHappeningNow startTime={event.start_time} endTime={event.end_time} title={eventTitle} />
            </div>
          ) : !hasEnded && (
            <div className="mb-6">
              <ModalCountdown startTime={event.start_time} endTime={event.end_time} />
            </div>
          )}

          {/* Track Event Button */}
          {userId && (
            <div className="mb-6">
              {isTracked ? (
                 <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-green-800 font-medium">Event tracked!</span>
                    </div>
                   <button onClick={handleUntrackEvent} disabled={isTracking} className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50">
                     {isTracking ? 'Removing...' : 'Remove'}
                   </button>
                 </div>
              ) : (
                <button onClick={handleTrackEvent} disabled={isTracking} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50">
                  {isTracking ? 'Tracking...' : 'Track Event'}
                </button>
              )}
            </div>
          )}

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
                <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Date & Time</h3>
                </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{eventDate}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{eventTime}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
                 <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
              <a href={eventSourceUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg text-center">
                View Event Details
              </a>
              {/* ✅ MODIFIED: onClick handler now points to our new function */}
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-900 font-medium py-3 px-6 rounded-lg"
              >
                Copy Link
              </button>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Add to Calendar</p>
              <div className="flex flex-wrap gap-2">
                <a href={googleCalendarLink} target="_blank" rel="noopener noreferrer" className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-lg text-sm">
                  Google
                </a>
                <button onClick={handleIcsDownload} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-lg text-sm">
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