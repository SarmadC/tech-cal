// src/components/Navbar.tsx (Updated with Auth Integration)

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/UserMenu';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/#features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/blog', label: 'Blog' },
    { href: '/api-docs', label: 'API' },
  ];

  // Add authenticated-only links
  const authenticatedLinks = user ? [
    { href: '/calendar', label: 'Calendar' },
    { href: '/dashboard', label: 'Dashboard' },
  ] : [];

  const allNavLinks = [...navLinks, ...authenticatedLinks];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-accent-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-foreground-primary">TechCalendar</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {allNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-accent-primary ${
                  pathname === link.href ? 'text-accent-primary' : 'text-foreground-secondary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop User Menu / Auth Buttons */}
          <div className="hidden md:block">
            <UserMenu />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            {/* Navigation Links */}
            {allNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-sm font-medium text-foreground-secondary hover:text-accent-primary transition-colors py-2"
              >
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="border-t border-gray-200 pt-4">
              {!loading && (
                <>
                  {user ? (
                    /* Authenticated User Mobile Menu */
                    <div className="space-y-3">
                      {/* User Info */}
                      <div className="flex items-center space-x-3 p-3 bg-background-secondary rounded-lg">
                        <div className="w-10 h-10 bg-accent-primary rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground-primary truncate">
                            {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                          </p>
                          <p className="text-xs text-foreground-tertiary truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Mobile User Links */}
                      <Link
                        href="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-sm font-medium text-foreground-secondary hover:text-accent-primary transition-colors py-2"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-sm font-medium text-foreground-secondary hover:text-accent-primary transition-colors py-2"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-sm font-medium text-foreground-secondary hover:text-accent-primary transition-colors py-2"
                      >
                        Settings
                      </Link>
                    </div>
                  ) : (
                    /* Unauthenticated Mobile Menu */
                    <div className="space-y-3">
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-sm font-medium text-foreground-secondary hover:text-accent-primary transition-colors py-2"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-medium py-2 px-4 rounded-lg transition-all text-sm text-center"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}