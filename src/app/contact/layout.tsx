// src/app/contact/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact the Kure-Cal Team',
    description: 'Get in touch with the Kure-Cal team. Have questions about our tech events calendar? Want to discuss enterprise plans or partnerships? We\'re here to help.',
    keywords: ['contact Kure-Cal', 'tech calendar support', 'event calendar help', 'enterprise plans'],
    openGraph: {
        title: 'Contact the Kure-Cal Team | Kure-Cal',
        description: 'Get in touch with the Kure-Cal team. We\'re here to help with any questions.',
        type: 'website',
    },
    twitter: {
        card: 'summary',
        title: 'Contact the Kure-Cal Team | Kure-Cal',
        description: 'Get in touch with the Kure-Cal team. We\'re here to help with any questions.',
    },
};

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
