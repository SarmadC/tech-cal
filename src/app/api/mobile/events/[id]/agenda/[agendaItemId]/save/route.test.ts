import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileEventAgendaSaveSchema } from '@kurecal/domain';

import { DELETE, POST } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  setAgendaItemSaved: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/eventAgendaSaveService', () => ({
  EventAgendaSaveService: {
    setAgendaItemSaved: (...args: unknown[]) =>
      mocks.setAgendaItemSaved(...args),
  },
}));

describe('/api/mobile/events/[id]/agenda/[agendaItemId]/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.setAgendaItemSaved.mockResolvedValue(undefined);
  });

  it('saves an agenda item for the authenticated user', async () => {
    const response = await POST(
      new Request(
        'http://localhost/api/mobile/events/event-1/agenda/agenda-1/save',
        { method: 'POST' }
      ),
      {
        params: Promise.resolve({
          id: 'event-1',
          agendaItemId: 'agenda-1',
        }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.setAgendaItemSaved).toHaveBeenCalledWith(
      {
        eventId: 'event-1',
        agendaItemId: 'agenda-1',
        userId: 'user-1',
        isSaved: true,
      },
      {}
    );
    expect(mobileEventAgendaSaveSchema.parse(payload.data).isSaved).toBe(true);
  });

  it('removes an agenda item save for the authenticated user', async () => {
    const response = await DELETE(
      new Request(
        'http://localhost/api/mobile/events/event-1/agenda/agenda-1/save',
        { method: 'DELETE' }
      ),
      {
        params: Promise.resolve({
          id: 'event-1',
          agendaItemId: 'agenda-1',
        }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.setAgendaItemSaved).toHaveBeenCalledWith(
      expect.objectContaining({ isSaved: false }),
      {}
    );
    expect(mobileEventAgendaSaveSchema.parse(payload.data).isSaved).toBe(false);
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await POST(
      new Request(
        'http://localhost/api/mobile/events/event-1/agenda/agenda-1/save',
        { method: 'POST' }
      ),
      {
        params: Promise.resolve({
          id: 'event-1',
          agendaItemId: 'agenda-1',
        }),
      }
    );

    expect(response.status).toBe(401);
  });
});
