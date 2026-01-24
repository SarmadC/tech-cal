// src/app/layout.tsx 

// Dynamic rendering only for authenticated routes that need SupabaseProvider
// Static routes (landing, pricing, legal, blog) will be statically generated

import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";

import "./styles/globals.css";
import './styles/premium-animation.css';
import './styles/premium-colors.css';
import './styles/smart-filters.css';
import './styles/utilities.css';
import '@/styles/layout-utilities.css';
// Calendar CSS moved to calendar-specific components for better performance
import './styles/landing-page.css';
import './styles/ChaosToOrder.css';
import './styles/orbiting-circles.css';
import './styles/quick-date-picker.css';
// FullCalendar styles (loaded via CDN due to package export limitations)

import QueryProvider from '@/components/providers/QueryProvider';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { PageErrorBoundary } from '@/components/common/ErrorBoundary';
import ClientLayout from "@/components/layout/ClientLayout";
import IconProvider from '../components/providers/IconProvider';
import { CheckoutProvider } from "@/contexts/CheckoutContext";
import { CheckoutOverlay } from "@/components/checkout/CheckoutOverlay";
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AccentProvider } from '@/contexts/AccentContext';
import { SnackbarProvider } from '@/contexts/SnackbarContext';
import { OrganizationJsonLd, WebsiteJsonLd } from '@/components/seo';


const inter = Inter({
    subsets: ["latin"],
    display: "swap",
});
const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-dm-sans",
    display: "swap"
});

// Refined Metadata for a more professional look
export const metadata: Metadata = {
    metadataBase: new URL('https://kure-cal.com'),
    title: {
        default: "Kure‑Cal: The All‑in‑One Tech Events Calendar",
        template: "%s | Kure‑Cal",
    },
    description: "All your tech events in one calendar. Conferences, meetups, launches, and livestreams—organized without the information overload.",
    keywords: ['tech events', 'tech calendar', 'conferences', 'meetups', 'developer events', 'hackathons', 'tech conferences 2026'],
    authors: [{ name: 'KureCal Team' }],
    creator: 'KureCal',
    publisher: 'KureCal',
    openGraph: {
        title: 'Kure-Cal: The All-in-One Tech Events Calendar',
        description: 'All your tech events in one calendar. Conferences, meetups, launches, and livestreams—organized without the information overload.',
        type: 'website',
        locale: 'en_US',
        siteName: 'Kure-Cal',
        url: 'https://kure-cal.com',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Kure-Cal: The All-in-One Tech Events Calendar',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Kure-Cal: The All-in-One Tech Events Calendar',
        description: 'All your tech events in one calendar. Conferences, meetups, launches, and livestreams—organized without the information overload.',
        images: ['/og-image.png'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    alternates: {
        canonical: 'https://kure-cal.com',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* FullCalendar CSS moved to calendar-specific components for better performance */}
                {/* Structured Data for SEO */}
                <OrganizationJsonLd />
                <WebsiteJsonLd />
            </head>
            <body className={`${inter.className} ${dmSans.variable}`}>

                {/* Global Error Boundary */}
                <PageErrorBoundary name="RootLayout">
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="dark"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <AccentProvider>
                            {/* 1. SupabaseProvider is the outermost context provider */}
                            <SupabaseProvider>
                                {/* 2. AuthProvider is next, it needs supabase client */}
                                <AuthProvider>
                                    {/* 3. CheckoutProvider needs Auth info but before Subscription */}
                                    <CheckoutProvider>
                                        <CheckoutOverlay />
                                        {/* 4. SubscriptionProvider depends on AuthProvider for user info */}
                                        <SubscriptionProvider>
                                            {/* 5. QueryProvider is next, it might need auth context for queries */}
                                            <QueryProvider>
                                                <SnackbarProvider>
                                                    {/* 3. UI/UX providers can go inside */}
                                                    {/* Temporarily disabled SmoothScrollProvider to fix double scrollbar issue */}
                                                    {/* <SmoothScrollProvider> */}
                                                    {/* 4. ClientLayout contains the Navbar, which needs auth context */}
                                                    <IconProvider>
                                                        <ClientLayout>
                                                            {children}
                                                        </ClientLayout>
                                                    </IconProvider>
                                                    {/* </SmoothScrollProvider> */}
                                                </SnackbarProvider>
                                            </QueryProvider>
                                        </SubscriptionProvider>
                                    </CheckoutProvider>
                                </AuthProvider>
                            </SupabaseProvider>
                        </AccentProvider>
                    </ThemeProvider>
                </PageErrorBoundary>
            </body>
        </html>
    );
}
