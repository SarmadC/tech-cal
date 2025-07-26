// src/components/ClientLayout.tsx (Corrected)

'use client';

import { usePathname } from 'next/navigation';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const excludedPaths = ['/calendar', '/'];

    if (excludedPaths.includes(pathname)) {
        return <>{children}</>;
    }

    return (
        <>
            <Navbar />
            {/* ✅ Wrap children in a main tag with top padding to offset the navbar */}
            <main className="pt-16">
                {children}
            </main>
            <Footer />
        </>
    );
}