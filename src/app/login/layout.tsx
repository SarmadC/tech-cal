// src/app/login/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sign In',
    description: 'Sign in to your Kure-Cal account to access your personalized tech events calendar, recommendations, and more.',
    robots: {
        index: false,
        follow: true,
    },
    openGraph: {
        title: 'Sign In | Kure-Cal',
        description: 'Sign in to your Kure-Cal account.',
        type: 'website',
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
