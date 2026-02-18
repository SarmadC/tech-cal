import { act, render, screen, waitFor, createMockUser } from '@/utils/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FollowListsPanel from '@/components/social/FollowListsPanel';
import {
  FOLLOW_STATUS_CHANGED_EVENT,
  type FollowStatusChangedDetail,
} from '@/components/social/followEvents';

vi.mock('@/components/social/FollowButton', () => ({
  default: ({ userId }: { userId: string }) => (
    <button type="button" data-testid={`mock-follow-${userId}`}>Follow</button>
  ),
}));

describe('FollowListsPanel count updates', () => {
  const profileUserId = '11111111-1111-4111-8111-111111111111';
  const viewerId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

      if (url.includes('/api/follows/followers') || url.includes('/api/follows/following')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [],
              nextCursor: null,
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
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });
  });

  it('updates tab label counts when follow status events are emitted', async () => {
    render(
      <FollowListsPanel
        profileUserId={profileUserId}
        followerCount={10}
        followingCount={5}
      />,
      {
        mockUser: createMockUser({
          id: viewerId,
        }),
      }
    );

    await waitFor(() => {
      expect(screen.getByText('No followers yet.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Followers (10)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Following (5)' })).toBeInTheDocument();

    act(() => {
      const detail: FollowStatusChangedDetail = {
        actorUserId: viewerId,
        targetUserId: profileUserId,
        isFollowing: true,
      };
      window.dispatchEvent(new CustomEvent(FOLLOW_STATUS_CHANGED_EVENT, { detail }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Followers (11)' })).toBeInTheDocument();
    });

    act(() => {
      const detail: FollowStatusChangedDetail = {
        actorUserId: profileUserId,
        targetUserId: '33333333-3333-4333-8333-333333333333',
        isFollowing: true,
      };
      window.dispatchEvent(new CustomEvent(FOLLOW_STATUS_CHANGED_EVENT, { detail }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Following (6)' })).toBeInTheDocument();
    });
  });

  it('updates visible row follower stats after follow event for that user', async () => {
    const listUserId = '33333333-3333-4333-8333-333333333333';

    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

      if (url.includes('/api/follows/followers') || url.includes('/api/follows/following')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              users: [
                {
                  id: listUserId,
                  fullName: 'List User',
                  avatarUrl: null,
                  username: 'list-user',
                  headline: 'Frontend Engineer',
                  followerCount: 4,
                  followingCount: 2,
                  followedAt: '2026-02-17T00:00:00.000Z',
                },
              ],
              nextCursor: null,
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
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    render(
      <FollowListsPanel
        profileUserId={profileUserId}
        followerCount={10}
        followingCount={5}
      />,
      {
        mockUser: createMockUser({
          id: viewerId,
        }),
      }
    );

    await waitFor(() => {
      expect(screen.getByText('4 followers · 2 following')).toBeInTheDocument();
    });

    act(() => {
      const detail: FollowStatusChangedDetail = {
        actorUserId: viewerId,
        targetUserId: listUserId,
        isFollowing: true,
      };
      window.dispatchEvent(new CustomEvent(FOLLOW_STATUS_CHANGED_EVENT, { detail }));
    });

    await waitFor(() => {
      expect(screen.getByText('5 followers · 2 following')).toBeInTheDocument();
    });
  });
});
