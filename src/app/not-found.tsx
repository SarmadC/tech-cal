// src/app/not-found.tsx

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background-main flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="relative inline-block">
            <div className="text-[180px] font-bold text-accent-primary/10 select-none">404</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-accent-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-foreground-primary mb-4">
          Page Not Found
        </h1>
        <p className="text-lg text-foreground-secondary mb-8 max-w-md mx-auto">
          Oops! The page you&apos;re looking for doesn&apos;t exist. It might have been moved or deleted.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-6 rounded-lg transition-all"
          >
            Go to Homepage
          </Link>
          <Link
            href="/calendar"
            className="bg-background-secondary hover:bg-background-tertiary text-foreground-primary font-semibold py-3 px-6 rounded-lg transition-all border border-border-color"
          >
            View Calendar
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 p-6 bg-background-secondary rounded-xl border border-border-color">
          <h2 className="text-sm font-semibold text-foreground-primary mb-4">
            Helpful Links
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Link href="/" className="text-accent-primary hover:underline">
              Home
            </Link>
            <Link href="/calendar" className="text-accent-primary hover:underline">
              Calendar
            </Link>
            <Link href="/pricing" className="text-accent-primary hover:underline">
              Pricing
            </Link>
            <Link href="/api-docs" className="text-accent-primary hover:underline">
              API Docs
            </Link>
            <Link href="/blog" className="text-accent-primary hover:underline">
              Blog
            </Link>
            <Link href="/contact" className="text-accent-primary hover:underline">
              Contact
            </Link>
            <Link href="/dashboard" className="text-accent-primary hover:underline">
              Dashboard
            </Link>
            <Link href="/login" className="text-accent-primary hover:underline">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}