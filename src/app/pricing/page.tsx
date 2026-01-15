// src/app/pricing/page.tsx

'use client';

// Static generation for pricing page - pure client component with static content
export const dynamic = 'force-static';

import { useState } from 'react';
import Link from 'next/link';
import { FAQPageJsonLd } from '@/components/seo';

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
        period: 'forever',
        description: 'Discover events and start your journey',
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
        cta: 'Get Started',
        highlighted: false
    },
    {
        name: 'Pro',
        price: '$12',
        period: '/month',
        annualPrice: '$99/year',
        description: 'Unlock automation and deep insights',
        features: [
            'Everything in Free, plus:',
            'Google Calendar sync',
            'Unlimited saved events',
            'Full learning history',
            'All personalized recommendations',
            'Detailed career insights & analytics',
            'Goal progress tracking',
            'Skill gap analysis',
            '7-day free trial'
        ],
        cta: 'Start 7-Day Trial',
        highlighted: true
    },
    {
        name: 'Team',
        price: 'Coming Soon',
        period: '',
        description: 'For teams and organizations',
        features: [
            'Everything in Pro',
            'Team calendars & sharing',
            'Admin dashboard',
            'Usage analytics',
            'Priority support',
            'Custom integrations'
        ],
        cta: 'Join Waitlist',
        highlighted: false
    }
];

export default function PricingPage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

    return (
        <>
            {/* FAQ JSON-LD for rich snippets */}
            <FAQPageJsonLd faqs={pricingFaqs} />

            <div className="min-h-screen bg-background-main pt-20">
                {/* Header */}
                <section className="py-16 px-6">
                    <div className="max-w-[1600px] mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground-primary mb-6">
                            Simple, Transparent Pricing
                        </h1>
                        <p className="text-xl text-foreground-secondary max-w-2xl mx-auto mb-8">
                            Choose the plan that fits your needs. Upgrade or downgrade anytime.
                        </p>

                        {/* Billing Toggle */}
                        <div className="inline-flex items-center gap-3 p-1 bg-background-secondary rounded-full border border-border-color">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                                    billingCycle === 'monthly'
                                        ? 'bg-accent-primary text-accent-primary-foreground'
                                        : 'text-foreground-secondary hover:text-foreground-primary'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle('annual')}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                                    billingCycle === 'annual'
                                        ? 'bg-accent-primary text-accent-primary-foreground'
                                        : 'text-foreground-secondary hover:text-foreground-primary'
                                }`}
                            >
                                Annual
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    billingCycle === 'annual'
                                        ? 'bg-white/20 text-accent-primary-foreground'
                                        : 'bg-green-500/10 text-green-500'
                                }`}>
                                    Save 17%
                                </span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Pricing Cards */}
                <section className="pb-20 px-6">
                    <div className="max-w-[1600px] mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            {plans.map((plan, index) => (
                                <div
                                    key={index}
                                    className={`
                  relative rounded-2xl p-8 transition-all
                  ${plan.highlighted
                                            ? 'bg-accent-primary text-accent-primary-foreground shadow-2xl scale-105'
                                            : 'bg-background-secondary border border-border-color hover:border-accent-primary/30'
                                        }
                `}
                                >
                                    {plan.highlighted && (
                                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                            <span className="bg-background-main text-accent-primary text-sm font-semibold px-4 py-1 rounded-full border border-border-default">
                                                Most Popular
                                            </span>
                                        </div>
                                    )}

                                    <div className="mb-8">
                                        <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? 'text-accent-primary-foreground' : 'text-foreground-primary'
                                            }`}>
                                            {plan.name}
                                        </h3>
                                        <div className="flex items-baseline mb-2">
                                            <span className={`text-4xl font-bold ${plan.highlighted ? 'text-accent-primary-foreground' : 'text-foreground-primary'
                                                }`}>
                                                {plan.name === 'Pro'
                                                    ? (billingCycle === 'annual' ? '$99' : '$12')
                                                    : plan.price
                                                }
                                            </span>
                                            <span className={`ml-2 ${plan.highlighted ? 'text-accent-primary-foreground opacity-80' : 'text-foreground-tertiary'
                                                }`}>
                                                {plan.name === 'Pro'
                                                    ? (billingCycle === 'annual' ? '/year' : '/month')
                                                    : plan.period
                                                }
                                            </span>
                                        </div>
                                        {plan.name === 'Pro' && billingCycle === 'annual' && (
                                            <p className={`text-sm mb-2 ${plan.highlighted ? 'text-accent-primary-foreground opacity-70' : 'text-foreground-tertiary'}`}>
                                                $8.25/month, billed annually
                                            </p>
                                        )}
                                        {plan.name === 'Pro' && billingCycle === 'monthly' && (
                                            <p className={`text-sm mb-2 ${plan.highlighted ? 'text-accent-primary-foreground opacity-70' : 'text-foreground-tertiary'}`}>
                                                or $99/year (save 17%)
                                            </p>
                                        )}
                                        <p className={
                                            plan.highlighted ? 'text-accent-primary-foreground opacity-80' : 'text-foreground-secondary'
                                        }>
                                            {plan.description}
                                        </p>
                                    </div>

                                    <ul className="space-y-4 mb-8">
                                        {plan.features.map((feature, featureIndex) => (
                                            <li key={featureIndex} className="flex items-start">
                                                <svg
                                                    className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-accent-primary-foreground' : 'text-accent-primary'
                                                        }`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className={
                                                    plan.highlighted ? 'text-accent-primary-foreground opacity-90' : 'text-foreground-secondary'
                                                }>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Link
                                        href={
                                            plan.name === 'Team'
                                                ? '/contact'
                                                : plan.name === 'Pro'
                                                    ? `/checkout?plan=${billingCycle}`
                                                    : '/signup'
                                        }
                                        className={`
                    block w-full text-center font-semibold py-3 px-6 rounded-lg transition-all
                    ${plan.highlighted
                                                ? 'bg-background-main text-accent-primary hover:bg-background-secondary border border-border-default'
                                                : 'bg-accent-primary !text-accent-primary-foreground hover:bg-accent-primary-hover'
                                            }
                  `}
                                    >
                                        {plan.cta}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-20 bg-background-secondary">
                    <div className="max-w-[1600px] mx-auto px-6">
                        <h2 className="text-3xl font-bold text-center text-foreground-primary mb-12">
                            Frequently Asked Questions
                        </h2>

                        <div className="space-y-6">
                            {pricingFaqs.map((faq, index) => (
                                <div key={index} className="bg-background-main rounded-xl p-6 border border-border-color">
                                    <h3 className="text-lg font-semibold text-foreground-primary mb-2">
                                        {faq.question}
                                    </h3>
                                    <p className="text-foreground-secondary">
                                        {faq.answer}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-background-main">
                    <div className="max-w-[1600px] mx-auto px-6 text-center">
                        <h2 className="text-3xl font-bold text-foreground-primary mb-4">
                            Ready to Never Miss a Tech Event?
                        </h2>
                        <p className="text-xl text-foreground-secondary mb-8">
                            Join thousands of professionals staying ahead with KureCal
                        </p>
                        <Link
                            href="/signup"
                            className="inline-block bg-accent-primary hover:bg-accent-primary-hover text-accent-primary-foreground font-semibold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                        >
                            Start Free Today
                        </Link>
                    </div>
                </section>
            </div>
        </>
    );
}
