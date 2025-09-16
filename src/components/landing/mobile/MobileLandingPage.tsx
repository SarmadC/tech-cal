'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import MobileHeroSection from './MobileHeroSection';
import MobileChaosToOrderSection from './MobileChaosToOrderSection';
import MobileFeaturesGrid from './MobileFeaturesGrid';
import MobileFooter from './MobileFooter';
import MobileNavigation from './MobileNavigation';
import '@/app/styles/mobile-landing.css';
import '@/app/styles/mobile-design-system.css';

export interface MobileLandingPageProps {
  className?: string;
}

const MobileLandingPage: React.FC<MobileLandingPageProps> = ({ className = '' }) => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isMobile, userAgent } = useDeviceDetection();

  // Enhanced mobile detection for specific devices
  const isIOSMobile = userAgent.isIOS && isMobile;
  const isAndroidMobile = userAgent.isAndroid && isMobile;

  const navItems = [
    {
      name: "Features",
      link: "#features",
    },
    {
      name: "Pricing", 
      link: "#pricing",
    },
    {
      name: "Contact",
      link: "#contact",
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
      <MobileNavigation
        navItems={navItems}
        isOpen={isMobileMenuOpen}
        onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onNavigate={(path) => {
          setIsMobileMenuOpen(false);
          router.push(path);
        }}
        isIOS={isIOSMobile}
        isAndroid={isAndroidMobile}
      />

      <main className="mobile-landing-main">
        <MobileHeroSection 
          isIOS={isIOSMobile}
          isAndroid={isAndroidMobile}
        />
        <MobileChaosToOrderSection />
        <MobileFeaturesGrid />
      </main>
      
      <MobileFooter />
    </div>
  );
};

export default MobileLandingPage;
