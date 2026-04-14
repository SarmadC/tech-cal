import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileNetworkingContactRecordSchema } from '@kurecal/domain';

import { PATCH } from './route';

const mocks = vi.hoisted(() => ({
  applyAction: vi.fn(),
  createServiceClient: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  hydrateContact: vi.fn(),
  hydrateTarget: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
}));

vi.mock('@/services/userNetworkingContactService', () => ({
  UserNetworkingContactService: {
    applyAction: (...args: unknown[]) => mocks.applyAction(...args),
    hydrateContact: (...args: unknown[]) => mocks.hydrateContact(...args),
    hydrateTarget: (...args: unknown[]) => mocks.hydrateTarget(...args),
    toNetworkingState: (contact: {
      linkedinRequestedAt?: string | null;
      confirmedConnectedAt?: string | null;
    } | null) => ({
      status: contact?.confirmedConnectedAt
        ? 'connected'
        : contact?.linkedinRequestedAt
          ? 'requested'
          : 'none',
      linkedinRequestedAt: contact?.linkedinRequestedAt ?? null,
      confirmedConnectedAt: contact?.confirmedConnectedAt ?? null,
    }),
  },
}));

describe('PATCH /api/mobile/networking/contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      supabase: { kind: 'viewer-supabase' },
      user: { id: 'user-1' },
    });
    mocks.createServiceClient.mockReturnValue({ kind: 'read-supabase' });
  });

  it('logs a speaker request and returns the hydrated contact record', async () => {
    mocks.applyAction.mockResolvedValue({
      id: 'contact-1',
      viewerUserId: 'user-1',
      targetKind: 'speaker',
      targetUserId: null,
      targetSpeakerId: 'speaker-1',
      sourceEventId: 'event-1',
      linkedinRequestedAt: '2026-04-12T12:00:00.000Z',
      confirmedConnectedAt: null,
      createdAt: '2026-04-12T12:00:00.000Z',
      updatedAt: '2026-04-12T12:00:00.000Z',
    });
    mocks.hydrateContact.mockResolvedValue({
      row: { id: 'contact-1' },
      contact: {
        kind: 'speaker',
        id: 'speaker-1',
        username: null,
        name: 'Jamie Chen',
        avatarUrl: null,
        headline: 'Product leader',
        linkedinUrl: 'https://linkedin.com/in/jamie-chen',
        sourceEvent: null,
      },
      networkingState: {
        status: 'requested',
        linkedinRequestedAt: '2026-04-12T12:00:00.000Z',
        confirmedConnectedAt: null,
      },
    });

    const response = await PATCH(
      new Request('http://localhost/api/mobile/networking/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: {
            kind: 'speaker',
            id: 'speaker-1',
            sourceEventId: 'event-1',
          },
          action: 'mark_request_sent',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mobileNetworkingContactRecordSchema.parse(payload.data)).toEqual({
      contact: {
        kind: 'speaker',
        id: 'speaker-1',
        username: null,
        name: 'Jamie Chen',
        avatarUrl: null,
        headline: 'Product leader',
        linkedinUrl: 'https://linkedin.com/in/jamie-chen',
        sourceEvent: null,
      },
      networkingState: {
        status: 'requested',
        linkedinRequestedAt: '2026-04-12T12:00:00.000Z',
        confirmedConnectedAt: null,
      },
    });
  });

  it('returns a reset none state when a request is cleared', async () => {
    mocks.applyAction.mockResolvedValue(null);
    mocks.hydrateTarget.mockResolvedValue({
      kind: 'profile',
      id: 'profile-1',
      username: 'ada',
      name: 'Ada Lovelace',
      avatarUrl: null,
      headline: 'ML Engineer',
      linkedinUrl: null,
      sourceEvent: null,
    });

    const response = await PATCH(
      new Request('http://localhost/api/mobile/networking/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: {
            kind: 'profile',
            id: 'profile-1',
          },
          action: 'clear_request',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mobileNetworkingContactRecordSchema.parse(payload.data)).toEqual({
      contact: {
        kind: 'profile',
        id: 'profile-1',
        username: 'ada',
        name: 'Ada Lovelace',
        avatarUrl: null,
        headline: 'ML Engineer',
        linkedinUrl: null,
        sourceEvent: null,
      },
      networkingState: {
        status: 'none',
        linkedinRequestedAt: null,
        confirmedConnectedAt: null,
      },
    });
  });

  it('accepts clearing a confirmed connection and returns the downgraded requested state', async () => {
    mocks.applyAction.mockResolvedValue({
      id: 'contact-1',
      viewerUserId: 'user-1',
      targetKind: 'speaker',
      targetUserId: null,
      targetSpeakerId: 'speaker-1',
      sourceEventId: 'event-1',
      linkedinRequestedAt: '2026-04-12T12:00:00.000Z',
      confirmedConnectedAt: null,
      createdAt: '2026-04-12T12:00:00.000Z',
      updatedAt: '2026-04-13T12:00:00.000Z',
    });
    mocks.hydrateContact.mockResolvedValue({
      row: { id: 'contact-1' },
      contact: {
        kind: 'speaker',
        id: 'speaker-1',
        username: null,
        name: 'Jamie Chen',
        avatarUrl: null,
        headline: 'Product leader',
        linkedinUrl: 'https://linkedin.com/in/jamie-chen',
        sourceEvent: null,
      },
      networkingState: {
        status: 'requested',
        linkedinRequestedAt: '2026-04-12T12:00:00.000Z',
        confirmedConnectedAt: null,
      },
    });

    const response = await PATCH(
      new Request('http://localhost/api/mobile/networking/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: {
            kind: 'speaker',
            id: 'speaker-1',
            sourceEventId: 'event-1',
          },
          action: 'clear_connection',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mobileNetworkingContactRecordSchema.parse(payload.data)).toEqual({
      contact: {
        kind: 'speaker',
        id: 'speaker-1',
        username: null,
        name: 'Jamie Chen',
        avatarUrl: null,
        headline: 'Product leader',
        linkedinUrl: 'https://linkedin.com/in/jamie-chen',
        sourceEvent: null,
      },
      networkingState: {
        status: 'requested',
        linkedinRequestedAt: '2026-04-12T12:00:00.000Z',
        confirmedConnectedAt: null,
      },
    });
  });
});
