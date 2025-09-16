'use client';

import React from 'react';
import Image from 'next/image';
import { List, X } from '@phosphor-icons/react';

export interface NavItem {
  name: string;
  link: string;
}

export interface MobileNavigationProps {
  navItems: NavItem[];
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: (path: string) => void;
  isIOS?: boolean;
  isAndroid?: boolean;
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  navItems,
  isOpen,
  onToggle,
  onNavigate,
  isIOS: _isIOS = false,
  isAndroid: _isAndroid = false,
  className = ''
}) => {
  return (
    <nav className={`mobile-nav ${isOpen ? 'nav-open' : ''} ${className}`} role="navigation">
      {/* Mobile Nav Header */}
      <div className="mobile-nav-header">
        <div className="mobile-nav-logo">
          <Image 
            src="/logo.svg" 
            alt="Kure-Cal Logo" 
            className="logo-image"
            width={24}
            height={24}
          />
        </div>
        
        <button
          className="mobile-nav-toggle"
          onClick={onToggle}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X size={24} weight="bold" />
          ) : (
            <List size={24} weight="bold" />
          )}
        </button>
      </div>

      {/* Mobile Nav Menu */}
      <div 
        className={`mobile-nav-menu mobile-nav-menu-height ${isOpen ? 'menu-open' : ''}`}
      >
        <div className="mobile-nav-content">
          {/* Main Navigation Links */}
          <div className="mobile-nav-links">
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.link);
                  onToggle();
                }}
                className="mobile-nav-link"
              >
                <span className="link-text">{item.name}</span>
                <svg 
                  className="link-arrow" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/login');
                onToggle();
              }}
              className="mobile-nav-link"
            >
              <span className="link-text">Login</span>
            </a>
          </div>

          {/* Primary CTA Button */}
          <div className="mobile-nav-cta">
            <button
              onClick={() => {
                onNavigate('/signup');
                onToggle();
              }}
              className="mobile-cta-button enhanced-primary"
            >
              <span>START FREE TRIAL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="mobile-nav-backdrop" 
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </nav>
  );
};

export default MobileNavigation;
