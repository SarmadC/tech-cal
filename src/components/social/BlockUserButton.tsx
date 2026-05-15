'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';

interface BlockUserButtonProps {
  userId: string;
  username?: string | null;
  initialBlocked?: boolean;
  compact?: boolean;
  onStatusChange?: (isBlocked: boolean) => void;
}

export default function BlockUserButton({
  userId,
  username,
  initialBlocked = false,
  compact = false,
  onStatusChange,
}: BlockUserButtonProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const [isBlocked, setIsBlocked] = useState(initialBlocked);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || user.id === userId) {
    return null;
  }

  const handleBlockToggle = async () => {
    if (!isBlocked) {
      const handle = username ? `@${username}` : 'this user';
      const confirmed = window.confirm(`Block ${handle}? You will no longer see each other on social surfaces.`);
      if (!confirmed) {
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const response = isBlocked
        ? await fetch(`/api/blocks/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        : await fetch('/api/blocks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              blockedUserId: userId,
            }),
          });

      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to update block status.');
      }

      const nextStatus = !isBlocked;
      setIsBlocked(nextStatus);
      onStatusChange?.(nextStatus);
      showSuccess(nextStatus ? 'User blocked.' : 'User unblocked.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update block status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      variant={isBlocked ? 'outline' : 'ghost'}
      size={compact ? 'sm' : 'default'}
      onClick={handleBlockToggle}
      disabled={isSubmitting}
      className={compact ? 'h-7 px-2 text-[11px]' : 'h-8 px-3 text-xs'}
    >
      {isSubmitting ? (
        <>
          <BrandLoadingLogo className="h-3.5 w-3.5 text-current" inline label={null} size={14} />
          {isBlocked ? 'Unblocking' : 'Blocking'}
        </>
      ) : isBlocked ? (
        'Unblock'
      ) : (
        'Block'
      )}
    </Button>
  );
}
