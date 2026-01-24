// src/app/login/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sign In to Your Kure-Cal Account',
    description: 'Sign in to your Kure-Cal account to access your personalized tech events calendar, recommendations, saved events, and career insights.',
    robots: {
        index: false,
        follow: true,
    },
    openGraph: {
        title: 'Sign In to Your Kure-Cal Account | Kure-Cal',
        description: 'Sign in to your Kure-Cal account to access your personalized tech events calendar, recommendations, saved events, and career insights.',
        type: 'website',
    },
    twitter: {
        card: 'summary',
        title: 'Sign In to Your Kure-Cal Account | Kure-Cal',
        description: 'Sign in to your Kure-Cal account to access your personalized tech events calendar, recommendations, saved events, and career insights.',
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
