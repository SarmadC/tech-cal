import { headers } from 'next/headers';
import { FAQPageJsonLd } from '@/components/seo';
import PricingPageClient from './PricingPageClient';
import { CSP_NONCE_HEADER } from '@/lib/security/csp';

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

export default async function PricingPage() {
    const nonce = (await headers()).get(CSP_NONCE_HEADER) || undefined;

    return (
        <>
            <FAQPageJsonLd faqs={pricingFaqs} nonce={nonce} />
            <PricingPageClient />
        </>
    );
}
