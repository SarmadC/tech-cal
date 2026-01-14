'use client';

import { Clock } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useSubscriptionContext } from '@/contexts';
import { cn } from '@/lib/utils';

interface TrialCountdownProps {
  className?: string;
  onUpgrade?: () => Promise<void> | void;
  showCta?: boolean;
}

/**
 * Inline banner for showing remaining trial time.
 * Renders nothing when the user is not actively trialing.
 */
export function TrialCountdown({
  className,
  onUpgrade,
  showCta = true,
}: TrialCountdownProps) {
  const {
    isTrialing,
    trialDaysLeft,
    openUpgrade,
    isLoading,
  } = useSubscriptionContext();

  if (isLoading || !isTrialing || trialDaysLeft === null) {
    return null;
  }

  const label = trialDaysLeft <= 0
    ? 'Trial ends today'
    : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your trial`;

  const handleUpgrade = async () => {
    try {
      if (onUpgrade) {
        await onUpgrade();
      } else {
        await openUpgrade();
      }
    } catch (error) {
      console.error('Failed to open upgrade checkout', error);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50/80 px-3 py-2 text-amber-900 shadow-sm backdrop-blur-sm dark:border-amber-200/40 dark:bg-amber-950/50 dark:text-amber-50',
        className,
      )}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-amber-600 shadow-inner dark:bg-amber-900/60">
          <Clock size={18} weight="fill" />
        </span>
        <div className="text-sm font-semibold">{label}</div>
      </div>

      {showCta && (
        <Button
          size="sm"
          className="h-9 bg-amber-600 text-white hover:bg-amber-600/90"
          onClick={handleUpgrade}
        >
          Upgrade to Pro
        </Button>
      )}
    </div>
  );
}

export default TrialCountdown;
