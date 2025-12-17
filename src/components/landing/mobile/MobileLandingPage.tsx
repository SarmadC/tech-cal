'use client';

import React, { useEffect } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import MobileHeroSection from './MobileHeroSection';
import MobileChaosToOrderSection from './MobileChaosToOrderSection';
import MobileFeaturesGrid from './MobileFeaturesGrid';
import MobileUseCasesSection from './MobileUseCasesSection';
import MobileFAQSection from './MobileFAQSection';
import MobileFooter from './MobileFooter';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import '@/app/styles/mobile-landing.css';
import '@/app/styles/mobile-design-system.css';

export interface MobileLandingPageProps {
  className?: string;
}

const MobileLandingPage: React.FC<MobileLandingPageProps> = ({ className = '' }) => {
  const { isMobile, userAgent } = useDeviceDetection();

  // Enhanced mobile detection for specific devices
  const isIOSMobile = userAgent.isIOS && isMobile;
  const isAndroidMobile = userAgent.isAndroid && isMobile;

  const navItems = [
    {
      name: "Features",
      href: "#features",
    },
    {
      name: "Pricing", 
      href: "#pricing",
    },
    {
      name: "Blog",
      href: "/blog",
    },
  ];

  useEffect(() => {
    const observerOptions = { 
      threshold: 0.1, 
      rootMargin: '0px 0px -50px 0px' 
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
    elements.forEach(el => observer.observe(el));

    return () => elements.forEach(el => observer.unobserve(el));
  }, []);

  return (
    <div className={`mobile-landing-container ${className}`}>
      {/* Mobile Navigation */}
      <UnifiedMobileNavbar
        navItems={navItems}
        showThemeToggle={true}
        showLogo={true}
      />

      <main className="mobile-landing-main">
        <MobileHeroSection 
          isIOS={isIOSMobile}
          isAndroid={isAndroidMobile}
        />
        <MobileChaosToOrderSection />
        <MobileFeaturesGrid />
        <MobileUseCasesSection />
        <MobileFAQSection />
      </main>
      
      <MobileFooter />
    </div>
  );
};

export default MobileLandingPage;
