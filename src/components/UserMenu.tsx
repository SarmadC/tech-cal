// src/components/UserMenu.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings, LogOut, Calendar, BarChart3, ChevronDown } from 'lucide-react';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
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

  // Don't render anything if loading
  if (loading) {
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
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
          className="bg-accent-primary hover:bg-accent-primary-hover text-white font-medium py-2 px-4 rounded-lg transition-all text-sm"
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

  const userDisplayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const userInitials = userDisplayName.split(' ').map((n: string) => n[0]).join('').toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-background-secondary transition-colors"
      >
        {/* Avatar */}
        <div className="relative">
          {user.user_metadata?.avatar_url ? (
            <Image
              src={user.user_metadata.avatar_url}
              alt="Profile"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-accent-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {userInitials}
              </span>
            </div>
          )}
          
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </div>

        {/* User Info (hidden on mobile) */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-foreground-primary truncate max-w-32">
            {userDisplayName}
          </p>
          <p className="text-xs text-foreground-tertiary truncate max-w-32">
            {user.email}
          </p>
        </div>

        {/* Dropdown Arrow */}
        <ChevronDown 
          className={`w-4 h-4 text-foreground-tertiary transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-border-color rounded-xl shadow-lg z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-border-color bg-background-secondary">
            <div className="flex items-center space-x-3">
              {user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-accent-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {userInitials}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-primary truncate">
                  {userDisplayName}
                </p>
                <p className="text-xs text-foreground-tertiary truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-background-secondary transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-foreground-tertiary" />
              <span className="text-sm text-foreground-primary">Dashboard</span>
            </Link>

            <Link
              href="/calendar"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-background-secondary transition-colors"
            >
              <Calendar className="w-4 h-4 text-foreground-tertiary" />
              <span className="text-sm text-foreground-primary">Calendar</span>
            </Link>

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-background-secondary transition-colors"
            >
              <User className="w-4 h-4 text-foreground-tertiary" />
              <span className="text-sm text-foreground-primary">Profile</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-background-secondary transition-colors"
            >
              <Settings className="w-4 h-4 text-foreground-tertiary" />
              <span className="text-sm text-foreground-primary">Settings</span>
            </Link>
          </div>

          {/* Account Section */}
          <div className="border-t border-border-color py-2">
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                Account
              </p>
            </div>
            
            <Link
              href="/billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-2 hover:bg-background-secondary transition-colors"
            >
              <span className="text-sm text-foreground-primary">Billing & Plans</span>
              <span className="text-xs bg-accent-primary text-white px-2 py-0.5 rounded-full">
                Pro
              </span>
            </Link>

            <Link
              href="/api-keys"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-background-secondary transition-colors"
            >
              <span className="text-sm text-foreground-primary">API Keys</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-border-color py-2">
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}