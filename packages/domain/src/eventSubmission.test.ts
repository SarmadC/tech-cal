import { describe, expect, it } from 'vitest';

import {
  EVENT_SUBMISSION_TYPE_OPTIONS,
  normalizeEventSubmissionRequest,
} from './eventSubmission';

describe('domain event submission contract', () => {
  it('exposes the supported event type options', () => {
    expect(EVENT_SUBMISSION_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      'tech_event',
      'hackathon',
      'meetup',
      'conference',
      'workshop',
      'other',
    ]);
  });

  it('normalizes a valid in-person payload', () => {
    expect(
      normalizeEventSubmissionRequest({
        title: '  Demo Day  ',
        event_type: 'conference',
        start_date: '2026-05-01T09:00:00Z',
        end_date: '2026-05-01T17:00:00Z',
        is_virtual: false,
        location: '  Edmonton  ',
        tags: ['expo', ' expo ', 'mobile', 12],
      })
    ).toEqual({
      data: {
        title: 'Demo Day',
        description: null,
        event_type: 'conference',
        start_date: '2026-05-01T09:00:00.000Z',
        end_date: '2026-05-01T17:00:00.000Z',
        is_virtual: false,
        location: 'Edmonton',
        registration_url: null,
        organizer_name: null,
        tags: ['expo', 'mobile'],
      },
      error: null,
    });
  });

  it('rejects an in-person payload without a location', () => {
    expect(
      normalizeEventSubmissionRequest({
        title: 'Demo Day',
        event_type: 'conference',
        start_date: '2026-05-01T09:00:00Z',
        is_virtual: false,
      })
    ).toEqual({
      data: null,
      error: 'Location is required for in-person events',
    });
  });
});
