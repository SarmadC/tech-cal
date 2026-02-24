// src/app/pricing/layout.tsx
import type { Metadata } from 'next';
import { SITE_URL } from '@/config/site';

export const metadata: Metadata = {
    title: 'Tech Event Calendar Pricing Plans',
    description: 'Simple, transparent pricing for Kure-Cal. Choose the plan that fits your needs—Free, Pro, or Team. Start organizing your tech events today.',
    keywords: ['Kure-Cal pricing', 'tech calendar pricing', 'event calendar subscription', 'developer tools pricing'],
    openGraph: {
        title: 'Tech Event Calendar Pricing Plans | Kure-Cal',
        description: 'Simple, transparent pricing for Kure-Cal. Choose from Free, Pro, or Team plans.',
        type: 'website',
        images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: {
        card: 'summary',
        title: 'Tech Event Calendar Pricing Plans | Kure-Cal',
        description: 'Simple, transparent pricing for Kure-Cal. Choose from Free, Pro, or Team plans.',
    },
};

export default function PricingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
