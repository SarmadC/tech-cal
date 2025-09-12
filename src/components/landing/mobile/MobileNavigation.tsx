'use client';

import React from 'react';
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
          <img 
            src="/logo.svg" 
            alt="Kure-Cal Logo" 
            className="logo-image"
            style={{
              height: '32px',
              width: 'auto'
            }}
          />
        </div>
        
        <button
          className="mobile-nav-toggle"
          onClick={onToggle}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            border: '1px solid rgba(255, 255, 255, 0.3)' 
          }}
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
        className={`mobile-nav-menu ${isOpen ? 'menu-open' : ''}`}
        style={{
          minHeight: 'calc(100vh - 60px)',
          height: 'auto'
        }}
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
                style={{ 
                  color: 'white', 
                  fontSize: '1.25rem', 
                  fontWeight: '500',
                  padding: '0.75rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none'
                }}
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
              style={{ 
                color: 'white', 
                fontSize: '1.25rem', 
                fontWeight: '500',
                padding: '0.75rem 0',
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none'
              }}
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
              style={{
                width: '100%',
                background: 'white',
                color: 'black',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1.125rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
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
