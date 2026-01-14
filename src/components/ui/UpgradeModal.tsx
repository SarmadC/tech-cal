'use client';

import { useMemo, useState, useEffect, type JSX } from 'react';
import { X, Sparkle, Lock, RocketLaunch, Hourglass, CalendarCheck, BookmarkSimple, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type UpgradeVariant = 'trialStart' | 'trialExpired' | 'featureLocked' | 'upgradePrompt';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  variant: UpgradeVariant;
  featureName?: string;
  onStartTrial?: () => Promise<void>;
  onUpgrade?: () => Promise<void>;
  ctaLabel?: string;
  description?: string;
}

interface VariantContent {
  title: string;
  description: string;
  primaryLabel: string;
  icon: JSX.Element;
}

/**
 * Generic upgrade modal with preset variants.
 * - trialStart: Emphasize starting the free trial.
 * - trialExpired: Trial ended, prompt upgrade.
 * - featureLocked: Contextual lock for a specific feature.
 * - upgradePrompt: General upgrade nudge.
 */
export function UpgradeModal({
  open,
  onClose,
  variant,
  featureName,
  onStartTrial,
  onUpgrade,
  ctaLabel,
  description,
}: UpgradeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  const content = useMemo<VariantContent>(() => {
    switch (variant) {
      case 'trialStart':
        return {
          title: 'Start your 7-day free trial',
          description:
            description ??
            'Unlock calendar sync, full recommendations, and unlimited history with a one-click trial.',
          primaryLabel: ctaLabel ?? 'Start free trial',
          icon: <RocketLaunch size={22} weight="fill" className="text-amber-600" />,
        };
      case 'trialExpired':
        return {
          title: 'Your trial ended',
          description:
            description ??
            'Keep calendar sync, full recommendations, and career insights by upgrading to Pro.',
          primaryLabel: ctaLabel ?? 'Upgrade to Pro',
          icon: <Hourglass size={22} weight="fill" className="text-amber-600" />,
        };
      case 'featureLocked':
        return {
          title: `${featureName ?? 'This feature'} is for Pro`,
          description:
            description ??
            'Upgrade to Pro to unlock this feature plus calendar sync, full recommendations, and unlimited history.',
          primaryLabel: ctaLabel ?? 'Upgrade to Pro',
          icon: <Lock size={22} weight="fill" className="text-amber-600" />,
        };
      default:
        return {
          title: 'Upgrade to Pro',
          description:
            description ??
            'Get calendar sync, full recommendations, and unlimited history with Pro.',
          primaryLabel: ctaLabel ?? 'Upgrade now',
          icon: <Sparkle size={22} weight="fill" className="text-amber-600" />,
        };
    }
  }, [variant, featureName, ctaLabel, description]);

  if (!open) return null;

  const handlePrimary = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);
    try {
      if (variant === 'trialStart' && onStartTrial) {
        await onStartTrial();
      } else if (onUpgrade) {
        await onUpgrade();
      }
    } catch (err) {
      console.error('Upgrade action failed', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again or contact support.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const featurePills = [
    { icon: <CalendarCheck size={14} weight="fill" />, label: 'Calendar sync' },
    { icon: <Sparkle size={14} weight="fill" />, label: 'Full recommendations' },
    { icon: <BookmarkSimple size={14} weight="fill" />, label: 'Unlimited bookmarks' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground shadow hover:bg-muted/80"
          aria-label="Close upgrade dialog"
        >
          <X size={18} weight="bold" />
        </button>

        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-8 ring-amber-100/40 dark:bg-amber-900/50 dark:text-amber-100 dark:ring-amber-900/30">
            {content.icon}
          </span>
          <div>
            <h2 id="upgrade-modal-title" className="text-lg font-semibold">
              {content.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{content.description}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {featurePills.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
            >
              {item.icon}
              {item.label}
            </span>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Maybe later
          </Button>
          <Button
            onClick={handlePrimary}
            className="bg-amber-600 text-white hover:bg-amber-600/90"
            disabled={isProcessing}
          >
            {isProcessing ? 'Opening...' : content.primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
