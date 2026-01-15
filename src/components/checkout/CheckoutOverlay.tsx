'use client';

import { useEffect, useState, useRef } from 'react';
import { useCheckout } from '@/contexts/CheckoutContext';
import { PADDLE_PRICES, openInlineCheckout } from '@/lib/paddle';
import { Check, Shield } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { X } from '@phosphor-icons/react';

export function CheckoutOverlay() {
    const { isOpen, closeCheckout, checkoutOptions } = useCheckout();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const initialized = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Prices
    const monthlyPrice = '$12';
    const annualPrice = '$99';

    const price = checkoutOptions?.plan === 'annual' ? annualPrice : monthlyPrice;
    const period = checkoutOptions?.plan === 'annual' ? '/year' : '/month';
    const planName = checkoutOptions?.plan === 'annual' ? 'Pro Annual' : 'Pro Monthly';

    // Features to highlight
    const features = [
        'Calendar sync',
        'Full recommendations',
        'Unlimited bookmarks',
        'Priority support'
    ];

    useEffect(() => {
        if (isOpen && checkoutOptions && !initialized.current && containerRef.current) {
            const initCheckout = async () => {
                try {
                    setError(null);
                    setLoading(true);

                    const priceId = checkoutOptions.plan === 'annual'
                        ? PADDLE_PRICES.pro_annual
                        : PADDLE_PRICES.pro_monthly;

                    if (!priceId) {
                        throw new Error(`Price ID not found for plan: ${checkoutOptions.plan}`);
                    }

                    if (!checkoutOptions.userId) {
                        throw new Error('User ID required for checkout');
                    }

                    console.log('Initializing Paddle inline checkout...');

                    await openInlineCheckout({
                        priceId,
                        userId: checkoutOptions.userId,
                        userEmail: checkoutOptions.userEmail,
                        frameTarget: 'paddle-checkout-container', // We still pass ID for now as per Paddle JS requirements, but we ensure DOM is ready via ref
                    });

                    // Add a small delay for the iframe to actually render content
                    setTimeout(() => {
                        setLoading(false);
                        initialized.current = true;
                    }, 1000);
                } catch (err: any) {
                    console.error('Failed to initialize checkout:', err);
                    setError(err.message || 'Failed to load checkout. Please try again.');
                    setLoading(false);
                }
            };

            initCheckout();
        }

        // Reset initialization on close
        if (!isOpen) {
            initialized.current = false;
            setLoading(true); // Reset loading state
            setError(null);
        }

    }, [isOpen, checkoutOptions]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300"
            onClick={closeCheckout}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="w-full max-w-[900px] bg-[#141415] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300 ring-1 ring-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button - refined */}
                <button
                    onClick={closeCheckout}
                    className="absolute top-4 right-4 z-30 p-1.5 text-zinc-500 hover:text-white transition-all bg-transparent hover:bg-white/5 rounded-md"
                >
                    <X size={16} />
                </button>

                {/* Left Column: Order Summary - Notion/Linear minimalist style */}
                <div className="w-full md:w-[40%] p-8 bg-[#0E0E10] border-b md:border-b-0 md:border-r border-white/5 relative z-10 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <span className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Shield size={14} weight="fill" />
                            </span>
                            <span className="text-xs font-medium text-indigo-400 uppercase tracking-wide">Secure Checkout</span>
                        </div>

                        <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Upgrade to Pro</h2>
                        <p className="text-zinc-500 text-sm leading-relaxed mb-8">
                            Unlock the full power of your calendar with advanced insights and unlimited features.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-white">{price}</span>
                                <span className="text-zinc-500 font-medium">{period}</span>
                            </div>

                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-xs font-medium text-white">7-day free trial included</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 md:mt-12 space-y-3">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Everything in Pro</p>
                        {features.map((feature) => (
                            <div key={feature} className="flex items-center gap-3">
                                <Check size={14} weight="bold" className="text-white" />
                                <span className="text-sm text-zinc-300 font-medium">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Paddle Inline Frame */}
                <div className="w-full md:w-[60%] bg-[#141415] relative z-10 flex flex-col">
                    {/* Header for the checkout side */}
                    <div className="px-8 pt-8 pb-4 border-b border-white/5 flex justify-between items-center bg-[#141415]/50">
                        <h3 className="text-sm font-medium text-zinc-300">Payment Details</h3>
                        <div className="flex gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
                            {/* Card Icons placeholder */}
                            <div className="h-4 w-6 bg-white/10 rounded-sm"></div>
                            <div className="h-4 w-6 bg-white/10 rounded-sm"></div>
                        </div>
                    </div>

                    <div className="p-8 relative min-h-[500px] overflow-y-auto custom-scrollbar">
                        {loading && !error && (
                            <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#141415]">
                                <div className="w-full max-w-sm space-y-4 px-4">
                                    <div className="h-8 w-3/4 bg-white/5 rounded animate-pulse mb-6"></div>
                                    <div className="space-y-3">
                                        <div className="h-10 w-full bg-white/5 rounded animate-pulse"></div>
                                        <div className="h-10 w-full bg-white/5 rounded animate-pulse"></div>
                                    </div>
                                    <div className="pt-4">
                                        <div className="h-10 w-full bg-white/5 rounded animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-[#141415] text-center p-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 transition-transform hover:scale-110 duration-200">
                                    <X size={24} className="text-red-500" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">Something went wrong</h3>
                                <p className="text-sm text-zinc-500 mb-6 max-w-xs">{error}</p>
                                <button
                                    onClick={() => {
                                        setError(null);
                                        setLoading(true);
                                        initialized.current = false;
                                        // Trigger re-run of effect
                                        const event = new Event('resize');
                                        window.dispatchEvent(event);
                                    }}
                                    className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {/* Paddle Container - Applied CSS Filter bypass for dark mode. invert(0.922) turns White into #141415 */}
                        <div
                            id="paddle-checkout-container"
                            ref={containerRef}
                            className={cn(
                                "paddle-checkout-container w-full h-full transition-all duration-500 ease-out",
                                (loading || error) ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                            )}
                            style={{ filter: 'invert(0.922) hue-rotate(180deg)' }}
                        >
                            {/* Paddle will inject iframe here */}
                        </div>
                    </div>

                    {/* Footer for trust */}
                    <div className="px-8 py-4 bg-[#141415] border-t border-white/5 text-center">
                        <p className="text-[11px] text-zinc-600">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                            <br />Billed {period === '/year' ? 'annually' : 'monthly'} after trial ends.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
