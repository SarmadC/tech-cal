// src/app/pricing/page.tsx

'use client';

// Static generation for pricing page - pure client component with static content
export const dynamic = 'force-static';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FAQPageJsonLd } from '@/components/seo';
import { useAuth } from '@/contexts';
import { useCheckout } from '@/contexts/CheckoutContext';

// FAQ data for structured data
const pricingFaqs = [
    {
        question: 'Can I change plans anytime?',
        answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we will prorate any payments.',
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, MasterCard, American Express), as well as PayPal. Payments are securely processed by Paddle.',
    },
    {
        question: 'Is there a free trial for Pro plans?',
        answer: 'Yes! Pro comes with a 7-day free trial. Your card will only be charged after the trial ends.',
    },
    {
        question: 'What happens when my trial ends?',
        answer: 'After your 7-day trial, your subscription will automatically convert to a paid plan. You can cancel anytime during the trial with no charge.',
    },
];

const plans = [
    {
        name: 'Free',
        price: '$0',
        period: '',
        description: 'For individuals to make sense of calls, documents, and surveys',
        icon: (
            <svg className="h-8 w-8 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h6v6H4zM14 14h6v6h-6zM4 14h6v6H4zM14 4h6v6h-6z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        featuresHeader: 'WHATS INCLUDED',
        features: [
            'Full access to all tech events',
            'All filtering options (format, difficulty, budget)',
            'Career profile setup',
            'Save up to 5 events',
            'Last 30 days of history',
            'Top 3 personalized recommendations',
            'Basic career insights',
            'Email notifications'
        ],
        cta: 'Try Free',
        highlighted: false
    },
    {
        name: 'Pro',
        price: '$11',
        period: 'PER MONTH',
        annualPrice: 'BILLED YEARLY',
        description: 'For small teams to collaborate with advanced AI features',
        icon: (
            <svg className="h-8 w-8 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
        ),
        featuresHeader: 'EVERYTHING IN FREE, PLUS',
        features: [
            'Unlimited saved events',
            'Full learning history',
            'Google Calendar sync',
            'All personalized recommendations',
            'Detailed career insights & analytics',
            'Goal progress tracking',
            'Skill gap analysis'
        ],
        cta: 'Start free 7 day trial',
        highlighted: true
    },
    {
        name: 'Team',
        price: 'Coming Soon',
        period: '',
        description: 'For organizations scaling and standardizing across teams',
        icon: (
            <svg className="h-8 w-8 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        featuresHeader: 'EVERYTHING IN PRO, PLUS',
        features: [
            'Team calendars & sharing',
            'Admin dashboard',
            'Usage analytics',
            'Priority support',
            'Custom integrations'
        ],
        cta: 'Contact sales',
        highlighted: false
    }
];





const roadmapItems = [
    {
        quarter: 'Q2 2025',
        status: 'In build',
        statusClass: 'border-border bg-secondary text-foreground',
        title: 'Shareable Calendars',
        description: 'Publish curated calendars as public links so teams and communities can follow your event picks.',
        icon: (
            <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 12h8M12 8v8" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="4" width="18" height="16" rx="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        quarter: 'Q3 2025',
        status: 'Up next',
        statusClass: 'border-border bg-secondary/50 text-muted-foreground',
        title: 'Team Workspaces',
        description: 'Shared calendars, role-based access, and admin controls for fast-growing engineering teams.',
        icon: (
            <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="7.5" r="3" />
                <circle cx="16.5" cy="9" r="2.5" />
                <path d="M4 21a6 6 0 0 1 10 0" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 21a5 5 0 0 1 7 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        quarter: 'Q4 2025',
        status: 'Planned',
        statusClass: 'border-border bg-secondary/50 text-muted-foreground',
        title: 'AI Session Summaries',
        description: 'Auto-generated summaries for keynotes, workshops, and talks so you can skim before committing.',
        icon: (
            <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 6h8M8 10h8M8 14h5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="4" y="3" width="16" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        quarter: 'Q1 2026',
        status: 'Exploring',
        statusClass: 'border-border bg-secondary/50 text-muted-foreground',
        title: 'Smart Conflict Resolver',
        description: 'Detect overlaps and recommend alternatives across time zones, tracks, and venues.',
        icon: (
            <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        quarter: 'Q2 2026',
        status: 'Future',
        statusClass: 'border-border/50 bg-transparent text-muted-foreground/60',
        title: 'Native Mobile App',
        description: 'Offline browsing, saved tracks, and widget reminders with a full iOS + Android experience.',
        icon: (
            <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <path d="M12 18h.01" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    }
];



export default function PricingPage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const annualSavings = (12 * 12) - 99;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loading: userLoading } = useAuth();
    const { openCheckout, setCheckoutUser, isOpen } = useCheckout();

    useEffect(() => {
        if (user) {
            setCheckoutUser(user.id, user.email);
        }
    }, [user, setCheckoutUser]);

    useEffect(() => {
        const checkoutParam = searchParams.get('checkout');
        if (!checkoutParam || userLoading || !user || isOpen) return;

        const plan = checkoutParam === 'monthly' ? 'monthly' : 'annual';
        openCheckout(plan);

        const params = new URLSearchParams(searchParams);
        params.delete('checkout');
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [searchParams, userLoading, user, isOpen, openCheckout, router, pathname]);

    const handleStartTrial = () => {
        if (!user) {
            const nextUrl = `/pricing?checkout=${billingCycle}`;
            router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
            return;
        }

        setCheckoutUser(user.id, user.email);
        openCheckout(billingCycle);
    };

    return (
        <>
            {/* FAQ JSON-LD for rich snippets */}
            <FAQPageJsonLd faqs={pricingFaqs} />

            <div className="min-h-screen pt-20 bg-background text-foreground">
                {/* Hero */}
                <section className="relative px-6 pt-12 pb-24">
                    <div className="mx-auto max-w-6xl">
                        <div className="flex flex-col gap-12 md:flex-row md:items-end md:justify-between">
                            <div className="space-y-8">

                                <h1 className="text-5xl font-semibold tracking-tight text-foreground md:text-7xl font-dm-sans leading-[1.1]">
                                    Start for free<br />
                                    <span className="text-muted-foreground">Upgrade for insights</span>
                                </h1>
                            </div>

                            <div className="flex items-center gap-4 pb-2">

                                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                                    <button
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${billingCycle === 'monthly'
                                            ? 'bg-background shadow-sm text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        MONTHLY
                                    </button>
                                    <button
                                        onClick={() => setBillingCycle('annual')}
                                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${billingCycle === 'annual'
                                            ? 'bg-background shadow-sm text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        YEARLY
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Cards */}
                <section className="px-6 pb-12">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-8 flex flex-col gap-3 text-center">

                            <h2 className="text-3xl font-semibold text-foreground md:text-4xl font-dm-sans">
                                Pick the plan that matches your pace.
                            </h2>
                            <p className="mx-auto max-w-2xl text-base text-muted-foreground">
                                From solo developers to engineering teams—get the visibility you need to never miss a CFP, conference, or hackathon again.
                            </p>


                        </div>
                        <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
                            {plans.map((plan, index) => (
                                <div
                                    key={index}
                                    className={`group relative flex h-full flex-col rounded-xl border p-8 transition-all duration-300 hover:border-primary/50 ${plan.highlighted
                                        ? 'bg-secondary/50 border-primary/20'
                                        : 'bg-card border-border'
                                        }`}
                                >
                                    {/* Icon */}
                                    <div className="mb-6">
                                        {plan.icon}
                                    </div>

                                    {/* Header */}
                                    <div className="mb-8 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-medium text-foreground">
                                                {plan.name}
                                            </h3>
                                            {plan.highlighted && billingCycle === 'annual' && (
                                                <span className="rounded bg-[#5E6AD2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                                    Save 25%
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground/80 leading-relaxed min-h-[48px]">
                                            {plan.description}
                                        </p>
                                    </div>

                                    {/* Price */}
                                    <div className="mb-8">
                                        <div className="flex items-end gap-3">
                                            <span className={`font-medium tracking-tight text-foreground ${plan.price === 'Coming Soon' ? 'text-4xl' : 'text-6xl'}`}>
                                                {plan.name === 'Pro' && billingCycle === 'annual' ? '$8.25' : plan.price}
                                            </span>
                                            {plan.period && (
                                                <div className="flex flex-col mb-1.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                                        {plan.period}
                                                    </span>
                                                    {plan.name === 'Pro' && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                                            {billingCycle === 'annual' ? 'BILLED YEARLY' : 'BILLED MONTHLY'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* CTA Button */}
                                    <div className="mb-10">
                                        {plan.name === 'Pro' ? (
                                            <button
                                                onClick={handleStartTrial}
                                                className={`inline-flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-all ${plan.highlighted
                                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                    : 'border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
                                                    }`}
                                            >
                                                {plan.cta}
                                            </button>
                                        ) : (
                                            <Link
                                                href={plan.name === 'Team' ? '/contact' : '/signup'}
                                                className={`inline-flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-all ${plan.highlighted
                                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                    : 'border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
                                                    }`}
                                            >
                                                {plan.cta}
                                            </Link>
                                        )}
                                    </div>

                                    {/* Features Divider */}
                                    {plan.featuresHeader && (
                                        <div className="mb-4">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                                {plan.featuresHeader}
                                            </p>
                                        </div>
                                    )}

                                    {/* Features List */}
                                    <div className="space-y-4">
                                        <ul className="space-y-3">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground/80">
                                                    <span className={`mt-0.5 leading-relaxed hover:text-foreground transition-colors`}>
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>



                {/* Product Roadmap */}
                <section className="relative px-6 py-16 md:py-24">
                    <div className="relative mx-auto max-w-5xl">
                        <div className="text-center mb-14">

                            <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl font-dm-sans">
                                What's Next
                            </h2>
                            <p className="mt-4 text-base text-muted-foreground">
                                A quarterly look at how KureCal keeps getting smarter, faster, and more collaborative.
                            </p>
                        </div>

                        <div className="relative">
                            <div className="absolute left-[15px] top-6 bottom-6 w-px bg-border hidden md:block" />
                            <div className="space-y-4">
                                {roadmapItems.map((item, index) => (
                                    <div key={index} className="relative md:pl-12">
                                        <div className="absolute left-2 top-6 hidden h-3.5 w-3.5 rounded-full border border-border bg-background md:block z-10" />
                                        <div className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                                                <div className="shrink-0 pt-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    {item.icon}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-muted-foreground/60">
                                                            {item.quarter}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-base font-medium text-foreground">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>


            </div >
        </>
    );
}
