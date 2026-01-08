// src/components/common/UserMenu.tsx (Updated with API Keys removed)

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialIcon } from '@/components/ui/Icon';
import { generateConsistentAvatarUrl } from '@/services/avatarService';

export default function UserMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [emailCopied, setEmailCopied] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { user, signOut, loading } = useAuth();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset copied state when menu closes
    useEffect(() => {
        if (!isOpen) setTimeout(() => setEmailCopied(false), 300);
    }, [isOpen]);

    // Don't render anything if loading
    if (loading) {
        return (
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
        );
    }

    // Show login/signup buttons if not authenticated
    if (!user) {
        return (
            <div className="flex items-center space-x-3">
                <Link
                    href="/login"
                    className="text-sm font-medium text-foreground-secondary hover:text-accent-primary transition-colors"
                >
                    Sign In
                </Link>
                <Link
                    href="/signup"
                    className="bg-accent-primary hover:bg-accent-primary-hover !text-accent-primary-foreground font-medium py-2 px-4 rounded-lg transition-all text-sm"
                >
                    Sign Up
                </Link>
            </div>
        );
    }

    const handleSignOut = async () => {
        setIsOpen(false);
        await signOut();
    };

    const handleCopyEmail = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (user.email) {
            navigator.clipboard.writeText(user.email);
            setEmailCopied(true);
            setTimeout(() => setEmailCopied(false), 2000);
        }
    };

    const userDisplayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const userInitials = userDisplayName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
    const generatedAvatarUrl32 = generateConsistentAvatarUrl(userDisplayName, { size: 32 });
    const generatedAvatarUrl48 = generateConsistentAvatarUrl(userDisplayName, { size: 48 });

    return (
        <div className="relative" ref={menuRef}>
            {/* User Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group flex items-center space-x-2 p-1 pl-1 pr-2 rounded-full border transition-all duration-200 ${isOpen
                    ? 'bg-background-secondary border-border-color shadow-sm ring-2 ring-accent-primary/10'
                    : 'border-transparent hover:bg-background-secondary hover:border-border-subtle'
                    }`}
            >
                {/* Avatar */}
                <div className="relative">
                    {user.user_metadata?.avatar_url ? (
                        <Image
                            src={user.user_metadata.avatar_url}
                            alt="Profile"
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-background-primary"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : (
                        <Image
                            src={generatedAvatarUrl32}
                            alt="Profile"
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-background-primary"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    )}
                </div>

                <MaterialIcon
                    name="expand-more"
                    size={18}
                    className={`text-foreground-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180 text-foreground-primary' : 'group-hover:text-foreground-secondary'}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Anchor Triangle */}
                    <div className="absolute right-[14px] mt-[10px] w-3 h-3 bg-white dark:bg-gray-900 border-t border-l border-border-color transform rotate-45 z-[150] animate-in fade-in zoom-in-95 duration-200"></div>

                    <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-900 border border-border-color rounded-xl shadow-xl shadow-black/5 z-[150] overflow-hidden ring-1 ring-black/5 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">

                        {/* Account Card Header */}
                        <div className="p-2">
                            <div className="relative rounded-lg hover:bg-background-secondary transition-colors group">
                                <Link
                                    href="/dashboard/settings?tab=profile"
                                    onClick={() => setIsOpen(false)}
                                    className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/20"
                                >
                                    <span className="sr-only">Go to Profile</span>
                                </Link>

                                <div className="flex items-center space-x-3 p-3.5 relative z-10 pointer-events-none">
                                    {user.user_metadata?.avatar_url ? (
                                        <Image
                                            src={user.user_metadata.avatar_url}
                                            alt="Profile"
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 rounded-full object-cover ring-1 ring-border-subtle"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <Image
                                            src={generatedAvatarUrl48}
                                            alt="Profile"
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 rounded-full object-cover ring-1 ring-border-subtle"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                                        <p className="text-sm font-semibold text-foreground-primary leading-tight break-words group-hover:text-accent-primary transition-colors">
                                            {userDisplayName}
                                        </p>
                                        <button
                                            onClick={handleCopyEmail}
                                            className="pointer-events-auto relative z-20 cursor-pointer text-xs text-foreground-tertiary hover:text-foreground-secondary text-left flex items-start gap-1.5 transition-colors mt-1 w-full rounded focus:outline-none focus:text-foreground-primary"
                                            title="Click to copy email"
                                            type="button"
                                        >
                                            <span className="break-all">{user.email}</span>
                                            {emailCopied ? (
                                                <MaterialIcon name="check" size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <MaterialIcon name="copy" size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                                            )}
                                        </button>
                                    </div>
                                    <MaterialIcon name="chevron_right" size={18} className="text-foreground-quaternary/50 group-hover:text-foreground-tertiary transition-colors" />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border-color/60 mx-4 mb-1" />

                        {/* Account Section */}
                        <div className="py-2 px-2 mt-1">
                            <div className="px-3 py-1 mb-1 text-[10px] font-medium text-foreground-quaternary/70 uppercase tracking-widest">
                                Account
                            </div>

                            {/* Profile Link */}
                            <Link
                                href="/dashboard/settings?tab=profile"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background-secondary transition-colors group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/20"
                            >
                                <div className="flex items-center space-x-3">
                                    <MaterialIcon name="person" size={18} className="text-foreground-tertiary group-hover:text-foreground-primary transition-colors" />
                                    <span className="text-sm text-foreground-secondary group-hover:text-foreground-primary transition-colors">Profile</span>
                                </div>
                            </Link>

                            {/* Billing Link with Pro Badge */}
                            <Link
                                href="/dashboard/settings?tab=billing"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background-secondary transition-colors group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/20"
                            >
                                <div className="flex items-center space-x-3">
                                    <MaterialIcon name="credit-card" size={18} className="text-foreground-tertiary group-hover:text-foreground-primary transition-colors" />
                                    <span className="text-sm text-foreground-secondary group-hover:text-foreground-primary transition-colors">Billing</span>
                                </div>
                                <span className="text-[10px] font-bold bg-accent-primary text-white dark:text-black px-2 py-0.5 rounded-full shadow-sm">
                                    PRO
                                </span>
                            </Link>

                            {/* Settings Link */}
                            <Link
                                href="/dashboard/settings"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background-secondary transition-colors group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/20"
                            >
                                <div className="flex items-center space-x-3">
                                    <MaterialIcon name="settings" size={18} className="text-foreground-tertiary group-hover:text-foreground-primary transition-colors" />
                                    <span className="text-sm text-foreground-secondary group-hover:text-foreground-primary transition-colors">Settings</span>
                                </div>
                            </Link>
                        </div>

                        {/* Sign Out Section - Distinct Background */}
                        <div className="mt-1 border-t border-border-color bg-gray-50/50 dark:bg-gray-800/30 p-2">
                            <button
                                onClick={handleSignOut}
                                className="flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500/20"
                            >
                                <MaterialIcon name="logout" size={18} className="text-foreground-tertiary group-hover:text-red-500 transition-colors" />
                                <span className="text-sm text-foreground-secondary group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Sign out</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}