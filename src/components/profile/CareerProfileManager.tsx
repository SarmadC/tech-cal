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
import { CheckCircle, Timer, User, X, PencilSimple } from '@phosphor-icons/react';
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

// Helper to format learning style labels
const formatLearningStyle = (style: string): string => {
  const labels: Record<string, string> = {
    'hands-on': 'Hands-on Workshops',
    'theoretical': 'Lectures & Presentations',
    'interactive': 'Discussions & Q&A',
    'networking': 'Networking & Meeting People',
    'case-studies': 'Real-world Examples',
    'peer-learning': 'Learning from Peers'
  };
  return labels[style] || style.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

// Helper to format available time
const formatAvailableTime = (time: string): string => {
  const labels: Record<string, string> = {
    'very-limited': 'Very Limited (< 2 hrs/month)',
    'limited': 'Limited (2-8 hrs/month)',
    'moderate': 'Moderate (8-20 hrs/month)',
    'flexible': 'Flexible (20+ hrs/month)',
    'dedicated': 'Dedicated (can take time off)'
  };
  return labels[time] || time;
};

// Helper to format budget
const formatBudget = (budget: string): string => {
  const labels: Record<string, string> = {
    'free-only': 'Free events only',
    'low': 'Low ($1-100/month)',
    'moderate': 'Moderate ($100-500/month)',
    'high': 'High ($500-2000/month)',
    'unlimited': 'No budget constraints'
  };
  return labels[budget] || budget;
};

// Helper to format networking goals
const formatNetworkingGoal = (goal: string): string => {
  const labels: Record<string, string> = {
    'find-mentors': 'Connect with mentors',
    'find-mentees': 'Support mentees',
    'find-peers': 'Meet peers at my level',
    'find-collaborators': 'Find collaborators',
    'find-employers': 'Explore job opportunities',
    'industry-insights': 'Learn industry trends',
    'thought-leadership': 'Establish expertise'
  };
  return labels[goal] || goal.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

// Helper to format event types
const formatEventType = (type: string): string => {
  return type.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

// Helper to format company size
const formatCompanySize = (size: string): string => {
  const labels: Record<string, string> = {
    'startup': 'Startup (< 50)',
    'small': 'Small (50-200)',
    'medium': 'Medium (200-1000)',
    'large': 'Large (1000-10000)',
    'enterprise': 'Enterprise (10000+)',
    'freelance': 'Freelance/Independent'
  };
  return labels[size] || size;
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
      <div 
        className={`career-profile-manager editing ${className}`}
        style={{ backgroundColor: 'var(--background-main)' }}
      >
        <div className="relative">
          {isSubmitting && (
            <div className="absolute inset-0 z-10 rounded-xl">
              <div 
                className="absolute inset-0 backdrop-blur-sm"
                style={{ 
                  backgroundColor: 'var(--background-main)',
                  opacity: 0.9
                }}
              />
              <div className="relative flex items-center justify-center h-full">
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
            </div>
          )}
          
          <CareerOnboarding
            onComplete={handleComplete}
            onSkip={handleCancel}
            preserveDataOnSkip={true}
            initialData={currentCareerProfile ? {
              step1_role: {
                currentRole: currentCareerProfile.currentRole || '',
                seniority: currentCareerProfile.seniority || 'mid-level',
                industry: currentCareerProfile.industry || '',
                companySize: currentCareerProfile.companySize || 'medium'
              },
              step2_skills: {
                primarySkills: currentCareerProfile.primarySkills || [],
                skillsToLearn: currentCareerProfile.skillsToLearn || [],
                interests: currentCareerProfile.interests || [],
                skillTags: currentCareerProfile.skillTags || []
              },
              step3_goals: {
                careerGoals: currentCareerProfile.careerGoals || [],
                timeframe: currentCareerProfile.timeframe || 'medium-term'
              },
              step4_preferences: {
                learningStyle: currentCareerProfile.learningStyle || [],
                availableTime: currentCareerProfile.availableTime || 'moderate',
                budget: currentCareerProfile.budget || 'moderate'
              },
              step5_networking: {
                networkingGoals: currentCareerProfile.networkingGoals || [],
                preferredEventTypes: currentCareerProfile.preferredEventTypes || []
              }
            } : undefined}
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
        <div className="space-y-8">
          {/* Page Header - Clean Linear Style */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div>
                <h1 className="text-2xl font-medium text-zinc-100">
                    {currentCareerProfile.currentRole}
                  </h1>
                <p className="text-sm text-zinc-500 mt-1">
                  Manage your role, skills, and goals.
                </p>
                </div>
                <button
                  onClick={handleEdit}
                className="border border-white/10 hover:bg-white/5 px-3 py-1.5 rounded-md text-sm text-zinc-300 hover:text-zinc-200 transition-colors"
                aria-label="Edit profile"
                >
                  Edit profile
                </button>
              </div>

              {/* Inline Save Feedback */}
              {saveFeedback && (
                <div className="animate-in fade-in slide-in-from-top-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs">
                  <CheckCircle size={14} weight="fill" />
                  <span>
                      {saveFeedback.section} saved • {saveFeedback.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
                </div>

          {/* Bento Grid Layout - 3 Columns on Desktop */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Column 1: Role & Stats */}
            <div className="space-y-4">
              {/* Role Card */}
              <div
                className="group relative bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:bg-zinc-900 transition-colors cursor-pointer"
                onClick={() => !isQuickEditDisabled && handleQuickEdit('role')}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-medium text-zinc-400">Current Role</h3>
                  <PencilSimple size={14} className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="space-y-4">
                <div>
                      {inlineEditing?.field === 'currentRole' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={inlineEditing.value}
                            onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                          className="flex-1 px-2 py-1 text-base font-medium text-zinc-100 bg-zinc-800 border border-white/5 rounded focus:outline-none focus:ring-1 focus:ring-white/20"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleInlineSave('currentRole', inlineEditing.value);
                              } else if (e.key === 'Escape') {
                                handleInlineCancel();
                              }
                            }}
                          onClick={(e) => e.stopPropagation()}
                          />
                          <button
                          onClick={(e) => { e.stopPropagation(); handleInlineSave('currentRole', inlineEditing.value); }}
                          className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                            aria-label="Save"
                          >
                            <CheckCircle size={16} weight="fill" />
                          </button>
                          <button
                          onClick={(e) => { e.stopPropagation(); handleInlineCancel(); }}
                          className="p-1 text-zinc-500 hover:text-zinc-400 transition-colors"
                            aria-label="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                      <p className="text-base font-medium text-zinc-100">
                          {currentCareerProfile.currentRole}
                      </p>
                      )}
                    <p className="text-xs text-zinc-500 mt-1 capitalize">{currentCareerProfile.seniority.replace('-', ' ')}</p>
                    </div>
                    </div>
              </div>

              {/* Stats Card */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-4">Workplace</h3>
                <div className="space-y-4">
                  <div>
                    <dt className="text-xs text-zinc-500 uppercase font-semibold mb-1">Industry</dt>
                    <dd className="text-sm text-zinc-200">
                      {inlineEditing?.field === 'industry' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={inlineEditing.value}
                            onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                            className="px-2 py-1 text-sm text-zinc-200 bg-zinc-800 border border-white/5 rounded focus:outline-none focus:ring-1 focus:ring-white/20"
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
                            className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                            aria-label="Save"
                          >
                            <CheckCircle size={14} weight="fill" />
                          </button>
                          <button
                            onClick={handleInlineCancel}
                            className="p-1 text-zinc-500 hover:text-zinc-400 transition-colors"
                            aria-label="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleInlineEdit('industry', currentCareerProfile.industry, e.currentTarget); }}
                          className="hover:text-zinc-100 transition-colors text-left"
                          aria-label="Edit industry"
                        >
                          {currentCareerProfile.industry}
                        </button>
                      )}
                      </dd>
                    </div>
                  <div>
                    <dt className="text-xs text-zinc-500 uppercase font-semibold mb-1">Company Size</dt>
                    <dd className="text-sm text-zinc-200">
                      {inlineEditing?.field === 'companySize' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={inlineEditing.value}
                            onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
                            className="px-2 py-1 text-sm text-zinc-200 bg-zinc-800 border border-white/5 rounded focus:outline-none focus:ring-1 focus:ring-white/20"
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
                            className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                            aria-label="Save"
                          >
                            <CheckCircle size={14} weight="fill" />
                          </button>
                          <button
                            onClick={handleInlineCancel}
                            className="p-1 text-zinc-500 hover:text-zinc-400 transition-colors"
                            aria-label="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleInlineEdit('companySize', currentCareerProfile.companySize, e.currentTarget); }}
                          className="hover:text-zinc-100 transition-colors text-left"
                          aria-label="Edit company size"
                        >
                          {formatCompanySize(currentCareerProfile.companySize)}
                        </button>
                      )}
                      </dd>
                    </div>
                </div>
              </div>
            </div>

            {/* Column 2: Skills & Preferences */}
            <div className="space-y-4">
              {/* Skills Card */}
              <div
                className="group relative bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:bg-zinc-900 transition-colors cursor-pointer"
                onClick={() => !isQuickEditDisabled && handleQuickEdit('skills')}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-medium text-zinc-400">Skills & Interests</h3>
                  <PencilSimple size={14} className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                <div className="space-y-4">
                  {currentCareerProfile.primarySkills.length > 0 && (
                    <div>
                      <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Core skills</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(showAllCurrentSkills ? currentCareerProfile.primarySkills : currentCareerProfile.primarySkills.slice(0, 8)).map((skill, index) => (
                          <span
                            key={`${skill}-${index}`}
                            className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                        {currentCareerProfile.primarySkills.length > 8 && !showAllCurrentSkills && (
                            <button
                            onClick={(e) => { e.stopPropagation(); setShowAllCurrentSkills(true); }}
                            className="text-xs text-zinc-500 hover:text-zinc-400 px-2 py-1"
                            >
                            +{currentCareerProfile.primarySkills.length - 8}
                            </button>
                        )}
                    </div>
                  </div>
                )}
                  {currentCareerProfile.skillsToLearn.length > 0 && (
                          <div>
                      <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Learning goals</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(showAllLearningGoals ? currentCareerProfile.skillsToLearn : currentCareerProfile.skillsToLearn.slice(0, 8)).map((skill, index) => (
                          <span
                            key={`${skill}-${index}`}
                            className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                        {currentCareerProfile.skillsToLearn.length > 8 && !showAllLearningGoals && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowAllLearningGoals(true); }}
                            className="text-xs text-zinc-500 hover:text-zinc-400 px-2 py-1"
                          >
                            +{currentCareerProfile.skillsToLearn.length - 8}
                          </button>
                        )}
                      </div>
                </div>
                )}
                </div>
          </div>

              {/* Preferences Card */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-4">Preferences</h3>
                <div className="space-y-5">
                  {/* Learning Preferences */}
                  {optionalStatus.learningPreferences && currentCareerProfile.learningStyle && currentCareerProfile.learningStyle.length > 0 && (
                <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MaterialIcon name="code" size={14} className="text-zinc-500 flex-shrink-0" />
                        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Learning</span>
                </div>
                      <ul className="space-y-1.5">
                        {currentCareerProfile.learningStyle.slice(0, 4).map((style, index) => (
                          <li key={`${style}-${index}`} className="flex items-center gap-2 text-sm text-zinc-300">
                            <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                            <span>{formatLearningStyle(style)}</span>
                          </li>
                        ))}
                        {currentCareerProfile.availableTime && (
                          <li className="flex items-center gap-2 text-sm text-zinc-300">
                            <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                            <span>{formatAvailableTime(currentCareerProfile.availableTime)}</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Networking Preferences */}
                  {optionalStatus.networkingPreferences && currentCareerProfile.networkingGoals && currentCareerProfile.networkingGoals.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MaterialIcon name="people" size={14} className="text-zinc-500 flex-shrink-0" />
                        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Networking</span>
                      </div>
                      <ul className="space-y-1.5">
                        {currentCareerProfile.networkingGoals.slice(0, 4).map((goal, index) => (
                          <li key={`${goal}-${index}`} className="flex items-center gap-2 text-sm text-zinc-300">
                            <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                            <span>{formatNetworkingGoal(goal)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Event Formats */}
                  {optionalStatus.teamPreferences && currentCareerProfile.preferredEventTypes && currentCareerProfile.preferredEventTypes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MaterialIcon name="event" size={14} className="text-zinc-500 flex-shrink-0" />
                        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Event Formats</span>
                      </div>
                      <ul className="space-y-1.5">
                        {currentCareerProfile.preferredEventTypes.slice(0, 4).map((type, index) => (
                          <li key={`${type}-${index}`} className="flex items-center gap-2 text-sm text-zinc-300">
                            <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                            <span>{formatEventType(type)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Show prompts if any incomplete */}
                  {pendingPrompts.length > 0 && (
                    <div className="pt-3 border-t border-white/5">
                      {pendingPrompts.slice(0, 2).map(prompt => (
                        <button
                          key={prompt.id}
                          onClick={() => handlePromptComplete(prompt.quickEdit)}
                          className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors block mb-1.5"
                        >
                          + Add {prompt.title.toLowerCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Goals & Progress */}
            <div className="space-y-4">
              {/* Goals Card */}
              <div
                className="group relative bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:bg-zinc-900 transition-colors cursor-pointer"
                onClick={() => !isQuickEditDisabled && handleQuickEdit('goals')}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-medium text-zinc-400">Career Goals</h3>
                  <PencilSimple size={14} className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="space-y-4">
                <div>
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Focus areas</span>
                    <div className="flex flex-wrap gap-1.5">
                    {currentCareerProfile.careerGoals.length > 0 ? (
                        currentCareerProfile.careerGoals.slice(0, 6).map((goal, index) => (
                        <span
                          key={`${goal}-${index}`}
                            className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-md"
                        >
                          {formatGoalLabel(goal)}
                        </span>
                      ))
                    ) : (
                        <p className="text-xs text-zinc-500">
                        Add the outcomes you are aiming for next.
                      </p>
                    )}
                  </div>
                </div>
                <div>
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">Timeline</span>
                    <div className="flex items-center gap-2">
                      <MaterialIcon name="time" size={14} className="text-zinc-500 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-zinc-100">
                        {timeframeDetails.label}
                      </p>
                        <p className="text-xs text-zinc-500">
                        {timeframeDetails.window}
                      </p>
                    </div>
                  </div>
                </div>
                </div>
              </div>

              {/* Progress Card */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Profile Strength</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-zinc-100">{optionalCompletionPercent}%</span>
                    <span className="text-xs text-zinc-500">Complete</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${optionalCompletionPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    {optionalCompletionPercent === 100 ? 'All sections ready.' : 'Complete remaining sections to improve recommendations.'}
                  </p>
                </div>
              </div>
            </div>
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
