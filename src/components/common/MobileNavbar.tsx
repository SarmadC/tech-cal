'use client';

import React, { useState, useEffect } from 'react';
import { List, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { ThemeLogo } from '@/components/ui/ThemeLogo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { usePathname } from 'next/navigation';

interface MobileNavbarProps {
  className?: string;
  showHamburgerButton?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

const MobileNavbar: React.FC<MobileNavbarProps> = ({
  className = '',
  showHamburgerButton = true,
  isOpen: externalIsOpen,
  onToggle: externalOnToggle
}) => {
  const [internalIsMenuOpen, setInternalIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Use external control if provided, otherwise use internal state
  const isMenuOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsMenuOpen;
  const setIsMenuOpen = externalOnToggle ? () => externalOnToggle() : setInternalIsMenuOpen;

  // Handle scroll to add frosted glass effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    if (isMenuOpen) {
      // Start closing animation
      setIsClosing(true);
      // Wait for animation to complete before hiding
      setTimeout(() => {
        setIsMenuOpen(false);
        setIsClosing(false);
      }, 300); // Match animation duration
    } else {
      setIsMenuOpen(true);
    }
  };

  const closeMenu = () => {
    if (isMenuOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsMenuOpen(false);
        setIsClosing(false);
      }, 300);
    }
  };

  const navItems = [
    { href: '/discover', label: 'Discover' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/hackathons', label: 'Hackathons' },
    { href: '/dashboard/settings', label: 'Settings' }
  ];

  return (
    <>
      {/* Navbar */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 md:hidden",
          "transition-colors duration-500 ease-in-out",
          isScrolled
            ? "bg-white/70 dark:bg-gray-900/20 backdrop-blur-md border-b border-white/20 dark:border-gray-700/30 shadow-lg dark:shadow-gray-900/20"
            : "bg-transparent",
          className
        )}
      >
        <div className="flex items-center justify-end px-4 py-3">
          {/* Hamburger menu - Hide when menu is open or when showHamburgerButton is false */}
          {!isMenuOpen && showHamburgerButton && (
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg transition-all duration-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
              aria-label="Toggle menu"
            >
              <List size={24} className="text-gray-700 dark:text-gray-300 transition-colors duration-500 ease-in-out" />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className={`fixed inset-0 z-[60] md:hidden ${isClosing ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'}`}>
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/20 backdrop-blur-sm ${isClosing ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'}`}
            onClick={closeMenu}
          />

          {/* Menu Panel */}
          <div className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white/90 dark:bg-gray-900/30 backdrop-blur-md border-l border-white/20 dark:border-gray-700/40 shadow-xl dark:shadow-gray-900/40 transition-all duration-500 ease-in-out ${isClosing ? 'animate-out slide-out-to-right duration-300 ease-in' : 'animate-in slide-in-from-right duration-300 ease-out'}`}>
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/40 transition-colors duration-500 ease-in-out">
                <div className="flex items-center space-x-3">
                  <ThemeLogo width={24} height={24} />
                </div>
                <div className="flex items-center space-x-2">
                  <ThemeToggle />
                  <button
                    onClick={closeMenu}
                    className="p-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-all duration-300"
                    aria-label="Close menu"
                  >
                    <X size={20} className="text-gray-700 dark:text-gray-300 transition-colors duration-500 ease-in-out" />
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="flex-1 p-4">
                <nav className="space-y-2">
                  {navItems.map((item, index) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center py-2 px-3 rounded-lg transition-all duration-500 ease-in-out",
                        pathname === item.href
                          ? "bg-gray-100/70 dark:bg-gray-800/50 text-gray-900 dark:text-white font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/30",
                        isClosing ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right fade-in'
                      )}
                      style={{ animationDelay: isClosing ? '0ms' : `${100 + (index * 50)}ms` }}
                      onClick={closeMenu}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Menu Footer */}
              <div className={`p-4 border-t border-gray-200/50 dark:border-gray-700/40 transition-colors duration-500 ease-in-out ${isClosing ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right fade-in'}`} style={{ animationDelay: isClosing ? '0ms' : '400ms' }}>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Kure-Cal
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavbar;
