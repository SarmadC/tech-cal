'use client';

import { formatToUTC } from '@/lib/calendarUtils';

type Event = {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string | null;
  organizer: string;
  location: string;
  status: string;
  source_url: string;
  livestream_url: string | null;
};

interface EventModalProps {
  event: Event;
  onClose: () => void;
}

export default function EventModal({ event, onClose }: EventModalProps) {
  // Format dates
  const eventDate = new Date(event.start_time).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const eventTime = new Date(event.start_time).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  // Calendar Links
  const utcStartTime = formatToUTC(event.start_time);
  const utcEndTime = formatToUTC(event.end_time || new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000));

  const googleCalendarLink = new URL('https://www.google.com/calendar/render');
  googleCalendarLink.searchParams.append('action', 'TEMPLATE');
  googleCalendarLink.searchParams.append('text', event.title);
  googleCalendarLink.searchParams.append('dates', `${utcStartTime}/${utcEndTime}`);
  googleCalendarLink.searchParams.append('details', event.description);
  googleCalendarLink.searchParams.append('location', event.location);

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
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${event.title}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'text-success';
      case 'pending': return 'text-warning';
      case 'cancelled': return 'text-error';
      default: return 'text-foreground-tertiary';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" 
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background-main rounded-2xl shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-10 w-10 h-10 bg-background-secondary hover:bg-background-tertiary rounded-lg flex items-center justify-center text-foreground-tertiary hover:text-foreground-primary transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground-primary mb-2">
              {event.title}
            </h1>
            <div className="flex items-center space-x-4">
              <span className={`text-sm font-medium ${getStatusColor(event.status)}`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
              <span className="text-sm text-foreground-tertiary">
                Organized by {event.organizer}
              </span>
            </div>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Date & Time */}
            <div className="bg-background-secondary rounded-xl p-5">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-accent-primary-light rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-foreground-primary">Date & Time</h3>
              </div>
              <p className="text-sm font-medium text-foreground-primary">{eventDate}</p>
              <p className="text-sm text-foreground-secondary mt-1">{eventTime}</p>
            </div>

            {/* Location */}
            <div className="bg-background-secondary rounded-xl p-5">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-accent-primary-light rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-foreground-primary">Location</h3>
              </div>
              <p className="text-sm font-medium text-foreground-primary">{event.location}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-foreground-primary mb-3">About this event</h3>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-accent-primary hover:bg-accent-primary-hover text-white font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
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
                  className="flex-1 bg-error hover:bg-red-600 text-white font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Watch Livestream</span>
                </a>
              )}

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/event/${event.id}`
                  );
                  alert('Link copied!');
                }}
                className="flex-1 bg-background-secondary hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Link</span>
              </button>
            </div>


            {/* Add to Calendar */}
            <div className="border-t border-border-color pt-4">
              <p className="text-xs font-medium text-foreground-tertiary mb-3 uppercase tracking-wider">Add to Calendar</p>
              <div className="flex flex-wrap gap-2">
                <a 
                  href={googleCalendarLink.href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center space-x-2 bg-background-secondary hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-2 px-4 rounded-lg transition-all text-sm"
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
                  className="inline-flex items-center space-x-2 bg-background-secondary hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-2 px-4 rounded-lg transition-all text-sm"
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