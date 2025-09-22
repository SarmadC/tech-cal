'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts';
import { CareerProfile, CareerOnboardingData } from '@/types/career';
import { CareerProfileService } from '@/services/careerProfileService';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import CareerOnboarding from '@/components/onboarding/CareerOnboarding';
import { toast } from 'sonner';
import { User, PencilSimple, CheckCircle } from '@phosphor-icons/react';

export interface CareerProfileManagerProps {
  className?: string;
  onProfileUpdate?: (profile: CareerProfile) => void;
}

const CareerProfileManager: React.FC<CareerProfileManagerProps> = ({
  className = '',
  onProfileUpdate
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { supabase, isReady } = useSupabaseSafe();

  // Show loading if supabase client is not ready yet
  if (!isReady || !supabase) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  const currentCareerProfile = CareerProfileService.getCareerProfile(profile);
  const hasCompletedOnboarding = CareerProfileService.hasCompletedOnboarding(profile);

  const handleComplete = async (data: CareerOnboardingData) => {
    if (!user?.id) {
      toast.error('Authentication required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const careerProfile = await CareerProfileService.completeCareerOnboarding(user.id, data, supabase);
      
      toast.success('Career profile updated successfully!');
      setIsEditing(false);
      onProfileUpdate?.(careerProfile);
      
      // Invalidate profile queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      
      // Trigger auth context refresh
      window.dispatchEvent(new CustomEvent('profile-updated'));
    } catch (error) {
      console.error('Career profile update error:', error);
      toast.error('Failed to update career profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className={`career-profile-manager ${className}`}>
        <div className="text-center py-8">
          <User size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in Required</h3>
          <p className="text-gray-600">Please sign in to manage your career profile</p>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={`career-profile-manager editing ${className}`}>
        <div className="relative">
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Updating your career profile...</p>
              </div>
            </div>
          )}
          
          <CareerOnboarding
            onComplete={handleComplete}
            onSkip={handleCancel}
            className="bg-white"
          />
        </div>
      </div>
    );
  }

  if (!hasCompletedOnboarding || !currentCareerProfile) {
    return (
      <div className={`career-profile-manager incomplete ${className}`}>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <User size={32} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Complete Your Career Profile
              </h3>
              <p className="text-gray-600 mb-4">
                Get personalized event recommendations by telling us about your career goals and interests.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Complete Profile
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show completed career profile with edit option
  return (
    <div className={`career-profile-manager completed ${className}`}>
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Career Profile</h3>
          </div>
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <PencilSimple size={14} />
            Edit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-900">Role:</span>
            <span className="ml-2 text-gray-600">{currentCareerProfile.currentRole}</span>
          </div>
          <div>
            <span className="font-medium text-gray-900">Level:</span>
            <span className="ml-2 text-gray-600 capitalize">{currentCareerProfile.seniority.replace('-', ' ')}</span>
          </div>
          <div>
            <span className="font-medium text-gray-900">Company Size:</span>
            <span className="ml-2 text-gray-600 capitalize">{currentCareerProfile.companySize}</span>
          </div>
          <div>
            <span className="font-medium text-gray-900">Goals:</span>
            <span className="ml-2 text-gray-600">
              {currentCareerProfile.careerGoals.slice(0, 2).map(goal => 
                goal.replace('-', ' ')
              ).join(', ')}
              {currentCareerProfile.careerGoals.length > 2 && ` +${currentCareerProfile.careerGoals.length - 2} more`}
            </span>
          </div>
        </div>

        {currentCareerProfile.skillsToLearn.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="font-medium text-gray-900 text-sm">Learning:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {currentCareerProfile.skillsToLearn.slice(0, 5).map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
              {currentCareerProfile.skillsToLearn.length > 5 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  +{currentCareerProfile.skillsToLearn.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CareerProfileManager;
