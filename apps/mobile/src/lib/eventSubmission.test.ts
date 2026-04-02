import { describe, expect, it, vi } from 'vitest';

import {
  EVENT_SUBMISSION_TYPE_OPTIONS as MOBILE_EVENT_SUBMISSION_TYPE_OPTIONS,
  buildSubmitEventPayload,
  createInitialSubmitEventState,
  submitEventSubmission,
  validateSubmitEventForm,
} from './eventSubmission';
import { EVENT_SUBMISSION_TYPE_OPTIONS as SHARED_EVENT_SUBMISSION_TYPE_OPTIONS } from '../../../../src/lib/eventSubmission';

describe('mobile event submission helpers', () => {
  it('keeps mobile event type options aligned with the shared backend contract', () => {
    expect(MOBILE_EVENT_SUBMISSION_TYPE_OPTIONS).toEqual(SHARED_EVENT_SUBMISSION_TYPE_OPTIONS);
  });

  it('builds the submission payload with normalized optional fields and deduplicated tags', () => {
    const form = createInitialSubmitEventState();
    form.title = '  React Native Summit  ';
    form.description = '  Mobile-first release candidate  ';
    form.eventType = 'conference';
    form.startDate = '2026-05-01';
    form.startTime = '09:30';
    form.endDate = '2026-05-02';
    form.endTime = '17:00';
    form.location = '  San Francisco  ';
    form.registrationUrl = '  https://example.com/register  ';
    form.organizerName = '  KureCal  ';
    form.tagsInput = 'expo, react-native, expo, mobile ';

    expect(buildSubmitEventPayload(form)).toEqual({
      title: 'React Native Summit',
      description: 'Mobile-first release candidate',
      event_type: 'conference',
      start_date: '2026-05-01T09:30:00',
      end_date: '2026-05-02T17:00:00',
      is_virtual: false,
      location: 'San Francisco',
      registration_url: 'https://example.com/register',
      organizer_name: 'KureCal',
      tags: ['expo', 'react-native', 'mobile'],
    });
  });

  it('clears location for virtual events before submission', () => {
    const form = createInitialSubmitEventState();
    form.title = 'Virtual ship review';
    form.startDate = '2026-05-01';
    form.isVirtual = true;
    form.location = 'Should be removed';

    expect(buildSubmitEventPayload(form).location).toBeNull();
  });

  it('validates missing required fields for in-person events', () => {
    expect(validateSubmitEventForm(createInitialSubmitEventState())).toEqual({
      title: 'Title is required',
      startDate: 'Start date is required',
      location: 'Location is required for in-person events',
    });
  });

  it('does not require location for virtual events', () => {
    const form = createInitialSubmitEventState();
    form.title = 'Virtual AMA';
    form.startDate = '2026-06-10';
    form.isVirtual = true;

    expect(validateSubmitEventForm(form)).toEqual({});
  });

  it('fails fast when no access token is available', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      submitEventSubmission('', {
        title: 'Launch review',
        event_type: 'other',
        start_date: '2026-05-01T09:00:00',
        is_virtual: true,
        tags: [],
      })
    ).rejects.toThrow('Sign in required');

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('returns the new submission id when the backend accepts the request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'submission-123' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const previousApiUrl = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://mobile.kurecal.test';

    await expect(
      submitEventSubmission('token-123', {
        title: 'Launch review',
        event_type: 'other',
        start_date: '2026-05-01T09:00:00',
        is_virtual: true,
        tags: [],
      })
    ).resolves.toBe('submission-123');

    expect(fetchSpy).toHaveBeenCalledWith('https://mobile.kurecal.test/api/events/submit', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Launch review',
        event_type: 'other',
        start_date: '2026-05-01T09:00:00',
        is_virtual: true,
        tags: [],
      }),
    });

    process.env.EXPO_PUBLIC_API_URL = previousApiUrl;
    fetchSpy.mockRestore();
  });

  it('surfaces backend validation errors to the caller', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Location is required for in-person events' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const previousApiUrl = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://mobile.kurecal.test';

    await expect(
      submitEventSubmission('token-123', {
        title: 'Office meetup',
        event_type: 'meetup',
        start_date: '2026-05-01T09:00:00',
        is_virtual: false,
        tags: [],
      })
    ).rejects.toThrow('Location is required for in-person events');

    process.env.EXPO_PUBLIC_API_URL = previousApiUrl;
    fetchSpy.mockRestore();
  });
});
