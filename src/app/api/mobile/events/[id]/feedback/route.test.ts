import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileEventNetworkingFeedbackSchema } from '@kurecal/domain';

import { GET, PATCH } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getFeedbackForEvent: vi.fn(),
  updateFeedback: vi.fn(),
  submitFeedback: vi.fn(),
  getSummaryForEvent: vi.fn(),
  setLinkedInRequestsSent: vi.fn(),
  getEventById: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/eventFeedbackService', () => ({
  EventFeedbackService: {
    getFeedbackForEvent: (...args: unknown[]) => mocks.getFeedbackForEvent(...args),
    updateFeedback: (...args: unknown[]) => mocks.updateFeedback(...args),
    submitFeedback: (...args: unknown[]) => mocks.submitFeedback(...args),
  },
}));

vi.mock('@/services/eventNetworkingSummaryService', () => ({
  EventNetworkingSummaryService: {
    getSummaryForEvent: (...args: unknown[]) => mocks.getSummaryForEvent(...args),
    setLinkedInRequestsSent: (...args: unknown[]) =>
      mocks.setLinkedInRequestsSent(...args),
  },
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    getEventById: (...args: unknown[]) => mocks.getEventById(...args),
  },
}));

describe('/api/mobile/events/[id]/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.getSummaryForEvent.mockResolvedValue(null);
    mocks.getFeedbackForEvent.mockResolvedValue(null);
    mocks.updateFeedback.mockResolvedValue({});
    mocks.submitFeedback.mockResolvedValue({});
    mocks.setLinkedInRequestsSent.mockResolvedValue({});
  });

  it('returns the merged networking feedback snapshot', async () => {
    mocks.getFeedbackForEvent.mockResolvedValue({
      id: 'feedback-1',
      connectionsMade: 2,
    });
    mocks.getSummaryForEvent.mockResolvedValue({
      id: 'summary-1',
      linkedinRequestsSent: 4,
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/events/event-1/feedback'),
      {
        params: Promise.resolve({ id: 'event-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mobileEventNetworkingFeedbackSchema.parse(payload.data)).toEqual({
      eventId: 'event-1',
      connectionsMade: 2,
      linkedinRequestsSent: 4,
    });
  });

  it('updates both confirmed connections and linkedin requests', async () => {
    mocks.getFeedbackForEvent.mockResolvedValue({
      id: 'feedback-1',
      connectionsMade: 1,
    });
    mocks.getSummaryForEvent.mockResolvedValue({
      id: 'summary-1',
      linkedinRequestsSent: 3,
      lastOutreachLoggedAt: '2026-04-10T00:00:00.000Z',
    });

    const response = await PATCH(
      new Request('http://localhost/api/mobile/events/event-1/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionsMade: 2,
          linkedinRequestsSent: 3,
        }),
      }),
      {
        params: Promise.resolve({ id: 'event-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.updateFeedback).toHaveBeenCalledWith(
      'feedback-1',
      { connectionsMade: 2 },
      {}
    );
    expect(mocks.setLinkedInRequestsSent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-1',
        userId: 'user-1',
        linkedinRequestsSent: 3,
        lastOutreachLoggedAt: '2026-04-10T00:00:00.000Z',
      }),
      {}
    );
    expect(mobileEventNetworkingFeedbackSchema.parse(payload.data).connectionsMade).toBe(2);
  });

  it('creates an event feedback row when confirming connections for the first time', async () => {
    mocks.getEventById.mockResolvedValue({
      id: 'event-1',
      careerImpact: { overall: 83 },
    });

    const response = await PATCH(
      new Request('http://localhost/api/mobile/events/event-1/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionsMade: 1,
        }),
      }),
      {
        params: Promise.resolve({ id: 'event-1' }),
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-1',
        userId: 'user-1',
        connectionsMade: 1,
        predictedScore: 83,
      }),
      {}
    );
  });
});
