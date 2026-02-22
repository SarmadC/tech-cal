'use client';

export const FOLLOW_STATUS_CHANGED_EVENT = 'social:follow-status-changed';

export interface FollowStatusChangedDetail {
  actorUserId: string;
  targetUserId: string;
  isFollowing: boolean;
}

export interface FollowCounts {
  followerCount: number;
  followingCount: number;
}

export function applyFollowDelta<T extends FollowCounts>(
  current: T,
  userId: string,
  detail: FollowStatusChangedDetail
): T {
  const delta = detail.isFollowing ? 1 : -1;
  let nextFollowerCount = current.followerCount;
  let nextFollowingCount = current.followingCount;

  if (detail.targetUserId === userId) {
    nextFollowerCount = Math.max(0, current.followerCount + delta);
  }

  if (detail.actorUserId === userId) {
    nextFollowingCount = Math.max(0, current.followingCount + delta);
  }

  if (
    nextFollowerCount === current.followerCount &&
    nextFollowingCount === current.followingCount
  ) {
    return current;
  }

  return {
    ...current,
    followerCount: nextFollowerCount,
    followingCount: nextFollowingCount,
  };
}

export function dispatchFollowStatusChanged(detail: FollowStatusChangedDetail): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<FollowStatusChangedDetail>(FOLLOW_STATUS_CHANGED_EVENT, {
      detail,
    })
  );
}
