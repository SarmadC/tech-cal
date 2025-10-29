'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CareerProfile, CareerOnboardingData, CareerOptionalSectionStatus, CareerOptionalSectionSnoozes } from '@/types/career';
import { QuickEditSection } from './quick-edit/sections';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import { useAuth } from '@/contexts';
import CareerOnboarding from '@/components/onboarding/CareerOnboarding';
import QuickEditModal from './quick-edit';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/Icon';
import { CheckCircle, Timer, User, X } from '@phosphor-icons/react';
import { GreenBadge } from '@/components/onboarding/shared/FormField';
import { AnalyticsService } from '@/services/analyticsService';

const TIMEFRAME_COPY: Record<string, { label: string; window: string }> = {
  immediate: { label: 'Immediate impact', window: '0-6 months' },
  'short-term': { label: 'Short term plan', window: '6-18 months' },
  'medium-term': { label: 'Medium term plan', window: '1-3 years' },
  'long-term': { label: 'Long term vision', window: '3+ years' }
};

const OPTIONAL_SECTION_COPY: Record<keyof CareerOptionalSectionStatus, { label: string; helper: string }> = {
  learningPreferences: {
    label: 'Learning preferences',
    helper: 'How you like to learn and how often'
  },
  networkingPreferences: {
    label: 'Networking goals',
    helper: 'Connections you want to make'
  },
  teamPreferences: {
    label: 'Event formats',
    helper: 'Experiences you enjoy joining'
  }
};

const OPTIONAL_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_OPTIONAL_STATUS: CareerOptionalSectionStatus = {
  learningPreferences: false,
  networkingPreferences: false,
  teamPreferences: false
};

const OPTIONAL_QUICK_EDIT_MAP: Record<keyof CareerOptionalSectionStatus, QuickEditSection> = {
  learningPreferences: 'learning',
  networkingPreferences: 'networking',
  teamPreferences: 'team'
};

