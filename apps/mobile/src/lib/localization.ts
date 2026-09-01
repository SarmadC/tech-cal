import { getCalendars, getLocales } from 'expo-localization';

export function getDeviceLocale() {
  return getLocales()[0]?.languageTag;
}

export function getDeviceCalendarPreferences() {
  const calendar = getCalendars()[0];
  return {
    firstWeekday: calendar?.firstWeekday ?? 1,
    timeZone: calendar?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    uses24hourClock: calendar?.uses24hourClock ?? false,
  };
}

export function getLocalizedWeekdayLabels(firstWeekday: number) {
  const formatter = new Intl.DateTimeFormat(getDeviceLocale(), {
    weekday: 'short',
  });
  const sunday = new Date(2026, 7, 2);
  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    return formatter.format(date).slice(0, 2);
  });
  const startIndex = Math.max(0, Math.min(6, firstWeekday - 1));
  return [...labels.slice(startIndex), ...labels.slice(0, startIndex)];
}
