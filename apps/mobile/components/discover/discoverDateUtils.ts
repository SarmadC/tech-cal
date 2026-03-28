import { formatLocalDateKey } from '@/components/calendar/calendarDateUtils';

export { formatLocalDateKey };

export function buildDiscoverDateOptions(totalDays = 120, now = new Date()) {
  const options: string[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let index = 0; index < totalDays; index += 1) {
    const next = new Date(today);
    next.setDate(today.getDate() + index);
    options.push(formatLocalDateKey(next));
  }

  return options;
}
