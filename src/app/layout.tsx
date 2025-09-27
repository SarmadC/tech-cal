// src/app/layout.tsx 

// Force dynamic rendering to prevent SSR issues with SupabaseProvider
export const dynamic = 'force-dynamic';

import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import { Toaster } from 'sonner';

import "./styles/globals.css";
import './styles/premium-animation.css';
import './styles/premium-colors.css';
import './styles/smart-filters.css';
import './styles/utilities.css';
import '@/styles/layout-utilities.css';
import '@/components/calendar/mobile/mobile-calendar.css';
import './styles/landing-page.css';
import './styles/ChaosToOrder.css';   
import './styles/orbiting-circles.css';
import './styles/quick-date-picker.css';
// FullCalendar styles (loaded via CDN due to package export limitations)

import QueryProvider from '@/components/providers/QueryProvider';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import { AuthProvider } from "@/contexts/AuthContext";
import { PageErrorBoundary } from '@/components/common/ErrorBoundary';
import ClientLayout from "@/components/layout/ClientLayout";
import IconProvider from '../components/providers/IconProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SnackbarProvider } from '@/contexts/SnackbarContext';


const inter = Inter({ subsets: ["latin"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

// Refined Metadata for a more professional look
export const metadata: Metadata = {
    title: "Kure‑Cal: The All‑in‑One Tech Events Calendar",
    description: "All your tech events in one calendar. Conferences, meetups, launches, and livestreams—organized without the information overload.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* FullCalendar monolithic CSS (v6) */}
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.19/main.min.css" />
            </head>
            <body className={`${inter.className} ${dmSans.variable}`}>
                {/* Toaster should be high-level to be independent of other re-renders */}
                <Toaster position="top-center" richColors />

                {/* Global Error Boundary */}
                <PageErrorBoundary name="RootLayout">
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="dark"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {/* 1. SupabaseProvider is the outermost context provider */}
                        <SupabaseProvider>
                            {/* 2. AuthProvider is next, it needs supabase client */}
                            <AuthProvider>
                                {/* 3. QueryProvider is next, it might need auth context for queries */}
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
                            </AuthProvider>
                        </SupabaseProvider>
                    </ThemeProvider>
                </PageErrorBoundary>
            </body>
        </html>
    );
}