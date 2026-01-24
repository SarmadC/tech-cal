// src/app/signup/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Create Your Kure-Cal Account',
    description: 'Create your free Kure-Cal account. Get personalized tech event recommendations, calendar sync, and never miss a conference or meetup again.',
    keywords: ['sign up Kure-Cal', 'create account', 'tech events signup', 'developer calendar'],
    openGraph: {
        title: 'Create Your Kure-Cal Account | Kure-Cal',
        description: 'Create your free Kure-Cal account and never miss a tech event again.',
        type: 'website',
    },
    twitter: {
        card: 'summary',
        title: 'Create Your Kure-Cal Account | Kure-Cal',
        description: 'Create your free Kure-Cal account and never miss a tech event again.',
    },
};

export default function SignupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
