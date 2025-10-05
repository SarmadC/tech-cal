'use client';

import React, { useState, useEffect } from 'react';
import { X, BarChart3, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BehavioralAnalyticsService } from '@/services/behavioralAnalyticsService';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';

export default function AnalyticsConsentBanner() {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function checkConsentStatus() {
      if (!user?.id) return;

      try {
        const hasConsent = await BehavioralAnalyticsService.getAnalyticsConsent(user.id, supabase);
        
        // Show banner if user hasn't made a choice yet
        if (hasConsent === null || hasConsent === undefined) {
          setShowBanner(true);
        }
      } catch (error) {
        console.error('Error checking consent status:', error);
      }
    }

    checkConsentStatus();
  }, [user?.id, supabase]);

  const handleConsent = async (consent: boolean) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      await BehavioralAnalyticsService.setAnalyticsConsent(user.id, consent, supabase);
      setShowBanner(false);
    } catch (error) {
      console.error('Error updating consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Set a cookie to remember dismissal for 7 days
    document.cookie = 'analytics-banner-dismissed=true; max-age=604800; path=/';
  };

  if (!showBanner || !user) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">
              Help us improve your experience
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              We&apos;d like to collect anonymous usage data to personalize your event recommendations 
              and improve our service. You can change this anytime in your settings.
            </p>
            
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <Shield className="w-4 h-4" />
              <span>Your data is encrypted, anonymized, and never shared with third parties</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleConsent(true)}
                disabled={isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Saving...' : 'Accept & Improve Experience'}
              </Button>
              
              <Button
                onClick={() => handleConsent(false)}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Decline
              </Button>
              
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-gray-500"
              >
                Ask Later
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
