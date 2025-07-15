// src/app/pricing/page.tsx

'use client';

import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for individuals getting started',
    features: [
      'Access to all public tech events',
      'Basic filtering by category',
      'Export to calendar (up to 10/month)',
      'Email notifications',
      'Mobile-friendly web app'
    ],
    cta: 'Get Started',
    highlighted: false
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'For professionals who need more',
    features: [
      'Everything in Free',
      'Unlimited calendar exports',
      'Advanced filtering & search',
      'Custom event recommendations',
      'Priority notifications',
      'Calendar sync (Google, Outlook)',
      'No ads'
    ],
    cta: 'Start Free Trial',
    highlighted: true
  },
  {
    name: 'Team',
    price: '$29',
    period: '/month',
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Shared team calendars',
      'Admin dashboard',
      'API access',
      'Custom integrations',
      'Priority support',
      'SSO authentication'
    ],
    cta: 'Contact Sales',
    highlighted: false
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background-main pt-20">
      {/* Header */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground-primary mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-foreground-secondary max-w-2xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`
                  relative rounded-2xl p-8 transition-all
                  ${plan.highlighted
                    ? 'bg-accent-primary text-white shadow-2xl scale-105'
                    : 'bg-background-secondary border border-border-color hover:border-accent-primary/30'
                  }
                `}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-white text-accent-primary text-sm font-semibold px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className={`text-2xl font-bold mb-2 ${
                    plan.highlighted ? 'text-white' : 'text-foreground-primary'
                  }`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline mb-4">
                    <span className={`text-4xl font-bold ${
                      plan.highlighted ? 'text-white' : 'text-foreground-primary'
                    }`}>
                      {plan.price}
                    </span>
                    <span className={`ml-2 ${
                      plan.highlighted ? 'text-white/80' : 'text-foreground-tertiary'
                    }`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={
                    plan.highlighted ? 'text-white/80' : 'text-foreground-secondary'
                  }>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <svg
                        className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                          plan.highlighted ? 'text-white' : 'text-accent-primary'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={
                        plan.highlighted ? 'text-white/90' : 'text-foreground-secondary'
                      }>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.name === 'Team' ? '/contact' : '/calendar'}
                  className={`
                    block w-full text-center font-semibold py-3 px-6 rounded-lg transition-all
                    ${plan.highlighted
                      ? 'bg-white text-accent-primary hover:bg-gray-100'
                      : 'bg-accent-primary text-white hover:bg-accent-primary-hover'
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
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground-primary mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-background-main rounded-xl p-6 border border-border-color">
              <h3 className="text-lg font-semibold text-foreground-primary mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-foreground-secondary">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately,
                and we&apos;ll prorate any payments.
              </p>
            </div>

            <div className="bg-background-main rounded-xl p-6 border border-border-color">
              <h3 className="text-lg font-semibold text-foreground-primary mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-foreground-secondary">
                We accept all major credit cards (Visa, MasterCard, American Express),
                as well as PayPal and ACH transfers for Team plans.
              </p>
            </div>

            <div className="bg-background-main rounded-xl p-6 border border-border-color">
              <h3 className="text-lg font-semibold text-foreground-primary mb-2">
                Is there a free trial for Pro plans?
              </h3>
              <p className="text-foreground-secondary">
                Yes! All Pro plans come with a 14-day free trial. No credit card required to start.
              </p>
            </div>

            <div className="bg-background-main rounded-xl p-6 border border-border-color">
              <h3 className="text-lg font-semibold text-foreground-primary mb-2">
                Do you offer discounts for students or non-profits?
              </h3>
              <p className="text-foreground-secondary">
                We offer 50% off Pro plans for students and verified non-profit organizations.
                Contact support with proof of eligibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background-main">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground-primary mb-4">
            Ready to Never Miss a Tech Event?
          </h2>
          <p className="text-xl text-foreground-secondary mb-8">
            Join thousands of professionals staying ahead with TechCalendar
          </p>
          <Link
            href="/calendar"
            className="inline-block bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Start Free Today
          </Link>
        </div>
      </section>
    </div>
  );
}