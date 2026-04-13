import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileLinkedInOutreachLogSchema } from '@kurecal/domain';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getFeedbackForEvent: vi.fn(),
  incrementLinkedInRequestsSent: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/eventFeedbackService', () => ({
  EventFeedbackService: {
    getFeedbackForEvent: (...args: unknown[]) => mocks.getFeedbackForEvent(...args),
  },
}));

vi.mock('@/services/eventNetworkingSummaryService', () => ({
  EventNetworkingSummaryService: {
    incrementLinkedInRequestsSent: (...args: unknown[]) =>
      mocks.incrementLinkedInRequestsSent(...args),
  },
}));

describe('POST /api/mobile/events/[id]/networking-outreach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
  });

  it('increments pending linkedin outreach without mutating event feedback', async () => {
    mocks.getFeedbackForEvent.mockResolvedValue({
      id: 'feedback-1',
      connectionsMade: 2,
    });
    mocks.incrementLinkedInRequestsSent.mockResolvedValue({
      id: 'summary-1',
      eventId: 'event-1',
      userId: 'user-1',
      linkedinRequestsSent: 5,
      lastOutreachLoggedAt: '2026-04-12T12:00:00.000Z',
      createdAt: '2026-04-12T12:00:00.000Z',
      updatedAt: '2026-04-12T12:00:00.000Z',
    });

    const response = await POST(
      new Request('http://localhost/api/mobile/events/event-1/networking-outreach', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ id: 'event-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.incrementLinkedInRequestsSent).toHaveBeenCalledWith(
      'event-1',
      'user-1',
      {}
    );
    expect(mobileLinkedInOutreachLogSchema.parse(payload.data)).toEqual({
      eventId: 'event-1',
      connectionsMade: 2,
      linkedinRequestsSent: 5,
    });
  });

  it('logs outreach even when no feedback row exists yet', async () => {
    mocks.getFeedbackForEvent.mockResolvedValue(null);
    mocks.incrementLinkedInRequestsSent.mockResolvedValue({
      id: 'summary-1',
      eventId: 'event-1',
      userId: 'user-1',
      linkedinRequestsSent: 1,
      lastOutreachLoggedAt: '2026-04-12T12:00:00.000Z',
      createdAt: '2026-04-12T12:00:00.000Z',
      updatedAt: '2026-04-12T12:00:00.000Z',
    });

    const response = await POST(
      new Request('http://localhost/api/mobile/events/event-1/networking-outreach', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ id: 'event-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.incrementLinkedInRequestsSent).toHaveBeenCalledWith(
      'event-1',
      'user-1',
      {}
    );
    expect(mobileLinkedInOutreachLogSchema.parse(payload.data).linkedinRequestsSent).toBe(1);
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await POST(
      new Request('http://localhost/api/mobile/events/event-1/networking-outreach', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ id: 'event-1' }),
      }
    );

    expect(response.status).toBe(401);
  });
});
