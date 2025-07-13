// src/lib/calendarUtils.ts

/**
 * Converts an ISO 8601 date string to the iCalendar/Google Calendar UTC format.
 * Example: "2024-09-09T17:46:00.000Z" -> "20240909T174600Z"
 * @param date - The date string or Date object to format.
 * @returns The formatted UTC date string.
 */
export function formatToUTC(date: string | Date | null): string {
  if (!date) return '';
  
  const d = new Date(date);
  
  // Pad single-digit numbers with a leading zero
  const pad = (num: number) => (num < 10 ? '0' + num : num);
  
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}