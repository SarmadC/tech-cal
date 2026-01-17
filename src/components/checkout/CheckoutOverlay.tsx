'use client';

import { useEffect, useState, useRef } from 'react';
import { useCheckout } from '@/contexts/CheckoutContext';
import { PADDLE_PRICES, openInlineCheckout } from '@/lib/paddle';
import { Check, Cube, Command } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { X } from '@phosphor-icons/react';

export function CheckoutOverlay() {
    const { isOpen, closeCheckout, checkoutOptions } = useCheckout();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const initialized = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Prices
    const monthlyPrice = '$12.00';
    const annualPrice = '$99.00';

    const price = checkoutOptions?.plan === 'annual' ? annualPrice : monthlyPrice;
    const period = checkoutOptions?.plan === 'annual' ? '/year' : '/month';
    const planName = checkoutOptions?.plan === 'annual' ? 'Pro Plan — Annual' : 'Pro Plan — Monthly';

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
                        frameTarget: 'paddle-checkout-container',
                        successUrl: `${window.location.origin}/billing/success`,
                        theme: 'light' // Use light theme + filter for better visual control
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
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0C0C0D]/95 backdrop-blur-sm animate-in fade-in duration-300"
            role="dialog"
            aria-modal="true"
            onClick={closeCheckout}
        >
            {/* 1. The Header */}
            <div className="absolute top-0 left-0 w-full px-6 py-6 flex items-center justify-between z-20">
                {/* Top Left: Back */}
                <button
                    onClick={closeCheckout}
                    className="text-sm font-medium text-white/50 hover:text-white transition-colors flex items-center gap-1"
                >
                    ← Back
                </button>

                {/* Center: Checkout */}
                <h1 className="text-xl font-dm-sans text-white tracking-wide absolute left-1/2 -translate-x-1/2">
                    Checkout
                </h1>

                {/* Top Right: Cmd+Enter hint */}
                <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-white/30 border border-white/10 rounded px-2 py-1 bg-white/5">
                    <Command size={10} weight="bold" />
                    <span>Enter to pay</span>
                </div>
                {/* Mobile Close Button (replacing hint) */}
                <button
                    onClick={closeCheckout}
                    className="md:hidden text-white/50 p-2"
                >
                    <X size={20} />
                </button>
            </div>


            {/* 2. The Split View (Modal) */}
            <div
                className="w-full max-w-[1050px] h-[750px] max-h-[95vh] bg-[#141415] rounded-lg border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Column: The Form */}
                <div className="w-full md:w-[60%] h-full relative flex flex-col">
                    <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar relative">
                        {loading && !error && (
                            <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#141415]">
                                <div className="w-full max-w-sm space-y-4">
                                    <div className="h-8 w-1/3 bg-white/5 rounded animate-pulse mb-6"></div>
                                    <div className="space-y-3">
                                        <div className="h-12 w-full bg-white/5 rounded animate-pulse"></div>
                                        <div className="h-12 w-full bg-white/5 rounded animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                    <X size={20} className="text-red-500" />
                                </div>
                                <p className="text-sm text-zinc-400 mb-4">{error}</p>
                                <button
                                    onClick={() => {
                                        setError(null);
                                        setLoading(true);
                                        initialized.current = false;
                                        // Trigger re-run
                                        const event = new Event('resize');
                                        window.dispatchEvent(event);
                                    }}
                                    className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* Paddle Container */}
                        <div
                            id="paddle-checkout-container"
                            ref={containerRef}
                            className={cn(
                                "paddle-checkout-container w-full h-full transition-all duration-500",
                                (loading || error) ? "opacity-0" : "opacity-100"
                            )}
                            style={{ filter: 'invert(0.922) hue-rotate(180deg)' }}
                        >
                            {/* Paddle iframe injected here */}
                        </div>
                    </div>
                </div>

                {/* Right Column: The Receipt */}
                {/* Right Column: The Value Context */}
                <div className="w-full md:w-[40%] h-full bg-[#202020] border-t md:border-t-0 md:border-l border-white/5 p-8 flex flex-col relative overflow-hidden">
                    {/* Ambient Glow (Top Right) */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10 flex flex-col h-full">
                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-lg font-serif text-white mb-2">You're upgrading to Pro</h2>
                            <p className="text-zinc-500 text-sm">Unlock the full potential of your calendar.</p>
                        </div>

                        {/* Feature List */}
                        <ul className="space-y-5 mb-8">
                            {[
                                { title: "Unlimited History", desc: "Access your entire workspace archive." },
                                { title: "Guest Access", desc: "Collaborate with up to 50 guests per project." },
                                { title: "Priority Support", desc: "Direct line to our engineering team." }
                            ].map((item, i) => (
                                <li key={i} className="flex gap-3 items-start group">
                                    <div className="mt-0.5 w-4 h-4 rounded-full bg-[#2C2E36] flex items-center justify-center border border-white/10 group-hover:border-indigo-500/50 transition-colors shrink-0">
                                        <Check size={8} weight="bold" className="text-zinc-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-zinc-200 font-medium leading-none mb-1">{item.title}</div>
                                        <div className="text-xs text-zinc-500 leading-tight">{item.desc}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Divider */}
                        <div className="h-px w-full bg-white/5 mb-6" />

                        {/* Order Summary (Compact) */}
                        <div className="mt-auto">
                            <div className="flex items-center gap-2 mb-4 text-white/40">
                                <Cube size={14} weight="fill" />
                                <span className="text-[10px] font-medium uppercase tracking-wider">Summary</span>
                            </div>

                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-white font-medium text-sm">{planName}</p>
                                    <p className="text-xs text-zinc-500 mt-1">7-day free trial</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-serif text-white">{price}<span className="text-sm text-zinc-600 font-sans font-normal">{period}</span></div>
                                    <div className="text-[10px] text-zinc-500 mt-1">Due today: $0.00</div>
                                </div>
                            </div>
                        </div>

                        {/* Trust Badge - Removed */}
                        <div className="mt-6 pt-6 border-t border-dashed border-white/10">
                            <p className="text-[10px] text-zinc-600 leading-relaxed">
                                Secure payment via Paddle. By confirming, you agree to our Terms.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
