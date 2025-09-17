'use client';

import React from 'react';
import Link from 'next/link';
import { User, Target, ArrowRight } from '@phosphor-icons/react';
import { AppProfile } from '@/types';
import { CareerProfileService } from '@/services/careerProfileService';

export interface CareerProfilePromptProps {
  profile: AppProfile | null;
  className?: string;
  compact?: boolean;
}

const CareerProfilePrompt: React.FC<CareerProfilePromptProps> = ({
  profile,
  className = '',
  compact = false
}) => {
  const hasCareerProfile = profile ? CareerProfileService.hasCompletedOnboarding(profile) : false;

  // Don't show if user already has career profile
  if (hasCareerProfile) {
    return null;
  }

  if (compact) {
    return (
      <div className={`career-profile-prompt compact ${className}`}>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <Target size={20} className="text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                Get personalized recommendations
              </p>
              <p className="text-xs text-gray-600">
                Complete your career profile for better event suggestions
              </p>
            </div>
            <Link
              href="/onboarding/career"
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              Setup
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`career-profile-prompt ${className}`}>
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <User size={32} className="text-blue-600" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unlock Personalized Recommendations
          </h3>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Tell us about your career goals and interests to get event recommendations 
            tailored specifically for your professional development.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-medium text-gray-900">Role-Specific</div>
              <div className="text-gray-600">Events for your level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">📚</div>
              <div className="font-medium text-gray-900">Skill-Based</div>
              <div className="text-gray-600">Learn what you want</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-medium text-gray-900">Goal-Aligned</div>
              <div className="text-gray-600">Support your ambitions</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/onboarding/career"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Complete Career Profile
              <ArrowRight size={16} />
            </Link>
            
            <Link
              href="/dashboard/settings?tab=career"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Quick Setup
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Takes 2-3 minutes • You can always update this later
          </p>
        </div>
      </div>
    </div>
  );
};

export default CareerProfilePrompt;

