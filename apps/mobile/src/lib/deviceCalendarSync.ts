import * as Calendar from 'expo-calendar';

import type { MobileEventDetail } from '@kurecal/domain';

import { sessionStorage } from './sessionStorage';

const DEVICE_CALENDAR_MAPPING_KEY = 'mobile_device_calendar_event_mappings';
const DEFAULT_REMINDER_MINUTES = 15;

export type DeviceCalendarSyncStatus =
  | 'not_synced'
  | 'synced'
  | 'permission_denied'
  | 'unavailable';

export interface DeviceCalendarEventMapping {
  eventId: string;
  fingerprint: string;
  nativeEventId: string;
  provider: 'apple';
  syncedAt: string;
}

export interface DeviceCalendarSyncResult {
  mapping: DeviceCalendarEventMapping | null;
  status: DeviceCalendarSyncStatus;
}

type CalendarModule = typeof Calendar & {
  EntityTypes?: { EVENT?: string };
  getDefaultCalendarAsync?: () => Promise<{ id: string; allowsModifications?: boolean } | null>;
  getEventAsync?: (id: string) => Promise<unknown | null>;
};
type NativeEventPresence = 'exists' | 'missing' | 'unknown';

function getCalendarModule(): CalendarModule {
  return Calendar as CalendarModule;
}

async function loadMappings(): Promise<Record<string, DeviceCalendarEventMapping>> {
  const raw = await sessionStorage.getItem(DEVICE_CALENDAR_MAPPING_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, DeviceCalendarEventMapping>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveMappings(
  mappings: Record<string, DeviceCalendarEventMapping>
): Promise<void> {
  await sessionStorage.setItem(
    DEVICE_CALENDAR_MAPPING_KEY,
    JSON.stringify(mappings)
  );
}

export async function getDeviceCalendarMapping(
  eventId: string
): Promise<DeviceCalendarEventMapping | null> {
  const mappings = await loadMappings();
  const mapping = mappings[eventId] ?? null;
  if (!mapping) {
    return null;
  }

  if ((await getNativeEventPresence(mapping.nativeEventId)) === 'missing') {
    delete mappings[eventId];
    await saveMappings(mappings);
    return null;
  }

  return mapping;
}

export async function getDeviceCalendarPermissionStatus(): Promise<string> {
  const response = await Calendar.getCalendarPermissionsAsync();
  return response.status;
}

export function buildDeviceCalendarFingerprint(detail: MobileEventDetail): string {
  const event = detail.event;
  return JSON.stringify({
    description: event.description ?? '',
    endTime: event.endTime ?? event.startTime,
    location: event.location ?? '',
    startTime: event.startTime,
    timezone: event.timezone ?? null,
    title: event.title,
  });
}

async function requestCalendarPermission(): Promise<boolean> {
  const response = await Calendar.requestCalendarPermissionsAsync();
  return response.status === 'granted';
}

async function resolveWritableCalendarId(): Promise<string | null> {
  const calendarModule = getCalendarModule();
  const defaultCalendar = await calendarModule.getDefaultCalendarAsync?.();
  if (defaultCalendar?.id && defaultCalendar.allowsModifications !== false) {
    return defaultCalendar.id;
  }

  const eventEntityType =
    calendarModule.EntityTypes?.EVENT ??
    (Calendar as unknown as { EntityTypes?: { EVENT?: string } }).EntityTypes?.EVENT;
  const calendars = await Calendar.getCalendarsAsync(eventEntityType as never);
  const writableCalendar = calendars.find(
    (calendar) => calendar.allowsModifications !== false
  );

  return writableCalendar?.id ?? null;
}

function buildNativeEventPayload(detail: MobileEventDetail) {
  const event = detail.event;
  return {
    alarms: [{ relativeOffset: -DEFAULT_REMINDER_MINUTES }],
    endDate: new Date(event.endTime ?? event.startTime),
    location: event.location ?? undefined,
    notes: [event.description, event.sourceUrl, event.registrationUrl]
      .filter(Boolean)
      .join('\n\n'),
    startDate: new Date(event.startTime),
    timeZone: event.timezone ?? undefined,
    title: event.title,
    url: event.sourceUrl ?? event.registrationUrl ?? undefined,
  };
}

async function getNativeEventPresence(
  nativeEventId: string
): Promise<NativeEventPresence> {
  const calendarModule = getCalendarModule();
  if (!calendarModule.getEventAsync) {
    return 'exists';
  }

  try {
    return (await calendarModule.getEventAsync(nativeEventId))
      ? 'exists'
      : 'missing';
  } catch {
    return 'unknown';
  }
}

export async function syncEventToDeviceCalendar(
  detail: MobileEventDetail
): Promise<DeviceCalendarSyncResult> {
  const granted = await requestCalendarPermission();
  if (!granted) {
    return { mapping: null, status: 'permission_denied' };
  }

  const calendarId = await resolveWritableCalendarId();
  if (!calendarId) {
    return { mapping: null, status: 'unavailable' };
  }

  const eventId = detail.event.id;
  const mappings = await loadMappings();
  const existing = mappings[eventId] ?? null;
  const fingerprint = buildDeviceCalendarFingerprint(detail);
  const payload = buildNativeEventPayload(detail);
  let nativeEventId = existing?.nativeEventId ?? null;
  const nativeEventPresence = nativeEventId
    ? await getNativeEventPresence(nativeEventId)
    : 'missing';

  if (nativeEventId && nativeEventPresence !== 'missing') {
    if (existing?.fingerprint !== fingerprint) {
      await Calendar.updateEventAsync(nativeEventId, payload);
    }
  } else {
    nativeEventId = await Calendar.createEventAsync(calendarId, payload);
  }

  const mapping: DeviceCalendarEventMapping = {
    eventId,
    fingerprint,
    nativeEventId,
    provider: 'apple',
    syncedAt: new Date().toISOString(),
  };
  mappings[eventId] = mapping;
  await saveMappings(mappings);

  return { mapping, status: 'synced' };
}

export async function removeEventFromDeviceCalendar(
  eventId: string
): Promise<DeviceCalendarSyncResult> {
  const mappings = await loadMappings();
  const mapping = mappings[eventId] ?? null;
  if (!mapping) {
    return { mapping: null, status: 'not_synced' };
  }

  try {
    await Calendar.deleteEventAsync(mapping.nativeEventId);
  } catch {
    // Calendar entries can be deleted outside KureCal; clearing the mapping is still correct.
  }

  delete mappings[eventId];
  await saveMappings(mappings);

  return { mapping: null, status: 'not_synced' };
}
