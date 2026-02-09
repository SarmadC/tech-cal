'use client';

import { useMemo, useState, useEffect, type JSX } from 'react';
import { X, Check, ArrowRight, Command } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSubscriptionContext } from '@/contexts';

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
}

/**
 * Redesigned UpgradeModal with "Spotlight" aesthetic (Linear x Notion).
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

    const { hasUsedTrial, openUpgrade: contextOpenUpgrade } = useSubscriptionContext();

    // Determine effective variant - override trialStart if trial already used
    const effectiveVariant = (variant === 'trialStart' && hasUsedTrial)
        ? 'upgradePrompt'
        : variant;

    const content = useMemo<VariantContent>(() => {
        switch (effectiveVariant) {
            case 'trialStart':
                return {
                    title: 'Start your 7-day free trial',
                    description:
                        description ??
                        'Unlock calendar sync, full recommendations, and unlimited history.',
                    primaryLabel: ctaLabel ?? 'Start free trial',
                };
            case 'trialExpired':
                return {
                    title: 'Your trial ended',
                    description:
                        description ??
                        'Keep calendar sync and insights by upgrading to Pro.',
                    primaryLabel: ctaLabel ?? 'Upgrade to Pro',
                };
            case 'featureLocked':
                return {
                    title: `${featureName ?? 'Pro Feature'}`,
                    description:
                        description ??
                        'Unlock this feature plus calendar sync and unlimited history.',
                    primaryLabel: ctaLabel ?? 'Upgrade to Pro',
                };
            case 'upgradePrompt':
                // Special handling if coming from a failed trial start
                if (variant === 'trialStart' && hasUsedTrial) {
                    return {
                        title: 'Your trial has ended',
                        description: 'You have already used your free trial. Please upgrade to Pro to continue.',
                        primaryLabel: 'Upgrade to Pro',
                    };
                }
                return {
                    title: 'Upgrade to Pro',
                    description:
                        description ??
                        'Get calendar sync, full recommendations, and unlimited history.',
                    primaryLabel: ctaLabel ?? 'Upgrade now',
                };
            default:
                return {
                    title: 'Upgrade to Pro',
                    description:
                        description ??
                        'Get calendar sync, full recommendations, and unlimited history.',
                    primaryLabel: ctaLabel ?? 'Upgrade now',
                };
        }
    }, [effectiveVariant, variant, featureName, ctaLabel, description, hasUsedTrial]);

    const handlePrimary = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setError(null);
        try {
            if (effectiveVariant === 'trialStart' && onStartTrial) {
                await onStartTrial();
            } else if (onUpgrade) {
                await onUpgrade();
            } else if (effectiveVariant === 'upgradePrompt' && contextOpenUpgrade) {
                // Fallback to context upgrade if no specific handler passed
                await contextOpenUpgrade();
            }
        } catch (err) {
            console.error('Upgrade action failed', err);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Something went wrong. Please try again.'
            );
        } finally {
            setIsProcessing(false);
        }
    };

    // Keyboard shortcut `Enter` to confirm
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handlePrimary();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, handlePrimary]); // Added handlePrimary to deps

    if (!open) return null;

    const features = [
        'Calendar sync',
        'Full recommendations',
        'Unlimited bookmarks',
        'Priority support',
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={onClose} // Close on click outside
        >
            <div
                onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
                className={cn(
                    "relative w-full max-w-[440px] overflow-hidden rounded-xl border border-white/10 p-0 shadow-2xl",
                    "bg-[#0E0E10]" // Deepest grey background
                )}
            >
                {/* Spotlight Effect */}
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-[300px] opacity-40 mix-blend-screen"
                    style={{
                        background: 'radial-gradient(circle at top, rgba(120, 119, 198, 0.4), transparent 60%)'
                    }}
                />

                {/* Close Button Removed */}

                <div className="relative z-10 p-8">

                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold tracking-tight text-white">
                            {content.title}
                        </h2>
                        <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
                            {content.description}
                        </p>
                    </div>

                    {/* Feature List (Notion Style) */}
                    <ul className="mb-8 space-y-2.5 pl-1">
                        {features.map((feature) => (
                            <li key={feature} className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                                <Check size={14} weight="bold" className="text-zinc-500" />
                                {feature}
                            </li>
                        ))}
                    </ul>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Actions - Command Stack Layout */}
                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            onClick={handlePrimary}
                            className={cn(
                                "group relative flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-medium transition-all", // Full width, slightly taller
                                "bg-white text-black hover:bg-zinc-200 hover:opacity-100", // Linear style button
                                isProcessing && "opacity-70 cursor-not-allowed"
                            )}
                            disabled={isProcessing}
                        >
                            <span>{isProcessing ? 'Processing...' : content.primaryLabel}</span>

                            {/* Keyboard Hint Visual - Only show if not processing */}
                            {!isProcessing && (
                                <div className="hidden items-center gap-0.5 opacity-40 sm:flex">
                                    <span className="sr-only">Press Enter</span>
                                </div>
                            )}
                            {/* Replaced graphic hint with just text/icon or separate element if strictly needed, 
                     but 'Enter' hint inside button is common in Linear */}
                            {!isProcessing && (
                                <span className="absolute right-3 hidden rounded border border-black/10 bg-black/5 px-1.5 py-0.5 text-[10px] font-bold text-black/60 sm:inline-block">
                                    ⏎
                                </span>
                            )}
                        </Button>

                        <button
                            onClick={onClose}
                            className="w-full text-center text-xs font-medium text-zinc-500/80 transition-colors hover:text-zinc-300"
                        >
                            Maybe later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UpgradeModal;
