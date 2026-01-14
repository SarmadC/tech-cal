'use client';

import { useState, type ReactNode } from 'react';
import { X, WarningCircle, CalendarCheck, Sparkle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useSubscriptionContext } from '@/contexts';
import { cn } from '@/lib/utils';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => Promise<void> | void;
  className?: string;
}

/**
 * Modal shown after a trial ends to prompt upgrade.
 * Keeps logic lightweight: parent controls open/close; upgrade defaults to Paddle checkout.
 */
export function TrialExpiredModal({
  isOpen,
  onClose,
  onUpgrade,
  className,
}: TrialExpiredModalProps) {
  const { openUpgrade } = useSubscriptionContext();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (onUpgrade) {
        await onUpgrade();
      } else {
        await openUpgrade();
      }
    } catch (error) {
      console.error('Failed to open upgrade checkout', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-expired-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground shadow hover:bg-muted/80"
          aria-label="Close trial expired dialog"
        >
          <X size={18} weight="bold" />
        </button>

        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-8 ring-amber-100/40 dark:bg-amber-900/50 dark:text-amber-100 dark:ring-amber-900/30">
            <WarningCircle size={22} weight="fill" />
          </span>
          <div>
            <h2 id="trial-expired-title" className="text-lg font-semibold">
              Your trial ended
            </h2>
            <p className="text-sm text-muted-foreground">
              Keep calendar sync, full recommendations, and unlimited history by upgrading to Pro.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-dashed border-amber-200/70 bg-amber-50/60 p-4 dark:border-amber-200/30 dark:bg-amber-950/30">
          <FeatureRow
            icon={<CalendarCheck size={18} weight="fill" />}
            label="Calendar sync"
            helper="Stay auto-updated across Google/Outlook."
          />
          <FeatureRow
            icon={<Sparkle size={18} weight="fill" />}
            label="Full career insights"
            helper="Unlock detailed analytics and personalized scores."
          />
          <FeatureRow
            icon={<WarningCircle size={18} weight="fill" />}
            label="Unlimited history"
            helper="Remove the 30-day limit on tracked events."
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Maybe later
          </Button>
          <Button
            onClick={handleUpgrade}
            className="bg-amber-600 text-white hover:bg-amber-600/90"
            disabled={isProcessing}
          >
            {isProcessing ? 'Opening checkout...' : 'Upgrade to Pro'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  label,
  helper,
}: {
  icon: ReactNode;
  label: string;
  helper: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 text-amber-600 dark:text-amber-300">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-50">
          {label}
        </p>
        <p className="text-xs text-amber-900/80 dark:text-amber-100/80">{helper}</p>
      </div>
    </div>
  );
}

export default TrialExpiredModal;
