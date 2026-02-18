'use client';

import { useEffect, useState } from 'react';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { dispatchFollowStatusChanged } from '@/components/social/followEvents';
import { sendTelemetryEvent } from '@/utils/telemetryClient';

interface FollowStatusResponse {
  success?: boolean;
  data?: {
    isFollowing: boolean;
  };
  error?: string;
}

interface FollowMutationResponse {
  success?: boolean;
  error?: string;
}

interface FollowButtonProps {
  userId: string;
  compact?: boolean;
  initialIsFollowing?: boolean;
  onStatusChange?: (isFollowing: boolean) => void;
  telemetrySurface?: string;
}

export default function FollowButton({
  userId,
  compact = false,
  initialIsFollowing,
  onStatusChange,
  telemetrySurface = 'unknown',
}: FollowButtonProps) {
  const { user } = useAuth();
  const viewerId = user?.id;
  const { showError, showSuccess } = useSnackbar();
  const [isFollowing, setIsFollowing] = useState(Boolean(initialIsFollowing));
  const [hasLoadedStatus, setHasLoadedStatus] = useState(typeof initialIsFollowing === 'boolean');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setIsFollowing(Boolean(initialIsFollowing));
    setHasLoadedStatus(typeof initialIsFollowing === 'boolean');
  }, [initialIsFollowing, userId]);

  useEffect(() => {
    if (!viewerId || viewerId === userId || hasLoadedStatus) {
      return;
    }

    let isMounted = true;

    const loadFollowStatus = async () => {
      try {
        const response = await fetch(`/api/follows/status/${userId}`, {
          credentials: 'include',
        });

        const payload = (await response.json()) as FollowStatusResponse;
        if (!isMounted || !response.ok || !payload.success || !payload.data) {
          return;
        }

        setIsFollowing(payload.data.isFollowing);
      } catch {
        // no-op
      } finally {
        if (isMounted) {
          setHasLoadedStatus(true);
        }
      }
    };

    void loadFollowStatus();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedStatus, userId, viewerId]);

  if (!viewerId || viewerId === userId) {
    return null;
  }

  const handleFollowToggle = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const response = isFollowing
        ? await fetch(`/api/follows/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        : await fetch('/api/follows', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
            }),
          });

      const payload = (await response.json()) as FollowMutationResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to update follow status.');
      }

      const nextStatus = !isFollowing;
      setIsFollowing(nextStatus);
      setHasLoadedStatus(true);
      onStatusChange?.(nextStatus);
      dispatchFollowStatusChanged({
        actorUserId: viewerId,
        targetUserId: userId,
        isFollowing: nextStatus,
      });
      void sendTelemetryEvent({
        eventType: 'follow_action',
        context: {
          surface: telemetrySurface,
        },
        metadata: {
          action: nextStatus ? 'follow' : 'unfollow',
          targetUserId: userId,
        },
      });
      showSuccess(nextStatus ? 'User followed.' : 'User unfollowed.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update follow status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const label = isSubmitting
    ? isFollowing
      ? 'Unfollowing'
      : 'Following'
    : isFollowing
      ? isHovering
        ? 'Unfollow'
        : 'Following'
      : hasLoadedStatus
        ? 'Follow'
        : 'Loading';

  return (
    <Button
      type="button"
      variant={isFollowing ? 'outline' : 'secondary'}
      size={compact ? 'sm' : 'default'}
      disabled={isSubmitting || !hasLoadedStatus}
      onClick={handleFollowToggle}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={compact ? 'h-7 px-2 text-[11px]' : 'h-8 px-3 text-xs'}
      aria-pressed={isFollowing}
    >
      {isSubmitting && <CircleNotchIcon className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </Button>
  );
}
