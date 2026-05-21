import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MobileEventDetail } from '@kurecal/domain';

const mocks = vi.hoisted(() => ({
  createEventAsync: vi.fn(),
  deleteEventAsync: vi.fn(),
  getCalendarPermissionsAsync: vi.fn(),
  getCalendarsAsync: vi.fn(),
  getDefaultCalendarAsync: vi.fn(),
  getEventAsync: vi.fn(),
  requestCalendarPermissionsAsync: vi.fn(),
  updateEventAsync: vi.fn(),
  storage: new Map<string, string>(),
}));

vi.mock('expo-calendar', () => ({
  EntityTypes: { EVENT: 'event' },
  createEventAsync: (...args: unknown[]) => mocks.createEventAsync(...args),
  deleteEventAsync: (...args: unknown[]) => mocks.deleteEventAsync(...args),
  getCalendarPermissionsAsync: (...args: unknown[]) =>
    mocks.getCalendarPermissionsAsync(...args),
  getCalendarsAsync: (...args: unknown[]) => mocks.getCalendarsAsync(...args),
  getDefaultCalendarAsync: (...args: unknown[]) =>
    mocks.getDefaultCalendarAsync(...args),
  getEventAsync: (...args: unknown[]) => mocks.getEventAsync(...args),
  requestCalendarPermissionsAsync: (...args: unknown[]) =>
    mocks.requestCalendarPermissionsAsync(...args),
  updateEventAsync: (...args: unknown[]) => mocks.updateEventAsync(...args),
}));

vi.mock('./sessionStorage', () => ({
  sessionStorage: {
    getItem: async (key: string) => mocks.storage.get(key) ?? null,
    removeItem: async (key: string) => {
      mocks.storage.delete(key);
    },
    setItem: async (key: string, value: string) => {
      mocks.storage.set(key, value);
    },
  },
}));

import {
  buildDeviceCalendarFingerprint,
  getDeviceCalendarMapping,
  getDeviceCalendarPermissionStatus,
  removeEventFromDeviceCalendar,
  syncEventToDeviceCalendar,
} from './deviceCalendarSync';

function buildDetail(overrides: Partial<MobileEventDetail['event']> = {}): MobileEventDetail {
  return {
    event: {
      id: 'event-1',
      title: 'Calendar event',
      slug: 'calendar-event',
      description: 'Useful event',
      location: 'Calgary',
      startTime: '2026-05-17T18:00:00.000Z',
      endTime: '2026-05-17T19:00:00.000Z',
      sourceUrl: 'https://example.com',
      registrationUrl: null,
      timezone: 'America/Edmonton',
      ...overrides,
    },
    host: null,
    tags: [],
    agenda: [],
    speakerLineup: [],
  };
}

describe('device calendar sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storage.clear();
    mocks.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mocks.getCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mocks.getDefaultCalendarAsync.mockResolvedValue({
      id: 'default-calendar',
      allowsModifications: true,
    });
    mocks.getCalendarsAsync.mockResolvedValue([]);
    mocks.createEventAsync.mockResolvedValue('native-event-1');
    mocks.getEventAsync.mockResolvedValue({ id: 'native-event-1' });
  });

  it('creates a device calendar event and stores its mapping', async () => {
    const detail = buildDetail();
    const result = await syncEventToDeviceCalendar(detail);

    expect(result.status).toBe('synced');
    expect(result.mapping?.nativeEventId).toBe('native-event-1');
    expect(mocks.createEventAsync).toHaveBeenCalledWith(
      'default-calendar',
      expect.objectContaining({
        title: 'Calendar event',
        alarms: [{ relativeOffset: -15 }],
      })
    );
    await expect(getDeviceCalendarMapping('event-1')).resolves.toEqual(
      result.mapping
    );
  });

  it('updates the mapped event when event details change', async () => {
    const detail = buildDetail();
    await syncEventToDeviceCalendar(detail);
    await syncEventToDeviceCalendar(
      buildDetail({ title: 'Updated calendar event' })
    );

    expect(mocks.createEventAsync).toHaveBeenCalledTimes(1);
    expect(mocks.updateEventAsync).toHaveBeenCalledWith(
      'native-event-1',
      expect.objectContaining({ title: 'Updated calendar event' })
    );
  });

  it('recreates a mapped event if the native event was deleted outside the app', async () => {
    await syncEventToDeviceCalendar(buildDetail());
    mocks.getEventAsync.mockResolvedValueOnce(null);
    mocks.createEventAsync.mockResolvedValueOnce('native-event-2');

    const result = await syncEventToDeviceCalendar(buildDetail({ title: 'Updated' }));

    expect(mocks.createEventAsync).toHaveBeenCalledTimes(2);
    expect(result.mapping?.nativeEventId).toBe('native-event-2');
  });

  it('clears a stored mapping when the native event was deleted outside the app', async () => {
    await syncEventToDeviceCalendar(buildDetail());
    mocks.getEventAsync.mockResolvedValueOnce(null);

    await expect(getDeviceCalendarMapping('event-1')).resolves.toBeNull();
    expect(
      JSON.parse(mocks.storage.get('mobile_device_calendar_event_mappings') ?? '{}')
    ).not.toHaveProperty('event-1');
  });

  it('keeps a stored mapping when native event lookup fails', async () => {
    await syncEventToDeviceCalendar(buildDetail());
    mocks.getEventAsync.mockRejectedValueOnce(new Error('permission unavailable'));

    const mapping = await getDeviceCalendarMapping('event-1');

    expect(mapping?.nativeEventId).toBe('native-event-1');
    expect(
      JSON.parse(mocks.storage.get('mobile_device_calendar_event_mappings') ?? '{}')
    ).toHaveProperty('event-1');
  });

  it('does not recreate duplicate native events when mapped lookup is unavailable', async () => {
    await syncEventToDeviceCalendar(buildDetail());
    mocks.getEventAsync.mockRejectedValueOnce(new Error('calendar unavailable'));

    const result = await syncEventToDeviceCalendar(buildDetail());

    expect(result.mapping?.nativeEventId).toBe('native-event-1');
    expect(mocks.createEventAsync).toHaveBeenCalledTimes(1);
  });

  it('removes a mapped device calendar event', async () => {
    await syncEventToDeviceCalendar(buildDetail());
    const result = await removeEventFromDeviceCalendar('event-1');

    expect(result.status).toBe('not_synced');
    expect(mocks.deleteEventAsync).toHaveBeenCalledWith('native-event-1');
    await expect(getDeviceCalendarMapping('event-1')).resolves.toBeNull();
  });

  it('returns permission_denied when calendar permission is not granted', async () => {
    mocks.requestCalendarPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
    });

    const result = await syncEventToDeviceCalendar(buildDetail());

    expect(result.status).toBe('permission_denied');
    expect(mocks.createEventAsync).not.toHaveBeenCalled();
  });

  it('exposes permission status and stable fingerprints', async () => {
    expect(await getDeviceCalendarPermissionStatus()).toBe('granted');
    expect(buildDeviceCalendarFingerprint(buildDetail())).toBe(
      buildDeviceCalendarFingerprint(buildDetail())
    );
  });
});