const formatGoalLabel = (goal: string): string => {
  const normalized = goal.replace(/-/g, ' ').toLowerCase();
  return normalized.replace(/\b\w/g, char => char.toUpperCase());
};

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
  const [quickEditSection, setQuickEditSection] = useState<QuickEditSection | null>(null);
  const [quickEditModalState, setQuickEditModalState] = useState<{
    isDirty: boolean;
    isSaving: boolean;
    saveError?: string | null;
  }>({
    isDirty: false,
    isSaving: false,
    saveError: null
  });
  const [showAllCurrentSkills, setShowAllCurrentSkills] = useState(false);
  const [showAllLearningGoals, setShowAllLearningGoals] = useState(false);
  const [dismissedPromptIds, setDismissedPromptIds] = useState<string[]>([]);
  const loggedShownPrompts = useRef<Set<string>>(new Set());
  const completedSectionsRef = useRef<Set<string>>(new Set());
  const [saveFeedback, setSaveFeedback] = useState<{ section: string; timestamp: Date } | null>(null);
  const [inlineEditing, setInlineEditing] = useState<{ field: string; value: string; element?: HTMLElement } | null>(null);
  
  // Derive disabled state from modal state
  const isQuickEditDisabled = quickEditModalState.isSaving || quickEditSection !== null;
  
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

  const sectionKeyMap: Record<QuickEditSection, keyof CareerOptionalSectionStatus> = {
    learning: 'learningPreferences',
    networking: 'networkingPreferences',
    team: 'teamPreferences',
    role: null as never,
    skills: null as never,
    goals: null as never
  };

  const promptDefinitions = useMemo(() => ([
    {
      id: 'learningPreferences',
      title: 'Add your learning preferences',
      description: 'Tell us how you prefer to learn and how much time you can dedicate each month to improve recommendation relevance.',
      cta: 'Set learning preferences',
      quickEdit: 'learning' as QuickEditSection
    },
    {
      id: 'networkingPreferences',
      title: 'Share your networking goals',
      description: 'Let us know the connections you want to make so we can spotlight the right events.',
      cta: 'Set networking goals',
      quickEdit: 'networking' as QuickEditSection
    },
    {
      id: 'teamPreferences',
      title: 'Pick preferred event formats',
      description: 'Choose the event types you enjoy most to diversify recommendations.',
      cta: 'Choose event formats',
      quickEdit: 'team' as QuickEditSection
    }
  ]) as Array<{
    id: keyof CareerOptionalSectionStatus;
    title: string;
    description: string;
    cta: string;
    quickEdit: QuickEditSection;
  }>, []);

  const logPromptEvent = useCallback((event: 'prompt_shown' | 'prompt_opened' | 'prompt_snoozed' | 'prompt_completed', sectionId: keyof CareerOptionalSectionStatus, extra: Record<string, unknown> = {}) => {
    AnalyticsService.logProfilePromptEvent(event, {
      section: sectionId,
      userId: user?.id ?? null,
      ...extra
    });
  }, [user?.id]);

  const shouldShowPrompt = React.useCallback((sectionId: string) => {
    const status: CareerOptionalSectionStatus = optionalSections ?? DEFAULT_OPTIONAL_STATUS;
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

  const optionalStatus: CareerOptionalSectionStatus = optionalSections ?? DEFAULT_OPTIONAL_STATUS;
  const optionalSectionEntries = Object.entries(optionalStatus) as Array<[keyof CareerOptionalSectionStatus, boolean]>;
  
  // Calculate comprehensive profile completion including core sections
  const optionalCompletionPercent = React.useMemo(() => {
    if (!currentCareerProfile) return 0;
    
    // Core sections
    const coreSections = [
      { name: 'role', completed: !!(currentCareerProfile?.currentRole && currentCareerProfile?.seniority && currentCareerProfile?.industry && currentCareerProfile?.companySize) },
      { name: 'skills', completed: !!(currentCareerProfile?.primarySkills && currentCareerProfile.primarySkills.length > 0) },
      { name: 'goals', completed: !!(currentCareerProfile?.careerGoals && currentCareerProfile.careerGoals.length > 0 && currentCareerProfile?.timeframe) }
    ];
    
    // Optional sections
    const optionalSectionsData = optionalSectionEntries.map(([key, completed]) => ({ name: key, completed }));
    const allSections = [...coreSections, ...optionalSectionsData];
    const completedSections = allSections.filter(section => section.completed).length;
    const totalSections = allSections.length;
    
    const percentage = totalSections > 0
      ? Math.round((completedSections / totalSections) * 100)
      : 0;

    console.log('Profile completion calculation:', {
      coreSections,
      optionalSectionsData,
      allSections,
      completedSections,
      totalSections,
      percentage,
      currentCareerProfile: {
        currentRole: currentCareerProfile?.currentRole,
        seniority: currentCareerProfile?.seniority,
        industry: currentCareerProfile?.industry,
        companySize: currentCareerProfile?.companySize,
        primarySkills: currentCareerProfile?.primarySkills?.length,
        careerGoals: currentCareerProfile?.careerGoals?.length,
        timeframe: currentCareerProfile?.timeframe
      }
    });
    
    return percentage;
  }, [currentCareerProfile, optionalSectionEntries]);

  const handlePromptComplete = (quickEditKey: QuickEditSection) => {
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

  const handleOptionalSectionCompleted = (section: QuickEditSection) => {
    const optionalKey = sectionKeyMap[section];
    if (optionalKey && !completedSectionsRef.current.has(optionalKey)) {
      void markOptionalSectionComplete(optionalKey);
      setDismissedPromptIds(prev => prev.filter(id => id !== optionalKey));
      loggedShownPrompts.current.delete(optionalKey);
      logPromptEvent('prompt_completed', optionalKey, { completedAt: new Date().toISOString() });
      completedSectionsRef.current.add(optionalKey);
    }
  };

  // Update saveFeedback when quick edit closes after saving
  const handleQuickEditClose = () => {
    if (quickEditModalState.isDirty) {
      const sectionTitle = quickEditSection ? 
        (quickEditSection === 'role' ? 'Role' :
         quickEditSection === 'skills' ? 'Skills' :
         quickEditSection === 'goals' ? 'Goals' : 'Profile') : 'Profile';
      setSaveFeedback({ section: sectionTitle, timestamp: new Date() });
      setTimeout(() => setSaveFeedback(null), 3000);
    }
    setQuickEditSection(null);
  };

  // Inline editing handlers
  const handleInlineEdit = (field: string, currentValue: string, element?: HTMLElement) => {
    setInlineEditing({ field, value: currentValue, element });
  };

  const handleInlineSave = async (field: string, newValue: string) => {
    try {
      if (!currentCareerProfile) return;
      
      // Create updated profile with the new field value
      const updatedProfile = {
        ...currentCareerProfile,
        [field]: newValue
      };
      
      // Save the updated profile
      await _saveCareerProfile(updatedProfile);
      
      // Refresh profile to ensure UI updates with latest data
      await refreshProfile();
      
      // Show feedback
      setSaveFeedback({ section: field, timestamp: new Date() });
      setTimeout(() => setSaveFeedback(null), 3000);
      
      // Return focus to the original element
      if (inlineEditing?.element) {
        inlineEditing.element.focus();
      }
      
      setInlineEditing(null);
    } catch (error) {
      console.error('Error saving inline edit:', error);
      showError('Failed to update field. Please try again.');
    }
  };

  const handleInlineCancel = () => {
    // Return focus to the original element
    if (inlineEditing?.element) {
      inlineEditing.element.focus();
    }
    setInlineEditing(null);
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
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2"
            style={{ borderColor: 'var(--accent-primary)' }}
          ></div>
          <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Loading profile...
          </p>
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
            className="text-sm underline transition"
            style={{ color: 'var(--accent-primary)' }}
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
      await queryClient.invalidateQueries({ queryKey: ['filtered-events'] });
      
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

  const handleQuickEdit = (section: QuickEditSection) => {
    const optionalKey = sectionKeyMap[section];
    if (optionalKey) {
      setDismissedPromptIds(prev => prev.filter(id => id !== optionalKey));
      loggedShownPrompts.current.delete(optionalKey);
    }
    setQuickEditSection(section);
  };


  // This check is now handled by the useCareerProfile hook

  if (isEditing) {
    return (
      <div className={`career-profile-manager editing ${className}`}>
        <div className="relative">
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
              <div className="text-center">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2"
                  style={{ borderColor: 'var(--accent-primary)' }}
                ></div>
                <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                  Updating your career profile...
                </p>
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
        <div
          className="rounded-xl p-6 border"
          style={{
            backgroundColor: 'var(--background-main)',
            borderColor: 'var(--border-default)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <User size={32} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="flex-1">
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--foreground-primary)' }}
              >
                Complete Your Career Profile
              </h3>
              <p style={{ color: 'var(--foreground-secondary)' }} className="mb-4">
                Get personalized event recommendations by telling us about your career goals and interests.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary-foreground)'
                  }}
                >
                  Complete Profile
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--foreground-secondary)',
                    border: '1px solid var(--border-default)'
                  }}
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

  if (!currentCareerProfile) {
    return null;
  }

  const timeframeKey = currentCareerProfile.timeframe ?? 'medium-term';
  const timeframeDetails = TIMEFRAME_COPY[timeframeKey] ?? TIMEFRAME_COPY['medium-term'];

  // Show completed career profile with edit option
  return (
    <>
      <div key={`profile-${lastUpdate}`} className={`career-profile-manager completed ${className}`}>
        <div className="space-y-6">
          {/* Primary Focus: Career Snapshot with Enhanced Typography */}
          <section
            className="rounded-xl transition-shadow"
            style={{
              backgroundColor: 'var(--background-elevated)',
              color: 'var(--foreground-primary)'
            }}
          >
            <div className="p-6 space-y-6">
              {/* Header with Large Typography */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1
                    className="text-3xl font-bold leading-tight sm:text-4xl"
                    style={{ color: 'var(--foreground-primary)' }}
                  >
                    {currentCareerProfile.currentRole}
                  </h1>
                </div>
                <button
                  onClick={handleEdit}
                  className="px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-opacity-30 shadow-md border-2"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--background-main)',
                    borderColor: 'var(--accent-primary)',
                    boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.15)'
                  }}
                  aria-label="Edit profile - open full profile editing wizard"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-primary-dark)';
                    e.currentTarget.style.borderColor = 'var(--accent-primary-dark)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-primary-light)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(0, 0, 0, 0.15)';
                  }}
                >
                  Edit profile
                </button>
              </div>

              {/* Inline Save Feedback */}
              {saveFeedback && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <div 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: 'var(--success-light)',
                      color: 'var(--success)',
                      border: '1px solid var(--success)'
                    }}
                  >
                    <CheckCircle size={18} weight="fill" />
                    <span className="text-sm font-medium">
                      {saveFeedback.section} saved • {saveFeedback.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Progress Bar Section - Promoted as Primary KPI */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-bold uppercase tracking-wide"
                    style={{ color: 'var(--foreground-primary)' }}
                  >
                    Profile completion
                  </span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: 'var(--foreground-primary)' }}
                  >
                    {optionalCompletionPercent}%
                  </span>
                </div>
                <div
                  className="h-3 w-full overflow-hidden rounded-full"
                  style={{ backgroundColor: 'var(--background-tertiary)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${optionalCompletionPercent}%`,
                      backgroundColor: 'var(--success)'
                    }}
                  />
                </div>
              </div>

              {/* Contextual Badges */}
              <div className="flex flex-wrap gap-2">
                {currentCareerProfile.seniority && (
                  <Badge
                    variant="secondary"
                    className="border px-3 py-1 text-xs font-medium uppercase tracking-wide"
                    style={{
                      borderColor: 'var(--border-default)',
                      backgroundColor: 'var(--background-secondary)',
                      color: 'var(--foreground-secondary)'
                    }}
                  >
                    {currentCareerProfile.seniority.replace('-', ' ')}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className="border px-3 py-1 text-xs font-medium uppercase tracking-wide"
                  style={{
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--foreground-secondary)'
                  }}
                >
                  {timeframeDetails.label}
                </Badge>
                <Badge
                  variant="secondary"
                  className="border px-3 py-1 text-xs font-medium uppercase tracking-wide"
                  style={{
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--foreground-tertiary)'
                  }}
                >
                  {timeframeDetails.window}
                </Badge>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              className="rounded-xl"
              style={{
                backgroundColor: 'var(--background-elevated)'
              }}
            >
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                    Role overview
                  </CardTitle>
                  <CardDescription style={{ color: 'var(--foreground-secondary)' }}>
                    Your current position, industry, and workplace details.
                  </CardDescription>
                </div>
                <button
                  onClick={() => handleQuickEdit('role')}
                  disabled={isQuickEditDisabled}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:opacity-80 active:opacity-60 focus:outline-none focus:ring-2 focus:ring-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap rounded-lg border"
                  style={{
                    color: 'var(--accent-primary)',
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--background-secondary)'
                  }}
                  aria-label="Quick edit - open quick edit modal for this section"
                  >
                    Quick edit
                  </button>
              </CardHeader>
              <CardContent className="space-y-6">
                <section>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-70">Current role</dt>
                      <dd className="text-base font-semibold">
                      {inlineEditing?.field === 'currentRole' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={inlineEditing.value}
                            onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                            className="px-2 py-1 text-base font-semibold border rounded focus:outline-none focus:ring-2 focus:ring-opacity-30"
                            style={{
                              backgroundColor: 'var(--background-elevated)',
                              borderColor: 'var(--border-default)',
                              color: 'var(--foreground-primary)'
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleInlineSave('currentRole', inlineEditing.value);
                              } else if (e.key === 'Escape') {
                                handleInlineCancel();
                              }
                            }}
                          />
                          <button
                            onClick={() => handleInlineSave('currentRole', inlineEditing.value)}
                            className="p-1 text-green-600 hover:text-green-700 transition-colors"
                            aria-label="Save"
                          >
                            <CheckCircle size={16} weight="fill" />
                          </button>
                          <button
                            onClick={handleInlineCancel}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                            aria-label="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleInlineEdit('currentRole', currentCareerProfile.currentRole, e.currentTarget)}
                          className="group flex items-center hover:opacity-80 transition-opacity text-left"
                          aria-label="Edit current role"
                        >
                          {currentCareerProfile.currentRole}
                        </button>
                      )}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-70">Experience level</dt>
                      <dd className="text-base font-semibold capitalize">{currentCareerProfile.seniority.replace('-', ' ')}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-70">Industry</dt>
                      <dd className="text-base font-semibold">
                      {inlineEditing?.field === 'industry' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={inlineEditing.value}
                            onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                            className="px-2 py-1 text-base font-semibold border rounded focus:outline-none focus:ring-2 focus:ring-opacity-30"
                            style={{
                              backgroundColor: 'var(--background-elevated)',
                              borderColor: 'var(--border-default)',
                              color: 'var(--foreground-primary)'
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleInlineSave('industry', inlineEditing.value);
                              } else if (e.key === 'Escape') {
                                handleInlineCancel();
                              }
                            }}
                          />
                          <button
                            onClick={() => handleInlineSave('industry', inlineEditing.value)}
                            className="p-1 text-green-600 hover:text-green-700 transition-colors"
                            aria-label="Save"
                          >
                            <CheckCircle size={16} weight="fill" />
                          </button>
                          <button
                            onClick={handleInlineCancel}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                            aria-label="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleInlineEdit('industry', currentCareerProfile.industry, e.currentTarget)}
                          className="group flex items-center hover:opacity-80 transition-opacity text-left"
                          aria-label="Edit industry"
                        >
                          {currentCareerProfile.industry}
                        </button>
                      )}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide opacity-70">Company size</dt>
                      <dd className="text-base font-semibold capitalize">
                      {inlineEditing?.field === 'companySize' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={inlineEditing.value}
                            onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                            className="px-2 py-1 text-base font-semibold border rounded focus:outline-none focus:ring-2 focus:ring-opacity-30"
                            style={{
                              backgroundColor: 'var(--background-elevated)',
                              borderColor: 'var(--border-default)',
                              color: 'var(--foreground-primary)'
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleInlineSave('companySize', inlineEditing.value);
                              } else if (e.key === 'Escape') {
                                handleInlineCancel();
                              }
                            }}
                          />
                          <button
                            onClick={() => handleInlineSave('companySize', inlineEditing.value)}
                            className="p-1 text-green-600 hover:text-green-700 transition-colors"
                            aria-label="Save"
                          >
                            <CheckCircle size={16} weight="fill" />
                          </button>
                          <button
                            onClick={handleInlineCancel}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                            aria-label="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleInlineEdit('companySize', currentCareerProfile.companySize, e.currentTarget)}
                          className="group flex items-center hover:opacity-80 transition-opacity text-left"
                          aria-label="Edit company size"
                        >
                          {currentCareerProfile.companySize}
                        </button>
                      )}
                      </dd>
                    </div>
                    </dl>
                  </section>
              </CardContent>
            </Card>

            <Card
              className="rounded-xl"
              style={{
                backgroundColor: 'var(--background-elevated)'
              }}
            >
              <CardHeader className="pb-4 pt-6">
                <CardTitle className="text-base font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                  Optional preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {pendingPrompts.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                      Recommended next steps
                    </p>
                    <div className="space-y-3">
                      {pendingPrompts.map(prompt => (
                        <div
                          key={prompt.id}
                          className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          style={{
                            backgroundColor: 'var(--background-secondary)',
                            borderColor: 'var(--border-default)'
                          }}
                        >
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                              {prompt.title}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                              {prompt.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePromptComplete(prompt.quickEdit)}
                              className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              style={{
                                backgroundColor: 'var(--accent-primary)',
                                color: 'var(--accent-primary-foreground)'
                              }}
                            >
                              Fix now
                            </button>
                            <button
                              onClick={() => handlePromptSnooze(prompt.id)}
                              className="text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              style={{ color: 'var(--accent-primary)' }}
                            >
                              Remind later
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {optionalSectionEntries.map(([sectionId, isComplete]) => {
                    const SectionIcon = isComplete ? CheckCircle : Timer;
                    const copy = OPTIONAL_SECTION_COPY[sectionId];
                    const quickEditKey = OPTIONAL_QUICK_EDIT_MAP[sectionId];
                    return (
                      <div
                        key={sectionId}
                        className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        style={{
                          backgroundColor: 'var(--background-secondary)',
                          borderColor: 'var(--border-default)'
                        }}
                      >
                        <div className="flex flex-1 items-start gap-3">
                          <SectionIcon
                            size={18}
                            weight={isComplete ? 'fill' : 'regular'}
                            className={isComplete ? 'text-emerald-600' : 'text-amber-500'}
                          />
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                              {copy.label}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                              {copy.helper}
                            </p>
                          </div>
                        </div>
                        {quickEditKey && (
                          <button
                            type="button"
                            onClick={() => handleQuickEdit(quickEditKey)}
                            disabled={isQuickEditDisabled}
                            className="px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:opacity-80 active:opacity-60 focus:outline-none focus:ring-2 focus:ring-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            style={{
                              color: 'var(--accent-primary)'
                            }}
                            aria-label={`${isComplete ? 'Edit' : 'Update'} ${copy.label}`}
                          >
                            {isComplete ? 'Edit' : 'Update'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              className="rounded-xl"
              style={{
                backgroundColor: 'var(--background-elevated)'
              }}
            >
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                    Skills & interests
                  </CardTitle>
                  <CardDescription style={{ color: 'var(--foreground-secondary)' }}>
                    Showcase the strengths you have today and the capabilities you want to build next.
                  </CardDescription>
                </div>
                <button
                  onClick={() => handleQuickEdit('skills')}
                  disabled={isQuickEditDisabled}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:opacity-80 active:opacity-60 focus:outline-none focus:ring-2 focus:ring-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap rounded-lg border"
                  style={{
                    color: 'var(--accent-primary)',
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--background-secondary)'
                  }}
                  aria-label="Quick edit - open quick edit modal for this section"
                  >
                    Quick edit
                  </button>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentCareerProfile.primarySkills.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Core skills</span>
                      {currentCareerProfile.primarySkills.length > 6 && (
                        <button
                          onClick={() => setShowAllCurrentSkills(!showAllCurrentSkills)}
                          className="text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {showAllCurrentSkills ? 'Show fewer' : `View all (${currentCareerProfile.primarySkills.length})`}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(showAllCurrentSkills ? currentCareerProfile.primarySkills : currentCareerProfile.primarySkills.slice(0, 6)).map((skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="rounded-full border px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md"
                          style={{
                            backgroundColor: 'var(--background-elevated)',
                            borderColor: 'var(--border-default)',
                            color: 'var(--foreground-primary)',
                            boxShadow: 'var(--shadow-xs)'
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {currentCareerProfile.skillsToLearn.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Learning goals</span>
                      {currentCareerProfile.skillsToLearn.length > 6 && (
                        <button
                          onClick={() => setShowAllLearningGoals(!showAllLearningGoals)}
                          className="text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {showAllLearningGoals ? 'Show fewer' : `View all (${currentCareerProfile.skillsToLearn.length})`}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(showAllLearningGoals ? currentCareerProfile.skillsToLearn : currentCareerProfile.skillsToLearn.slice(0, 6)).map((skill, index) => (
                        <GreenBadge key={`${skill}-${index}`}>
                          {skill}
                        </GreenBadge>
                      ))}
                    </div>
                  </section>
                )}
              </CardContent>
            </Card>

            <Card
              className="rounded-xl"
              style={{
                backgroundColor: 'var(--background-elevated)'
              }}
            >
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                    Career goals
                  </CardTitle>
                  <CardDescription style={{ color: 'var(--foreground-secondary)' }}>
                    Clarify what you are driving toward so we can track progress alongside you.
                  </CardDescription>
                </div>
                <button
                  onClick={() => handleQuickEdit('goals')}
                  disabled={isQuickEditDisabled}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:opacity-80 active:opacity-60 focus:outline-none focus:ring-2 focus:ring-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap rounded-lg border"
                  style={{
                    color: 'var(--accent-primary)',
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--background-secondary)'
                  }}
                  aria-label="Quick edit - open quick edit modal for this section"
                  >
                    Quick edit
                  </button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Focus areas</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {currentCareerProfile.careerGoals.length > 0 ? (
                      currentCareerProfile.careerGoals.slice(0, 4).map((goal, index) => (
                        <span
                          key={`${goal}-${index}`}
                          className="rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm"
                          style={{
                            backgroundColor: 'var(--accent-primary-light)',
                            borderColor: 'var(--accent-border)',
                            color: 'var(--accent-primary)'
                          }}
                        >
                          {formatGoalLabel(goal)}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--foreground-tertiary)' }}>
                        Add the outcomes you are aiming for next.
                      </p>
                    )}
                    {currentCareerProfile.careerGoals.length > 4 && (
                      <span
                        className="rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm"
                        style={{
                          backgroundColor: 'var(--background-secondary)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--foreground-secondary)'
                        }}
                      >
                        +{currentCareerProfile.careerGoals.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</span>
                  <div
                    className="mt-3 inline-flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderColor: 'var(--border-default)'
                    }}
                  >
                    <span style={{ color: 'var(--accent-primary)' }}><MaterialIcon name="time" size={18} /></span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                        {timeframeDetails.label}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>
                        {timeframeDetails.window}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {quickEditSection && currentCareerProfile && (
        <QuickEditModal
          isOpen={!!quickEditSection}
          onClose={handleQuickEditClose}
          section={quickEditSection}
          currentProfile={currentCareerProfile}
          onSectionCompleted={handleOptionalSectionCompleted}
          onStateChange={setQuickEditModalState}
        />
      )}
    </>
  );
};

export default CareerProfileManager;
