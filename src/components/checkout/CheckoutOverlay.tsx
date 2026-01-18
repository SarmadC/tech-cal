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
    const [showMobileSummary, setShowMobileSummary] = useState(false);
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

                    // Fallback handled in paddle.ts now
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
                        theme: 'light'
                    });

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

        if (!isOpen) {
            initialized.current = false;
            setLoading(true);
            setError(null);
            setShowMobileSummary(false);
        }

    }, [isOpen, checkoutOptions]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0C0C0D] md:bg-[#0C0C0D]/95 md:backdrop-blur-sm animate-in fade-in duration-300"
            role="dialog"
            aria-modal="true"
        >
            {/* Desktop Header / Mobile Navbar */}
            <div className="md:absolute md:top-0 md:left-0 w-full px-4 py-4 md:px-6 md:py-6 flex items-center justify-between z-20 shrink-0 border-b border-white/5 md:border-none bg-[#0C0C0D] md:bg-transparent">
                <button
                    onClick={closeCheckout}
                    className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-1"
                >
                    <span className="hidden md:inline">← Back</span>
                    <span className="md:hidden">Cancel</span>
                </button>

                <h1 className="text-base md:text-xl font-dm-sans text-white tracking-wide absolute left-1/2 -translate-x-1/2">
                    Checkout
                </h1>

                <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-white/30 border border-white/10 rounded px-2 py-1 bg-white/5">
                    <Command size={10} weight="bold" />
                    <span>Enter to pay</span>
                </div>
                {/* Mobile Show Summary Toggle */}
                <button
                    onClick={() => setShowMobileSummary(!showMobileSummary)}
                    className="md:hidden text-xs font-medium text-indigo-400"
                >
                    {showMobileSummary ? 'Hide' : 'Show'} Order
                </button>
            </div>

            {/* Main Container */}
            <div
                className="w-full md:max-w-[1050px] h-full md:h-[750px] md:max-h-[95vh] bg-[#141415] md:rounded-lg border-none md:border border-white/10 md:shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300"
            >
                {/* Mobile Summary Accordion (Visible only on mobile when toggled) */}
                {showMobileSummary && (
                    <div className="md:hidden w-full bg-[#202020] border-b border-white/5 p-6 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-white font-medium text-sm">{planName}</p>
                                <p className="text-xs text-zinc-500 mt-1">7-day free trial</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-serif text-white">{price}<span className="text-sm text-zinc-600 font-sans font-normal">{period}</span></div>
                            </div>
                        </div>
                        <ul className="space-y-3">
                            {[
                                { title: "Unlimited History", desc: "Access your archive." },
                                { title: "Guest Access", desc: "Collaborate with guests." },
                                { title: "Priority Support", desc: "Direct engineering line." }
                            ].map((item, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <Check size={12} weight="bold" className="mt-0.5 text-indigo-400 shrink-0" />
                                    <div className="text-xs text-zinc-400">{item.title}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Left Column: The Form */}
                <div className="w-full md:w-[60%] h-full relative flex flex-col bg-[#141415]">
                    <div className="flex-1 p-4 md:p-10 overflow-y-auto custom-scrollbar relative">
                        {loading && !error && (
                            <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#141415]">
                                <div className="w-full max-w-sm space-y-4 px-8">
                                    <div className="h-8 w-1/3 bg-white/5 rounded animate-pulse mb-6"></div>
                                    <div className="space-y-3">
                                        <div className="h-10 w-full bg-white/5 rounded animate-pulse"></div>
                                        <div className="h-10 w-full bg-white/5 rounded animate-pulse"></div>
                                        <div className="h-32 w-full bg-white/5 rounded animate-pulse"></div>
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
                        </div>
                    </div>
                </div>

                {/* Right Column: The Value Context (Desktop Only) */}
                <div className="hidden md:flex w-full md:w-[40%] h-full bg-[#202020] border-l border-white/5 p-8 flex-col relative overflow-hidden">
                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="mb-8">
                            <h2 className="text-lg font-serif text-white mb-2">You're upgrading to Pro</h2>
                            <p className="text-zinc-500 text-sm">Unlock the full potential of your calendar.</p>
                        </div>

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

                        <div className="h-px w-full bg-white/5 mb-6" />

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
