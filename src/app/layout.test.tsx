import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => {
    const font = () => ({ className: 'font-class', variable: 'font-variable' });
    return {
        DM_Sans: font,
        Inter: font,
        JetBrains_Mono: font,
        Playfair_Display: font,
    };
});

vi.mock('next/headers', () => ({
    headers: vi.fn(async () => ({
        get: (name: string) => (name === 'x-nonce' ? 'layout-nonce' : null),
    })),
}));

vi.mock('@/components/seo', () => ({
    OrganizationJsonLd: ({ nonce }: { nonce?: string }) => (
        <script data-testid="organization-jsonld" nonce={nonce} />
    ),
    WebsiteJsonLd: ({ nonce }: { nonce?: string }) => (
        <script data-testid="website-jsonld" nonce={nonce} />
    ),
}));

vi.mock('@/components/providers/GoogleAnalytics', () => ({
    default: ({ nonce }: { nonce?: string }) => (
        <script data-testid="google-analytics" nonce={nonce} />
    ),
}));

vi.mock('@/components/providers/PostHogProvider', () => ({
    PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/providers/PostHogPageView', () => ({
    default: () => null,
}));

vi.mock('@/components/providers/PostHogIdentitySync', () => ({
    PostHogIdentitySync: () => null,
}));

vi.mock('@/components/providers/QueryProvider', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/providers/SupabaseProvider', () => ({
    SupabaseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/AuthContext', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/SubscriptionContext', () => ({
    SubscriptionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/common/ErrorBoundary', () => ({
    PageErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/ClientLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/providers/IconProvider', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/CheckoutContext', () => ({
    CheckoutProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/checkout/CheckoutOverlay', () => ({
    CheckoutOverlay: () => null,
}));

vi.mock('@/components/providers/ThemeProvider', () => ({
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/AccentContext', () => ({
    AccentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/SnackbarContext', () => ({
    SnackbarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import RootLayout from './layout';

function findElementsWithNonce(node: React.ReactNode): React.ReactElement<{ nonce?: string; children?: React.ReactNode }>[] {
    if (!React.isValidElement(node)) {
        return [];
    }

    const element = node as React.ReactElement<{
        children?: React.ReactNode;
        nonce?: string;
    }>;
    const matches = element.props.nonce ? [element] : [];
    const children = React.Children.toArray(element.props.children).flatMap((child) =>
        findElementsWithNonce(child)
    );

    return [...matches, ...children];
}

describe('RootLayout', () => {
    it('passes the request CSP nonce to global inline scripts', async () => {
        const tree = await RootLayout({ children: <main /> });
        const nonceProps = findElementsWithNonce(tree).map((element) => element.props.nonce);

        expect(nonceProps).toEqual(
            expect.arrayContaining(['layout-nonce', 'layout-nonce', 'layout-nonce'])
        );
    });
});
