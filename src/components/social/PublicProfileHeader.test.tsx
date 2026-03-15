import { act, render, screen, waitFor } from '@/utils/test-utils';
import { describe, expect, it, vi } from 'vitest';
import PublicProfileHeader from '@/components/social/PublicProfileHeader';
import {
  FOLLOW_STATUS_CHANGED_EVENT,
  type FollowStatusChangedDetail,
} from '@/components/social/followEvents';

vi.mock('@/components/social/FollowButton', () => ({
  default: ({ userId }: { userId: string }) => (
    <button type="button" data-testid={`mock-follow-${userId}`}>Follow</button>
  ),
}));

describe('PublicProfileHeader count updates', () => {
  it('updates follower/following counts when follow status events are emitted', async () => {
    const profileUserId = '11111111-1111-4111-8111-111111111111';
    const viewerId = '22222222-2222-4222-8222-222222222222';

    render(
      <PublicProfileHeader
        profileUserId={profileUserId}
        username="profile-user"
        fullName="Profile User"
        headline="ML Engineer"
        avatarUrl={null}
        viewerId={viewerId}
        isViewerOwner={false}
        initialFollowerCount={12}
        initialFollowingCount={8}
        careerProfile={null}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();

    act(() => {
      const detail: FollowStatusChangedDetail = {
        actorUserId: viewerId,
        targetUserId: profileUserId,
        isFollowing: true,
      };
      window.dispatchEvent(new CustomEvent(FOLLOW_STATUS_CHANGED_EVENT, { detail }));
    });

    await waitFor(() => {
      expect(screen.getByText('13')).toBeInTheDocument();
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
      expect(screen.getByText('9')).toBeInTheDocument();
    });
  });
});
