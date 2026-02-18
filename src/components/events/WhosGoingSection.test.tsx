import { act, fireEvent, render, screen, waitFor, createMockUser } from '@/utils/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import WhosGoingSection from './WhosGoingSection';

const mocks = vi.hoisted(() => ({
  sendTelemetryEvent: vi.fn(),
  blockCallbacks: new Map<string, (isBlocked: boolean) => void>(),
}));

vi.mock('@/utils/telemetryClient', () => ({
  sendTelemetryEvent: (...args: unknown[]) => mocks.sendTelemetryEvent(...args),
}));

vi.mock('@/components/ui/avatar-circles', () => ({
  AvatarCircles: () => <div data-testid="avatar-circles" />,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
}));

vi.mock('@/components/social/BlockUserButton', () => ({
  default: ({
    userId,
    onStatusChange,
  }: {
    userId: string;
    onStatusChange?: (isBlocked: boolean) => void;
  }) => {
    if (onStatusChange) {
      mocks.blockCallbacks.set(userId, onStatusChange);
    }

    return <button type="button" data-testid={`mock-block-${userId}`}>Block</button>;
  },
}));

vi.mock('@/components/social/FollowButton', () => ({
  default: ({ userId }: { userId: string }) => (
    <button type="button" data-testid={`mock-follow-${userId}`}>Follow</button>
  ),
}));

describe('WhosGoingSection block state behavior', () => {
  const eventId = '11111111-1111-4111-8111-111111111111';
  const attendeeId = '22222222-2222-4222-8222-222222222222';
  const attendeeName = 'Attendee One';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.blockCallbacks.clear();
    mocks.sendTelemetryEvent.mockResolvedValue(undefined);

    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

      if (url.includes(`/api/events/${eventId}/attendees`)) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              eventId,
              totalAttending: 1,
              visibleAttendeeCount: 1,
              networkAttendingCount: 1,
              viewerIsAttending: false,
              attendees: [
                {
                  id: attendeeId,
                  fullName: attendeeName,
                  avatarUrl: null,
                  username: 'attendee-one',
                  headline: 'Frontend Engineer',
                  isInNetwork: true,
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });
  });

  it('removes and restores attendee row based on block/unblock callbacks', async () => {
    render(<WhosGoingSection eventId={eventId} />, {
      mockUser: createMockUser({
        id: '33333333-3333-4333-8333-333333333333',
      }),
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View attendee list' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View attendee list' }));

    await waitFor(() => {
      expect(screen.getByText(attendeeName)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(`More actions for ${attendeeName}`));

    const statusCallback = mocks.blockCallbacks.get(attendeeId);
    expect(statusCallback).toBeDefined();

    act(() => {
      statusCallback?.(true);
    });

    await waitFor(() => {
      expect(screen.queryByText(attendeeName)).not.toBeInTheDocument();
    });

    act(() => {
      statusCallback?.(false);
    });

    await waitFor(() => {
      expect(screen.getByText(attendeeName)).toBeInTheDocument();
    });
  });

  it('shows the in-network attendee hint when network attendees are present', async () => {
    render(<WhosGoingSection eventId={eventId} />, {
      mockUser: createMockUser({
        id: '33333333-3333-4333-8333-333333333333',
      }),
    });

    await waitFor(() => {
      expect(screen.getByText('1 in your network')).toBeInTheDocument();
    });
  });
});
