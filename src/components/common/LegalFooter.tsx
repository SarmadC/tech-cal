// src/components/common/LegalFooter.tsx
'use client';

import Link from 'next/link';

export default function LegalFooter() {
    return (
        <footer className="border-t border-border/40 bg-background/80 backdrop-blur-sm">
            <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-2">
                <span>© {new Date().getFullYear()} Kure-Cal</span>
                <span aria-hidden="true">•</span>
                <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                <span aria-hidden="true">•</span>
                <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                <span aria-hidden="true">•</span>
                <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            </div>
        </footer>
    );
}
