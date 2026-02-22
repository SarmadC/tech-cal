import { fireEvent, render, screen, waitFor } from '@/utils/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrackedEvent } from '@/types';
import MobileEventListCard from './MobileEventListCard';

const mocks = vi.hoisted(() => ({
  sendTelemetryEvent: vi.fn(),
}));

vi.mock('@/utils/telemetryClient', () => ({
  sendTelemetryEvent: (...args: unknown[]) => mocks.sendTelemetryEvent(...args),
}));

describe('MobileEventListCard network badge integration', () => {
  const eventId = '11111111-1111-4111-8111-111111111111';

  const event: TrackedEvent = {
    id: eventId,
    createdAt: '2026-02-17T00:00:00.000Z',
    title: 'GraphQL Summit',
    description: 'A summit for API engineers.',
    organizer: 'Kure',
    location: 'San Francisco',
    status: 'confirmed',
    startTime: '2026-03-01T10:00:00.000Z',
    endTime: '2026-03-01T12:00:00.000Z',
    sourceUrl: 'https://example.com/events/graphql-summit',
    livestreamUrl: null,
    registrationUrl: null,
    eventTypeId: '22222222-2222-4222-8222-222222222222',
    isTracked: false,
    networkAttendingCount: 2,
    networkSampleAvatars: ['https://example.com/avatar-a.png'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendTelemetryEvent.mockResolvedValue(undefined);
  });

  it('tracks badge click telemetry and keeps click-through behavior', async () => {
    const onClick = vi.fn();

    render(
      <MobileEventListCard
        event={event}
        onClick={onClick}
      />
    );

    await waitFor(() => {
      expect(mocks.sendTelemetryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'network_badge_impression',
          context: { surface: 'events_list_mobile_card' },
          metadata: expect.objectContaining({
            eventId,
            networkAttendingCount: 2,
          }),
        })
      );
    });

    fireEvent.click(screen.getByText('2 in network'));

    await waitFor(() => {
      expect(mocks.sendTelemetryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'network_badge_click',
          context: { surface: 'events_list_mobile_card' },
          metadata: expect.objectContaining({
            eventId,
            networkAttendingCount: 2,
          }),
        })
      );
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

