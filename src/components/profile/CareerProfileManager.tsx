'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CareerProfile, CareerOnboardingData, CareerOptionalSectionStatus, CareerOptionalSectionSnoozes } from '@/types/career';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import { useAuth } from '@/contexts';
import CareerOnboarding from '@/components/onboarding/CareerOnboarding';
import QuickEditModal from './QuickEditModal';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { User } from '@phosphor-icons/react';
import { AnalyticsService } from '@/services/analyticsService';

const OPTIONAL_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CareerProfileManagerProps {
  className?: string;
  onProfileUpdate?: (profile: CareerProfile) => void;
}

const CareerProfileManager: React.FC<CareerProfileManagerProps> = ({
  className = '',
  onProfileUpdate
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showError } = useSnackbar();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickEditSection, setQuickEditSection] = useState<string | null>(null);
  const [showAllCurrentSkills, setShowAllCurrentSkills] = useState(false);
  const [showAllLearningGoals, setShowAllLearningGoals] = useState(false);
  const [dismissedPromptIds, setDismissedPromptIds] = useState<string[]>([]);
  const loggedShownPrompts = useRef<Set<string>>(new Set());
  const completedSectionsRef = useRef<Set<string>>(new Set());
  
  const {
    careerProfile: currentCareerProfile,
    hasCompletedOnboarding,
    isLoading,
    error,
    saveCareerProfile: _saveCareerProfile,
    completeOnboarding,
    refreshProfile,
    optionalSections,
    optionalSectionSnoozes,
    markOptionalSectionComplete,
    snoozeOptionalSection
  } = useCareerProfile();

  const sectionKeyMap: Record<string, keyof CareerOptionalSectionStatus> = {
    learning: 'learningPreferences',
    networking: 'networkingPreferences',
    team: 'teamPreferences'
  };


  const promptDefinitions = useMemo(() => ([
    {
      id: 'learningPreferences',
      title: 'Add your learning preferences',
      description: 'Tell us how you prefer to learn and how much time you can dedicate each month to improve recommendation relevance.',
      cta: 'Set learning preferences',
      quickEdit: 'learning'
    },
    {
      id: 'networkingPreferences',
      title: 'Share your networking goals',
      description: 'Let us know the connections you want to make so we can spotlight the right events.',
      cta: 'Set networking goals',
      quickEdit: 'networking'
    },
    {
      id: 'teamPreferences',
      title: 'Pick preferred event formats',
      description: 'Choose the event types you enjoy most to diversify recommendations.',
      cta: 'Choose event formats',
      quickEdit: 'team'
    }
  ]) as Array<{
    id: keyof CareerOptionalSectionStatus;
    title: string;
    description: string;
    cta: string;
    quickEdit: string;
  }>, []);

  const logPromptEvent = useCallback((event: 'prompt_shown' | 'prompt_opened' | 'prompt_snoozed' | 'prompt_completed', sectionId: keyof CareerOptionalSectionStatus, extra: Record<string, unknown> = {}) => {
    AnalyticsService.logProfilePromptEvent(event, {
      section: sectionId,
      userId: user?.id ?? null,
      ...extra
    });
  }, [user?.id]);

  const shouldShowPrompt = React.useCallback((sectionId: string) => {
    const status: CareerOptionalSectionStatus = optionalSections ?? {
      learningPreferences: false,
      networkingPreferences: false,
      teamPreferences: false
    };
    const snoozes: CareerOptionalSectionSnoozes = optionalSectionSnoozes ?? {};
    const completed = status[sectionId as keyof CareerOptionalSectionStatus];
    if (completed) return false;
    if (dismissedPromptIds.includes(sectionId)) return false;
    const snoozeTimestamp = snoozes[sectionId as keyof CareerOptionalSectionSnoozes];
    if (!snoozeTimestamp) return true;
    const snoozeDate = new Date(snoozeTimestamp).getTime();
    return Date.now() - snoozeDate > OPTIONAL_PROMPT_SNOOZE_MS;
  }, [optionalSections, optionalSectionSnoozes, dismissedPromptIds]);

  const pendingPrompts = useMemo(
    () => promptDefinitions.filter(prompt => shouldShowPrompt(prompt.id)),
    [promptDefinitions, shouldShowPrompt]
  );

  React.useEffect(() => {
    pendingPrompts.forEach(prompt => {
      if (!loggedShownPrompts.current.has(prompt.id)) {
        loggedShownPrompts.current.add(prompt.id);
        logPromptEvent('prompt_shown', prompt.id);
      }
    });
  }, [pendingPrompts, logPromptEvent]);

  React.useEffect(() => {
    if (!optionalSections) return;
    const nextCompleted = new Set<string>();
    if (optionalSections.learningPreferences) nextCompleted.add('learningPreferences');
    if (optionalSections.networkingPreferences) nextCompleted.add('networkingPreferences');
    if (optionalSections.teamPreferences) nextCompleted.add('teamPreferences');
    completedSectionsRef.current = nextCompleted;
  }, [optionalSections]);

  const handlePromptComplete = (quickEditKey: string) => {
    const prompt = promptDefinitions.find(p => p.quickEdit === quickEditKey);
    if (prompt) {
      logPromptEvent('prompt_opened', prompt.id, { trigger: 'banner' });
    }
    handleQuickEdit(quickEditKey);
  };

  const handlePromptSnooze = async (sectionId: string) => {
    const until = await snoozeOptionalSection(sectionId as keyof CareerOptionalSectionStatus);
    setDismissedPromptIds(prev => prev.includes(sectionId) ? prev : [...prev, sectionId]);
    loggedShownPrompts.current.delete(sectionId);
    logPromptEvent('prompt_snoozed', sectionId as keyof CareerOptionalSectionStatus, {
      snoozeUntil: until ?? null
    });
  };

  const handleOptionalSectionCompleted = (section: string) => {
    const optionalKey = sectionKeyMap[section];
    if (optionalKey && !completedSectionsRef.current.has(optionalKey)) {
      void markOptionalSectionComplete(optionalKey);
      setDismissedPromptIds(prev => prev.filter(id => id !== optionalKey));
      loggedShownPrompts.current.delete(optionalKey);
      logPromptEvent('prompt_completed', optionalKey, { completedAt: new Date().toISOString() });
      completedSectionsRef.current.add(optionalKey);
    }
  };
  
  // Debug: Log when career profile changes
  React.useEffect(() => {
    console.log('CareerProfileManager - currentCareerProfile updated:', currentCareerProfile);
  }, [currentCareerProfile]);
  
  // Force re-render when profile changes by using a timestamp
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  React.useEffect(() => {
    if (currentCareerProfile) {
      setLastUpdate(Date.now());
    }
  }, [currentCareerProfile]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-2">Error loading profile</p>
          <button 
            onClick={refreshProfile}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const handleComplete = async (
    data: CareerOnboardingData,
    options?: { optionalSectionsCompleted: CareerOptionalSectionStatus }
  ) => {
    setIsSubmitting(true);
    
    try {
      await completeOnboarding(data, options?.optionalSectionsCompleted);
      
      setIsEditing(false);
      if (onProfileUpdate && currentCareerProfile) {
        onProfileUpdate(currentCareerProfile);
      }
      
      // Invalidate profile queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      
      // Trigger auth context refresh
      window.dispatchEvent(new CustomEvent('profile-updated'));
    } catch (error) {
      console.error('Career profile update error:', error);
      showError('Failed to update career profile. Please try again.');
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

  const handleQuickEdit = (section: string) => {
    const optionalKey = sectionKeyMap[section];
    if (optionalKey) {
      setDismissedPromptIds(prev => prev.filter(id => id !== optionalKey));
      loggedShownPrompts.current.delete(optionalKey);
    }
    setQuickEditSection(section);
  };

  const handleQuickEditClose = () => {
    setQuickEditSection(null);
    // Note: Modal already refreshes data before closing, no need to refresh again
  };

  // This check is now handled by the useCareerProfile hook

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
    <>
      <div key={`profile-${lastUpdate}`} className={`career-profile-manager completed ${className}`}>
        {pendingPrompts.length > 0 && (
          <div className="mb-6 space-y-4">
            {pendingPrompts.map(prompt => (
              <div
                key={prompt.id}
                className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 md:flex-row md:items-center md:justify-between"
              >
                <div className="md:max-w-2xl">
                  <h4 className="text-base font-semibold text-blue-900">{prompt.title}</h4>
                  <p className="mt-1 text-blue-800">{prompt.description}</p>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <button
                    onClick={() => handlePromptComplete(prompt.quickEdit)}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    {prompt.cta}
                  </button>
                  <button
                    onClick={() => handlePromptSnooze(prompt.id)}
                    className="text-blue-700 underline-offset-4 hover:underline"
                  >
                    Remind me later
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">Career Profile</h3>
              <p className="text-sm text-gray-600">Your professional information and goals</p>
            </div>
          </div>
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Edit Profile
          </button>
        </div>

        {/* Role Information Section */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Role Information</h4>
            <button
              onClick={() => handleQuickEdit('role')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Quick Edit
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Current Role</span>
              <p className="text-base font-medium text-gray-900">{currentCareerProfile.currentRole}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Experience Level</span>
              <p className="text-base font-medium text-gray-900 capitalize">{currentCareerProfile.seniority.replace('-', ' ')}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Industry</span>
              <p className="text-base font-medium text-gray-900">{currentCareerProfile.industry}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Company Size</span>
              <p className="text-base font-medium text-gray-900 capitalize">{currentCareerProfile.companySize}</p>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div
          className="rounded-xl p-6 mb-6 border transition-all duration-200 hover:shadow-md"
          style={{
            backgroundColor: 'var(--background-tertiary)',
            borderColor: 'var(--border-default)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h4
              className="text-lg font-semibold"
              style={{ color: 'var(--foreground-primary)' }}
            >
              Skills & Interests
            </h4>
            <button
              onClick={() => handleQuickEdit('skills')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                color: 'var(--accent-primary)',
                backgroundColor: 'var(--accent-primary-light)',
                borderColor: 'var(--border-default)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-elevated)';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary-light)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
            >
              Quick Edit
            </button>
          </div>
          <div className="space-y-6">
            {currentCareerProfile.primarySkills.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--foreground-tertiary)' }}
                  >
                    Current Skills
                  </span>
                  {currentCareerProfile.primarySkills.length > 5 && (
                    <button
                      onClick={() => setShowAllCurrentSkills(!showAllCurrentSkills)}
                      className="text-xs font-medium px-2 py-1 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
                      style={{
                        color: 'var(--foreground-secondary)',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent-primary-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      aria-label={showAllCurrentSkills ? "Show less current skills" : "Show all current skills"}
                      aria-expanded={showAllCurrentSkills}
                    >
                      {showAllCurrentSkills ? 'Show Less' : `Show All (${currentCareerProfile.primarySkills.length})`}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(showAllCurrentSkills ? currentCareerProfile.primarySkills : currentCareerProfile.primarySkills.slice(0, 5)).map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 hover:scale-[1.02] cursor-default"
                      style={{
                        backgroundColor: 'var(--background-elevated)',
                        color: 'var(--foreground-primary)',
                        borderColor: 'var(--border-strong)',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        e.currentTarget.style.borderColor = 'var(--accent-border)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                        e.currentTarget.style.borderColor = 'var(--border-strong)';
                      }}
                      tabIndex={0}
                      role="listitem"
                      aria-label={`Current skill: ${skill}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {currentCareerProfile.skillsToLearn.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--foreground-tertiary)' }}
                  >
                    Learning Goals
                  </span>
                  {currentCareerProfile.skillsToLearn.length > 5 && (
                    <button
                      onClick={() => setShowAllLearningGoals(!showAllLearningGoals)}
                      className="text-xs font-medium px-2 py-1 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
                      style={{
                        color: 'var(--foreground-secondary)',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent-primary-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      aria-label={showAllLearningGoals ? "Show less learning goals" : "Show all learning goals"}
                      aria-expanded={showAllLearningGoals}
                    >
                      {showAllLearningGoals ? 'Show Less' : `Show All (${currentCareerProfile.skillsToLearn.length})`}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(showAllLearningGoals ? currentCareerProfile.skillsToLearn : currentCareerProfile.skillsToLearn.slice(0, 5)).map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 hover:scale-[1.02] cursor-default"
                      style={{
                        backgroundColor: 'var(--success-light)',
                        color: 'var(--success)',
                        borderColor: 'var(--success)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        opacity: 0.9,
                        boxShadow: 'var(--shadow-xs)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                      }}
                      tabIndex={0}
                      role="listitem"
                      aria-label={`Learning goal: ${skill}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Career Goals Section */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Career Goals</h4>
            <button
              onClick={() => handleQuickEdit('goals')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Quick Edit
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 block">Focus Areas</span>
              <div className="flex flex-wrap gap-2">
                {currentCareerProfile.careerGoals.slice(0, 3).map((goal, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium border border-purple-200 transition-all duration-200 hover:bg-purple-200"
                  >
                    {goal.replace('-', ' ')}
                  </span>
                ))}
                {currentCareerProfile.careerGoals.length > 3 && (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm border border-gray-200">
                    +{currentCareerProfile.careerGoals.length - 3} more
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2 block">Timeline</span>
              <div className="inline-flex items-center px-3 py-2 bg-white border border-gray-200 rounded-lg">
                <span className="text-base font-medium text-gray-900 capitalize">
                  {currentCareerProfile.timeframe?.replace('-', ' ')}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  ({currentCareerProfile.timeframe === 'immediate' ? '0-6 months' :
                  currentCareerProfile.timeframe === 'short-term' ? '6-18 months' :
                  currentCareerProfile.timeframe === 'medium-term' ? '1-3 years' : '3+ years'})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      
      {/* Quick Edit Modal */}
      {quickEditSection && currentCareerProfile && (
        <QuickEditModal
          isOpen={!!quickEditSection}
          onClose={handleQuickEditClose}
          section={quickEditSection}
          currentProfile={currentCareerProfile}
          onSectionCompleted={handleOptionalSectionCompleted}
        />
      )}
    </>
  );
};

export default CareerProfileManager;
