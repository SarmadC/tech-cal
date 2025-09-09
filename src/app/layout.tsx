// src/app/layout.tsx 

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from 'sonner';

import "./styles/globals.css";
import './styles/premium-animation.css';
import './styles/premium-colors.css';
import './styles/smart-filters.css';
import './styles/utilities.css';
import '@/components/calendar/mobile/mobile-calendar.css';
import './styles/landing-page.css';
import './styles/ChaosToOrder.css';   

import QueryProvider from '@/components/providers/QueryProvider';
import { AuthProvider } from "@/contexts/AuthContext";
import ClientLayout from "@/components/layout/ClientLayout";


const inter = Inter({ subsets: ["latin"] });

// Refined Metadata for a more professional look
export const metadata: Metadata = {
    title: "Kure-Cal: Your Tech Event Command Center",
    description: "Consolidate, track, and discover tech events to accelerate your learning and career.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                {/* Toaster should be high-level to be independent of other re-renders */}
                <Toaster position="top-center" richColors />

                {/* 1. AuthProvider is the outermost context provider */}
                <AuthProvider>
                    {/* 2. QueryProvider is next, it might need auth context for queries */}
                    <QueryProvider>
                        {/* 3. UI/UX providers can go inside */}
                        {/* Temporarily disabled SmoothScrollProvider to fix double scrollbar issue */}
                        {/* <SmoothScrollProvider> */}
                            {/* 4. ClientLayout contains the Navbar, which needs auth context */}
                            <ClientLayout>
                                {children}
                            </ClientLayout>
                        {/* </SmoothScrollProvider> */}
                    </QueryProvider>
                </AuthProvider>
            </body>
        </html>
    );
}