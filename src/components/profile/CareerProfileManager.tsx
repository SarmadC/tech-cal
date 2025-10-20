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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/Icon';
import { CheckCircle, Clock, User } from '@phosphor-icons/react';
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

const OPTIONAL_QUICK_EDIT_MAP: Record<keyof CareerOptionalSectionStatus, string> = {
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
  const completedOptionalSections = optionalSectionEntries.filter(([, isComplete]) => isComplete).length;
  const optionalCompletionPercent = optionalSectionEntries.length > 0
    ? Math.round((completedOptionalSections / optionalSectionEntries.length) * 100)
    : 0;

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
  const heroStats: Array<{ label: string; value: number; caption: string }> = [
    {
      label: 'Core skills',
      value: currentCareerProfile.primarySkills.length,
      caption: currentCareerProfile.primarySkills.length
        ? currentCareerProfile.primarySkills.slice(0, 2).join(', ')
        : 'Add skills you use every day'
    },
    {
      label: 'Learning goals',
      value: currentCareerProfile.skillsToLearn.length,
      caption: currentCareerProfile.skillsToLearn.length
        ? currentCareerProfile.skillsToLearn.slice(0, 2).join(', ')
        : 'Identify the next skills to target'
    },
    {
      label: 'Focus areas',
      value: currentCareerProfile.careerGoals.length,
      caption: currentCareerProfile.careerGoals.length
        ? formatGoalLabel(currentCareerProfile.careerGoals[0])
        : 'Define where you want to grow'
    }
  ];
  const remainingOptionalSections = Math.max(optionalSectionEntries.length - completedOptionalSections, 0);

  // Show completed career profile with edit option
  return (
    <>
      <div key={`profile-${lastUpdate}`} className={`career-profile-manager completed ${className}`}>
        <div className="space-y-8">
          <section
            className="rounded-2xl border shadow-sm transition-shadow hover:shadow-md"
            style={{
              backgroundColor: 'var(--background-main)',
              borderColor: 'var(--border-default)',
              color: 'var(--foreground-primary)'
            }}
          >
            <div className="p-6 sm:p-8 space-y-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.35em]"
                    style={{ color: 'var(--foreground-tertiary)' }}
                  >
                    Career snapshot
                  </p>
                  <h3
                    className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl"
                    style={{ color: 'var(--foreground-primary)' }}
                  >
                    {currentCareerProfile.currentRole}
                  </h3>
                  <p
                    className="mt-2 text-sm"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    {currentCareerProfile.industry}
                    {currentCareerProfile.companySize ? ` • ${String(currentCareerProfile.companySize).replace('-', ' ')} company` : ''}
                  </p>
                </div>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{
                    backgroundColor: 'var(--background-elevated)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--foreground-primary)'
                  }}
                >
                  Edit profile
                </button>
              </div>
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
              <div className="grid gap-4 sm:grid-cols-3">
                {heroStats.map(({ label, value, caption }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 rounded-xl border px-4 py-3"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderColor: 'var(--border-default)'
                    }}
                  >
                    <span
                      className="text-2xl font-semibold"
                      style={{ color: 'var(--foreground-primary)' }}
                    >
                      {value}
                    </span>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--foreground-secondary)' }}
                    >
                      {label}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--foreground-tertiary)' }}>
                      {caption}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    Profile depth
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--foreground-primary)' }}
                  >
                    {optionalCompletionPercent}%
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  style={{ backgroundColor: 'var(--background-tertiary)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${optionalCompletionPercent}%`,
                      backgroundColor: 'var(--accent-primary)'
                    }}
                  />
                </div>
                <p
                  className="text-xs"
                  style={{ color: 'var(--foreground-tertiary)' }}
                >
                  {remainingOptionalSections > 0
                    ? `${remainingOptionalSections} optional preference${remainingOptionalSections > 1 ? 's' : ''} left for richer recommendations.`
                    : 'Optional preferences complete – great job!'}
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              className="border shadow-sm"
              style={{
                borderColor: 'var(--border-default)',
                backgroundColor: 'var(--background-main)'
              }}
            >
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                    Role overview
                  </CardTitle>
                  <CardDescription style={{ color: 'var(--foreground-secondary)' }}>
                    Keep this information current so we can surface the most relevant opportunities.
                  </CardDescription>
                </div>
                <button
                  onClick={() => handleQuickEdit('role')}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{
                    backgroundColor: 'var(--accent-primary-light)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent-primary)'
                  }}
                >
                  Quick edit
                </button>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current role</dt>
                    <dd className="text-base font-medium text-foreground">{currentCareerProfile.currentRole}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Experience level</dt>
                    <dd className="text-base font-medium text-foreground capitalize">{currentCareerProfile.seniority.replace('-', ' ')}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Industry</dt>
                    <dd className="text-base font-medium text-foreground">{currentCareerProfile.industry}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company size</dt>
                    <dd className="text-base font-medium text-foreground capitalize">{currentCareerProfile.companySize}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card
              className="border shadow-sm"
              style={{
                borderColor: 'var(--border-default)',
                backgroundColor: 'var(--background-main)'
              }}
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                  Optional preferences
                </CardTitle>
                <CardDescription style={{ color: 'var(--foreground-secondary)' }}>
                  Complete these sections to unlock richer recommendations.
                </CardDescription>
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

                <div
                  className="rounded-xl border p-4 shadow-inner"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    borderColor: 'var(--border-default)'
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
                    Progress
                  </p>
                  <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--foreground-primary)' }}>
                    {optionalCompletionPercent}% complete
                  </p>
                  <p className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>
                    {remainingOptionalSections > 0
                      ? `Complete ${remainingOptionalSections} more preference${remainingOptionalSections > 1 ? 's' : ''} to reach 100%.`
                      : 'All optional preferences are complete.'}
                  </p>
                </div>

                <div className="space-y-3">
                  {optionalSectionEntries.map(([sectionId, isComplete]) => {
                    const SectionIcon = isComplete ? CheckCircle : Clock;
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
                        {isComplete ? (
                          <span
                            className="text-xs font-semibold"
                            style={{ color: 'var(--success)' }}
                          >
                            Complete
                          </span>
                        ) : (
                          quickEditKey && (
                            <button
                              type="button"
                              onClick={() => handleQuickEdit(quickEditKey)}
                              className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              style={{
                                backgroundColor: 'var(--accent-primary-light)',
                                color: 'var(--accent-primary)'
                              }}
                            >
                              Update
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              className="border shadow-sm"
              style={{
                borderColor: 'var(--border-default)',
                backgroundColor: 'var(--background-main)'
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
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{
                    backgroundColor: 'var(--accent-primary-light)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent-primary)'
                  }}
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
                        <span
                          key={`${skill}-${index}`}
                          className="rounded-full border px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md"
                          style={{
                            backgroundColor: 'var(--success-light)',
                            borderColor: 'var(--success)',
                            color: 'var(--success)',
                            boxShadow: 'var(--shadow-xs)'
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </CardContent>
            </Card>

            <Card
              className="border shadow-sm"
              style={{
                borderColor: 'var(--border-default)',
                backgroundColor: 'var(--background-main)'
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
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{
                    backgroundColor: 'var(--accent-primary-light)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent-primary)'
                  }}
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
        />
      )}
    </>
  );
};

export default CareerProfileManager;
