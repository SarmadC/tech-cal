'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { List, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { ThemeLogo } from '@/components/ui/ThemeLogo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import GlassSurface from '@/components/GlassSurface';

type NavItem = {
  name: string;
  href: string;
  onClick?: () => void;
};

interface MobileNavbarProps {
  className?: string;
  navItems?: NavItem[];
  showThemeToggle?: boolean;
  showLogo?: boolean;
}

const MobileNavbar: React.FC<MobileNavbarProps> = ({
  className = '',
  navItems = [],
  showThemeToggle = true,
  showLogo = true
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Handle scroll to add frosted glass effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((open) => {
      if (open) {
        setIsClosing(true);
        return open;
      }
      setIsClosing(false);
      return true;
    });
  }, []);

  const closeMenu = useCallback(() => {
    setIsClosing(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    if (isMenuOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeMenu, isMenuOpen]);

  // Scroll lock and focus management
  useEffect(() => {
    if (isMenuOpen && !isClosing) {
      document.body.style.overflow = 'hidden';
      // Focus close button when opened
      setTimeout(() => closeBtnRef.current?.focus(), 0);
    } else if (!isMenuOpen && !isClosing) {
      document.body.style.overflow = '';
      // Restore focus to hamburger
      setTimeout(() => menuBtnRef.current?.focus(), 0);
    }
  }, [isMenuOpen, isClosing]);

  // Default navigation items if none provided
  const defaultNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Calendar', href: '/calendar' },
    { name: 'Discover', href: '/discover' },
    { name: 'Profile', href: '/profile' }
  ];

  const menuItems: NavItem[] = navItems.length > 0 ? navItems : defaultNavItems;

  return (
    <>
      {/* Navbar */}
      <nav 
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
          isScrolled 
            ? "bg-white/70 dark:bg-gray-900/20 border-b border-white/20 dark:border-gray-700/30 shadow-lg dark:shadow-gray-900/20" 
            : "bg-transparent",
          className
        )}
      >
        <div className="flex items-center justify-end px-4 py-3">
          {/* Logo - Show on left if provided */}
          {showLogo && (
            <div className="flex items-center space-x-3 mr-auto">
              <ThemeLogo width={24} height={24} />
            </div>
          )}
          
          {/* Hamburger menu - Always on right */}
          {!isMenuOpen && (
            <button
              ref={menuBtnRef}
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/30 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-all duration-300"
              aria-label="Toggle menu"
            >
              <List size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className={cn(
              'absolute inset-0 bg-black/20 transition-opacity duration-300',
              isClosing ? 'opacity-0 ease-in' : 'opacity-100 ease-out',
              'motion-reduce:transition-none'
            )}
            onClick={closeMenu}
          />
          
          {/* Menu Panel */}
          <div
            className={cn(
              'absolute top-0 right-0 h-full w-80 max-w-[85vw] transform transition-transform duration-300',
              isClosing ? 'translate-x-full ease-in' : 'translate-x-0 ease-out',
              'motion-reduce:transition-none motion-reduce:transform-none'
            )}
            role="dialog"
            aria-modal="true"
            onTransitionEnd={() => {
              if (isClosing) {
                setIsMenuOpen(false);
                setIsClosing(false);
              }
            }}
          >
            <GlassSurface
              width="100%"
              height="100%"
              borderRadius={0}
              brightness={60}
              opacity={0.9}
              blur={15}
              displace={10}
              backgroundOpacity={0.1}
              saturation={1.2}
              distortionScale={-200}
              redOffset={5}
              greenOffset={15}
              blueOffset={25}
              mixBlendMode="screen"
              className="h-full"
              contentStyle={{ padding: 0 }}
            >
              <div className="flex flex-col h-full w-full">
              {/* Menu Header */}
              <div className="flex items-center justify-between w-full pl-4 border-b border-gray-200/50 dark:border-gray-700/40">
                {showThemeToggle && (
                  <div className="flex items-center">
                    <ThemeToggle />
                  </div>
                )}
                <button
                  ref={closeBtnRef}
                  onClick={closeMenu}
                  className="p-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-all duration-300"
                  aria-label="Close menu"
                >
                  <X size={20} className="text-gray-700 dark:text-gray-300" />
                </button>
              </div>

                {/* Menu Items */}
                <div className="flex-1 p-4">
                  <nav className="space-y-3">
                    {menuItems.map((item, index) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className={`block py-3 text-xl font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 rounded-lg transition-colors duration-300 ${isClosing ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right fade-in'}`}
                        style={{ animationDelay: isClosing ? '0ms' : `${100 + (index * 50)}ms` }}
                        onClick={() => {
                          closeMenu();
                          item.onClick?.();
                        }}
                      >
                        {item.name}
                      </a>
                    ))}
                  </nav>
                </div>

              {/* Menu Footer */}
              <div className={`p-4 border-t border-gray-200/50 dark:border-gray-700/40 ${isClosing ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right fade-in'}`} style={{ animationDelay: isClosing ? '0ms' : `${300 + (menuItems.length * 50)}ms` }}>
                <button className="block py-3 text-lg font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 rounded-lg transition-colors duration-300">
                  Settings
                </button>
              </div>
              </div>
            </GlassSurface>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavbar;
