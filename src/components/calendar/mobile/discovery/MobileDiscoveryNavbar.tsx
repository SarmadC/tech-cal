'use client';

import React, { useState, useEffect } from 'react';
import { List, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { ThemeLogo } from '@/components/ui/ThemeLogo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface MobileDiscoveryNavbarProps {
  className?: string;
}

const MobileDiscoveryNavbar: React.FC<MobileDiscoveryNavbarProps> = ({
  className = ''
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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

  return (
    <>
      {/* Navbar */}
      <nav 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          "transition-colors duration-500 ease-in-out",
          isScrolled 
            ? "bg-white/70 dark:bg-gray-900/20 backdrop-blur-md border-b border-white/20 dark:border-gray-700/30 shadow-lg dark:shadow-gray-900/20" 
            : "bg-transparent",
          className
        )}
      >
        <div className="flex items-center justify-end px-4 py-3">
          {/* Hamburger menu - Hide when menu is open */}
          {!isMenuOpen && (
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
        <div className={`fixed inset-0 z-40 ${isClosing ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'}`}>
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
                  <a
                    href="/dashboard"
                    className={`flex items-center py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-all duration-500 ease-in-out ${isClosing ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right fade-in'}`}
                    style={{ animationDelay: isClosing ? '0ms' : '100ms' }}
                    onClick={closeMenu}
                  >
                    Dashboard
                  </a>
                  <a
                    href="/calendar"
                    className={`flex items-center py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-all duration-500 ease-in-out ${isClosing ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right fade-in'}`}
                    style={{ animationDelay: isClosing ? '0ms' : '150ms' }}
                    onClick={closeMenu}
                  >
                    Calendar
                  </a>
                  <a
                    href="/discover"
                    className={`flex items-center py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-all duration-500 ease-in-out ${isClosing ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right fade-in'}`}
                    style={{ animationDelay: isClosing ? '0ms' : '200ms' }}
                    onClick={closeMenu}
                  >
                    Discover
                  </a>
                  <a
                    href="/profile"
                    className={`flex items-center py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-all duration-500 ease-in-out ${isClosing ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right fade-in'}`}
                    style={{ animationDelay: isClosing ? '0ms' : '250ms' }}
                    onClick={closeMenu}
                  >
                    Profile
                  </a>
                </nav>
              </div>

              {/* Menu Footer */}
              <div className={`p-4 border-t border-gray-200/50 dark:border-gray-700/40 transition-colors duration-500 ease-in-out ${isClosing ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right fade-in'}`} style={{ animationDelay: isClosing ? '0ms' : '300ms' }}>
                <button className="w-full px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 rounded-lg transition-all duration-500 ease-in-out">
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileDiscoveryNavbar;
