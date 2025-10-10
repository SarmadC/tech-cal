import type { Event } from '@/types';

function formatDateToICS(date: Date): string {
  // YYYYMMDDTHHMMSSZ
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function generateICS(event: Event, minutesBefore = 30): string {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
  const dtStart = formatDateToICS(start);
  const dtEnd = formatDateToICS(end);
  const uid = `${event.id}@tech-cal`;
  const summary = (event.title || 'Event').replace(/\n/g, ' ');
  const description = (event.description || '').slice(0, 500).replace(/\n/g, ' ');
  const location = event.location || '';
  const url = event.registrationUrl || event.sourceUrl || '';

  const alarm = `BEGIN:VALARM\nTRIGGER:-PT${minutesBefore}M\nACTION:DISPLAY\nDESCRIPTION:Reminder for ${summary}\nEND:VALARM`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//tech-cal//dashboard//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDateToICS(new Date())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : undefined,
    location ? `LOCATION:${location}` : undefined,
    url ? `URL:${url}` : undefined,
    alarm,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\n');
}

export function downloadICS(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


