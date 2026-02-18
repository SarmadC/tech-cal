import { fireEvent, render, screen, waitFor } from '@/utils/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NetworkAttendingBadge from '@/components/social/NetworkAttendingBadge';

const mocks = vi.hoisted(() => ({
  sendTelemetryEvent: vi.fn(),
}));

vi.mock('@/utils/telemetryClient', () => ({
  sendTelemetryEvent: (...args: unknown[]) => mocks.sendTelemetryEvent(...args),
}));

describe('NetworkAttendingBadge telemetry', () => {
  const eventId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendTelemetryEvent.mockResolvedValue(undefined);
  });

  it('tracks impression and click events', async () => {
    render(
      <NetworkAttendingBadge
        eventId={eventId}
        telemetrySurface="discover_event_card"
        count={2}
        sampleAvatars={['https://example.com/a.png']}
      />
    );

    await waitFor(() => {
      expect(mocks.sendTelemetryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'network_badge_impression',
          context: { surface: 'discover_event_card' },
          metadata: expect.objectContaining({
            eventId,
            networkAttendingCount: 2,
          }),
        })
      );
    });

    fireEvent.click(screen.getByText('2 people you follow attending'));

    await waitFor(() => {
      expect(mocks.sendTelemetryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'network_badge_click',
          context: { surface: 'discover_event_card' },
          metadata: expect.objectContaining({
            eventId,
            networkAttendingCount: 2,
          }),
        })
      );
    });
  });

  it('does not render or emit telemetry when count is zero', () => {
    render(
      <NetworkAttendingBadge
        eventId={eventId}
        telemetrySurface="discover_event_card"
        count={0}
      />
    );

    expect(screen.queryByText(/in network|you follow attending/i)).not.toBeInTheDocument();
    expect(mocks.sendTelemetryEvent).not.toHaveBeenCalled();
  });

  it('does not emit duplicate impression telemetry on same-prop rerender', async () => {
    const { rerender } = render(
      <NetworkAttendingBadge
        eventId={eventId}
        telemetrySurface="discover_event_card"
        count={2}
      />
    );

    await waitFor(() => {
      expect(mocks.sendTelemetryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'network_badge_impression',
          context: { surface: 'discover_event_card' },
          metadata: expect.objectContaining({
            eventId,
            networkAttendingCount: 2,
          }),
        })
      );
    });

    rerender(
      <NetworkAttendingBadge
        eventId={eventId}
        telemetrySurface="discover_event_card"
        count={2}
      />
    );

    await waitFor(() => {
      const impressionCalls = mocks.sendTelemetryEvent.mock.calls.filter(
        ([payload]) => (payload as { eventType?: string })?.eventType === 'network_badge_impression'
      );
      expect(impressionCalls).toHaveLength(1);
    });
  });
});
