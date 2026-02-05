'use client';

import { useState, type ReactNode } from 'react';
import { X, WarningCircle, CalendarCheck, Sparkle, Clock } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useSubscriptionContext } from '@/contexts';
import { cn } from '@/lib/utils';

interface TrialExpiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade?: () => Promise<void> | void;
    /** Called when user explicitly chooses to continue with free tier */
    onContinueWithFree?: () => void;
    /** If true, prevents closing via X button - user must make explicit choice */
    blocking?: boolean;
    className?: string;
}

/**
 * Modal shown after a trial ends to prompt upgrade.
 *
 * In blocking mode, user must either:
 * 1. Click "Upgrade to Pro" to start checkout
 * 2. Click "Continue with Free" to acknowledge downgrade
 *
 * Keeps logic lightweight: parent controls open/close; upgrade defaults to Paddle checkout.
 */
export function TrialExpiredModal({
    isOpen,
    onClose,
    onUpgrade,
    onContinueWithFree,
    blocking = false,
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

    const handleContinueWithFree = () => {
        if (onContinueWithFree) {
            onContinueWithFree();
        }
        onClose();
    };

    const handleClose = () => {
        // In blocking mode, don't allow closing via X button
        if (blocking) return;
        onClose();
    };

    return (
        <div
            className={cn(
                'fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-md animate-in fade-in duration-300',
                className,
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trial-expired-title"
        >
            <div className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-zinc-800 bg-[#161618] p-0 shadow-2xl shadow-black/40 animate-in zoom-in-95 duration-300">
                {/* Only show close button in non-blocking mode */}
                {!blocking && (
                    <button
                        type="button"
                        onClick={handleClose}
                        className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                        aria-label="Close trial expired dialog"
                    >
                        <X size={18} />
                    </button>
                )}

                <div className="p-8 pb-6">
                    {/* Header Section */}
                    <div className="flex flex-col items-start gap-4">
                        <div className="space-y-1">
                            <h2 id="trial-expired-title" className="text-xl font-medium tracking-tight text-white">
                                Your trial has ended
                            </h2>
                            <p className="text-[14px] leading-relaxed text-zinc-400 max-w-[320px]">
                                {blocking
                                    ? 'Your 7-day Pro trial is over. Choose how you\'d like to continue.'
                                    : 'Keep calendar sync, full recommendations, and unlimited history by upgrading to Pro.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Features List - Clean, Monochromatic, Divided */}
                <div className="border-t border-zinc-800 bg-zinc-900/20">
                    <div className="px-6 py-3 border-b border-zinc-800/50">
                        <p className="text-[13px] font-medium text-zinc-500">
                            {blocking ? 'With Pro, you keep:' : 'Pro features you\'ll lose:'}
                        </p>
                    </div>

                    <div className="px-6 flex flex-col">
                        <FeatureRow
                            icon={<CalendarCheck size={16} weight="fill" />}
                            label="Calendar sync"
                            helper="Stay auto-updated across Google/Outlook."
                        />
                        <FeatureRow
                            icon={<Sparkle size={16} weight="fill" />}
                            label="Full career insights"
                            helper="Unlock detailed analytics and personalized scores."
                        />
                        <FeatureRow
                            icon={<WarningCircle size={16} weight="fill" />}
                            label="Unlimited history"
                            helper="Remove the 30-day limit on tracked events."
                            isLast
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 bg-[#161618]">
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={handleUpgrade}
                            className="h-10 w-full rounded-md bg-zinc-100 text-sm font-medium text-zinc-900 hover:bg-white transition-all shadow active:scale-[0.98]"
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Opening checkout...' : 'Upgrade to Pro — $12/month'}
                        </Button>

                        {blocking ? (
                            <Button
                                variant="outline"
                                onClick={handleContinueWithFree}
                                className="h-10 w-full rounded-md border-zinc-800 bg-transparent text-sm text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors"
                            >
                                Continue with Free Plan
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="h-10 w-full text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
                            >
                                Maybe later
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureRow({
    icon,
    label,
    helper,
    isLast = false
}: {
    icon: ReactNode;
    label: string;
    helper: string;
    isLast?: boolean;
}) {
    return (
        <div className={cn("flex items-center gap-4 py-4", !isLast && "border-b border-zinc-800/50")}>
            <span className="text-zinc-400 shrink-0">{icon}</span>
            <div className="min-w-0">
                <p className="text-[13px] font-medium text-zinc-200">
                    {label}
                </p>
                <p className="text-[12px] text-zinc-500 truncate">{helper}</p>
            </div>
        </div>
    );
}

export default TrialExpiredModal;
