'use client';

import { useState, useRef, useEffect } from 'react';
import Link, { LinkProps } from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialIcon } from '@/components/ui/Icon';
import { generateConsistentAvatarUrl } from '@/services/avatarService';

interface MenuRowProps {
    icon?: string;
    label: string;
    subLabel?: string;
    rightContent?: React.ReactNode;
    href?: string;
    onClick?: () => void;
    danger?: boolean;
    className?: string; // Allow custom classes
}

// Internal reusable row component for consistency
const MenuRow = ({ icon, label, subLabel, rightContent, href, onClick, danger, className = '' }: MenuRowProps) => {
    const content = (
        <div className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors group select-none cursor-pointer w-full text-left ${danger
                ? 'hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'hover:bg-background-secondary'
            } ${className}`}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {icon && (
                    <MaterialIcon
                        name={icon}
                        size={18}
                        className={`transition-colors ${danger
                                ? 'text-foreground-tertiary group-hover:text-red-500'
                                : 'text-foreground-tertiary group-hover:text-foreground-primary'
                            }`}
                    />
                )}
                <div className="flex flex-col min-w-0">
                    <span className={`text-sm truncate ${danger
                            ? 'text-foreground-secondary group-hover:text-red-600 dark:group-hover:text-red-400'
                            : 'text-foreground-secondary group-hover:text-foreground-primary'
                        }`}>
                        {label}
                    </span>
                    {subLabel && (
                        <span className="text-xs text-foreground-tertiary truncate">
                            {subLabel}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center pl-3">
                {rightContent}
            </div>
        </div>
    );

    if (href) {
        return (
            <Link href={href} onClick={onClick} className="block w-full focus:outline-none">
                {content}
            </Link>
        );
    }

    return (
        <button onClick={onClick} className="block w-full focus:outline-none">
            {content}
        </button>
    );
};

export default function UserMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { user, profile, signOut, loading } = useAuth();

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

    const userDisplayName = profile?.fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const userAvatarUrl = profile?.avatarUrl || user.user_metadata?.avatar_url;
    const generatedAvatarUrl32 = generateConsistentAvatarUrl(userDisplayName, { size: 32 });

    const AvatarImage = ({ size = 32 }: { size?: number }) => (
        <Image
            src={userAvatarUrl || generateConsistentAvatarUrl(userDisplayName, { size })}
            alt="Profile"
            width={size}
            height={size}
            className={`rounded-full object-cover ring-1 ring-border-subtle ${size === 32 ? 'w-8 h-8' : 'w-5 h-5'}`}
            onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.src = generateConsistentAvatarUrl(userDisplayName, { size });
            }}
        />
    );

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
                <AvatarImage size={32} />
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

                    <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-gray-900 border border-border-color rounded-xl shadow-xl shadow-black/5 z-[150] overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right p-1.5 flex flex-col gap-0.5">

                        {/* Section 1: User Profile Header (Compact) */}
                        <Link
                            href="/dashboard/settings?tab=profile"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-background-secondary transition-colors group mb-1"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <AvatarImage size={32} />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium text-foreground-primary truncate group-hover:text-accent-primary transition-colors">
                                        {userDisplayName}
                                    </span>
                                    <span className="text-xs text-foreground-tertiary truncate">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                            <MaterialIcon name="chevron_right" size={16} className="text-foreground-quaternary/50 group-hover:text-foreground-tertiary transition-colors" />
                        </Link>

                        <div className="h-px bg-border-color my-0.5 mx-2" />

                        {/* Section 2: Navigation */}
                        <MenuRow
                            icon="person"
                            label="Profile"
                            href="/dashboard/settings?tab=profile"
                            onClick={() => setIsOpen(false)}
                        // rightContent={<MaterialIcon name="chevron_right" size={16} className="text-foreground-quaternary/50" />}
                        />
                        <MenuRow
                            icon="credit-card"
                            label="Billing"
                            href="/dashboard/settings?tab=billing"
                            onClick={() => setIsOpen(false)}
                            rightContent={
                                <span className="text-[10px] font-medium text-foreground-tertiary bg-background-tertiary px-1.5 py-0.5 rounded border border-border-subtle">
                                    PRO
                                </span>
                            }
                        />
                        <MenuRow
                            icon="settings"
                            label="Settings"
                            href="/dashboard/settings"
                            onClick={() => setIsOpen(false)}
                        // rightContent={<MaterialIcon name="chevron_right" size={16} className="text-foreground-quaternary/50" />}
                        />

                        <div className="h-px bg-border-color my-0.5 mx-2" />

                        {/* Section 3: Actions */}
                        <MenuRow
                            icon="logout"
                            label="Log Out"
                            onClick={handleSignOut}
                            danger
                        />

                    </div>
                </>
            )}
        </div>
    );
}