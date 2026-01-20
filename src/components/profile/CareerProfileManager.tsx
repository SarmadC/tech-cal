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
import { Button } from '@/components/ui/button';
import { User, CheckCircle, PencilSimple } from '@phosphor-icons/react';
import { AnalyticsService } from '@/services/analyticsService';

// --- Shared Components (Linear Style) ---

const SettingSection = ({
    title,
    description,
    onEdit,
    editLabel = "Edit",
    children
}: {
    title: string,
    description?: string,
    onEdit?: () => void,
    editLabel?: string,
    children: React.ReactNode
}) => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 py-8 border-b border-zinc-200 dark:border-zinc-800 last:border-0 relative">
        <div className="col-span-4 space-y-4">
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{title}</h3>
                </div>
                {description && (
                    <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[90%]">{description}</p>
                )}
            </div>
            {onEdit && (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    onClick={onEdit}
                >
                    {editLabel}
                </Button>
            )}
        </div>
        <div className="col-span-8">
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    </div>
);

const SettingRow = ({
    label,
    value,
    className = '',
    onSet
}: {
    label: string,
    value?: React.ReactNode,
    className?: string,
    onSet?: () => void
}) => (
    <div className={`flex items-baseline justify-between py-2 min-h-[32px] ${className}`}>
        <div className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0 w-1/3">
            {label}
        </div>
        <div className="text-[13px] text-zinc-900 dark:text-zinc-100 text-right font-medium max-w-[66%] leading-relaxed">
            {value ? (
                value
            ) : (
                <button
                    onClick={onSet}
                    className="text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 px-2 py-0.5 rounded text-[12px] font-medium"
                >
                    Set now
                </button>
            )}
        </div>
    </div>
);

// --- Helper Functions ---

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

const formatLearningStyle = (style: string): string => {
    const labels: Record<string, string> = {
        'hands-on': 'Hands-on',
        'theoretical': 'Lectures',
        'interactive': 'Discussions',
        'networking': 'Networking',
        'case-studies': 'Case Studies',
        'peer-learning': 'Peer Learning'
    };
    return labels[style] || style;
};

const formatList = (items: string[], formatter?: (item: string) => string) => {
    if (!items || items.length === 0) return null;
    return (
        <span className="inline-block">
            {items.map((item, i) => (
                <span key={i}>
                    {formatter ? formatter(item) : item}
                    {i < items.length - 1 && <span className="text-zinc-400 dark:text-zinc-600 mr-1.5">,</span>}
                </span>
            ))}
        </span>
    );
};

// --- Types & Constants ---

export interface CareerProfileManagerProps {
    className?: string;
    onProfileUpdate?: (profile: CareerProfile) => void;
}

const DEFAULT_OPTIONAL_STATUS = {
    learningPreferences: false,
    networkingPreferences: false,
    teamPreferences: false
};

const OPTIONAL_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export default function CareerProfileManager({
    className = '',
    onProfileUpdate
}: CareerProfileManagerProps) {
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

    // Kept for backward compatibility/logic if needed, though prompts are less prominent in this view
    const [dismissedPromptIds, setDismissedPromptIds] = useState<string[]>([]);
    const loggedShownPrompts = useRef<Set<string>>(new Set());
    const completedSectionsRef = useRef<Set<string>>(new Set());
    const [saveFeedback, setSaveFeedback] = useState<{ section: string; timestamp: Date } | null>(null);

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

    // --- Logic for Prompts/Notifications ---
    const logPromptEvent = useCallback((event: 'prompt_shown' | 'prompt_opened' | 'prompt_snoozed' | 'prompt_completed', sectionId: keyof CareerOptionalSectionStatus, extra: Record<string, unknown> = {}) => {
        AnalyticsService.logProfilePromptEvent(event, {
            section: sectionId,
            userId: user?.id ?? null,
            ...extra
        });
    }, [user?.id]);

    React.useEffect(() => {
        if (!optionalSections) return;
        const nextCompleted = new Set<string>();
        if (optionalSections.learningPreferences) nextCompleted.add('learningPreferences');
        if (optionalSections.networkingPreferences) nextCompleted.add('networkingPreferences');
        if (optionalSections.teamPreferences) nextCompleted.add('teamPreferences');
        completedSectionsRef.current = nextCompleted;
    }, [optionalSections]);


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
            await queryClient.invalidateQueries({ queryKey: ['profile'] });
            await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            await queryClient.invalidateQueries({ queryKey: ['filtered-events'] });
            window.dispatchEvent(new CustomEvent('profile-updated'));
        } catch (error) {
            console.error('Career profile update error:', error);
            showError('Failed to update career profile. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickEdit = (section: QuickEditSection) => {
        const optionalKey = sectionKeyMap[section];
        if (optionalKey) {
            setDismissedPromptIds(prev => prev.filter(id => id !== optionalKey));
            loggedShownPrompts.current.delete(optionalKey);
        }
        setQuickEditSection(section);
    };

    const handleQuickEditClose = () => {
        // If save happened within modal, isDirty might be reset, but we can check if successful
        // We can just close it.
        setQuickEditSection(null);
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

    // --- Loading & Error States ---
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-500 mx-auto mb-2"></div>
                    <p className="text-sm text-zinc-500">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <p className="text-red-500 text-sm mb-2">Error loading profile</p>
                    <button onClick={refreshProfile} className="text-sm underline transition text-zinc-500 hover:text-zinc-900">
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    // --- Onboarding / Incomplete State ---
    if (!hasCompletedOnboarding || !currentCareerProfile) {
        return (
            <div className={`career-profile-manager incomplete ${className}`}>
                <div className="rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <User size={32} className="text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
                                Complete Your Career Profile
                            </h3>
                            <p className="mb-4 text-zinc-500 dark:text-zinc-400">
                                Get personalized event recommendations by telling us about your career goals and interests.
                            </p>
                            <div className="flex gap-3">
                                <Button onClick={() => setIsEditing(true)}>
                                    Complete Profile
                                </Button>
                                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                                    Skip for Now
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Onboarding Modal */}
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                            <CareerOnboarding
                                onComplete={handleComplete}
                                onSkip={() => setIsEditing(false)}
                                preserveDataOnSkip={true}
                                initialData={undefined}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- Main View (Linear Style Settings) ---
    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Career Profile</h2>
                    <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1">
                        Manage your role, skills, and preferences to improve recommendations.
                    </p>
                </div>
                {saveFeedback && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
                            <CheckCircle size={14} weight="fill" />
                            <span>Saved</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800">
                {/* Professional Profile */}
                <SettingSection
                    title="Professional Profile"
                    description="Your current role and workplace details."
                    onEdit={() => handleQuickEdit('role')}
                    editLabel="Edit Profile"
                >
                    <SettingRow label="Current Role" value={currentCareerProfile.currentRole} onSet={() => handleQuickEdit('role')} />
                    <SettingRow label="Seniority" value={currentCareerProfile.seniority ? currentCareerProfile.seniority.replace('-', ' ') : undefined} onSet={() => handleQuickEdit('role')} />
                    <SettingRow label="Industry" value={currentCareerProfile.industry} onSet={() => handleQuickEdit('role')} />
                    <SettingRow label="Company Size" value={formatCompanySize(currentCareerProfile.companySize || '')} onSet={() => handleQuickEdit('role')} />
                </SettingSection>

                {/* Skills & Interests */}
                <SettingSection
                    title="Skills & Interests"
                    description="Skills you have and want to learn."
                    onEdit={() => handleQuickEdit('skills')}
                    editLabel="Edit Skills"
                >
                    <SettingRow
                        label="Primary Skills"
                        value={formatList(currentCareerProfile.primarySkills)}
                        onSet={() => handleQuickEdit('skills')}
                    />
                    <SettingRow
                        label="Skills to Learn"
                        value={formatList(currentCareerProfile.skillsToLearn)}
                        onSet={() => handleQuickEdit('skills')}
                    />
                    <SettingRow
                        label="Interests"
                        value={formatList(currentCareerProfile.interests)}
                        onSet={() => handleQuickEdit('skills')}
                    />
                </SettingSection>

                {/* Goals */}
                <SettingSection
                    title="Career Goals"
                    description="Your goals and timeline."
                    onEdit={() => handleQuickEdit('goals')}
                    editLabel="Edit Goals"
                >
                    <SettingRow
                        label="Timeframe"
                        value={<span className="capitalize">{currentCareerProfile.timeframe?.replace('-', ' ') || 'Medium Term'}</span>}
                        onSet={() => handleQuickEdit('goals')}
                    />
                    <SettingRow
                        label="Goals"
                        value={currentCareerProfile.careerGoals && currentCareerProfile.careerGoals.length > 0 ? (
                            <span>
                                {currentCareerProfile.careerGoals.map((goal, i) => (
                                    <span key={i}>
                                        {goal.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        {i < currentCareerProfile.careerGoals.length - 1 && <span className="text-zinc-400 dark:text-zinc-600 mr-1.5">,</span>}
                                    </span>
                                ))}
                            </span>
                        ) : undefined}
                        onSet={() => handleQuickEdit('goals')}
                    />
                </SettingSection>

                {/* Preferences - Learning */}
                <SettingSection
                    title="Learning Preferences"
                    description="How you prefer to learn."
                    onEdit={() => handleQuickEdit('learning')}
                    editLabel="Edit Preferences"
                >
                    <SettingRow
                        label="Learning Style"
                        value={formatList(currentCareerProfile.learningStyle || [], formatLearningStyle)}
                        onSet={() => handleQuickEdit('learning')}
                    />
                    <SettingRow
                        label="Availability"
                        value={<span className="capitalize">{currentCareerProfile.availableTime?.replace('-', ' ') || 'Moderate'}</span>}
                        onSet={() => handleQuickEdit('learning')}
                    />
                    <SettingRow
                        label="Budget"
                        value={<span className="capitalize">{currentCareerProfile.budget?.replace('-', ' ') || 'Moderate'}</span>}
                        onSet={() => handleQuickEdit('learning')}
                    />
                </SettingSection>

                {/* Preferences - Networking & Team */}
                <SettingSection
                    title="Networking & Team"
                    description="Who you want to meet and event formats."
                    onEdit={() => handleQuickEdit('networking')}
                    editLabel="Edit Networking"
                >
                    <SettingRow
                        label="Networking Goals"
                        value={currentCareerProfile.networkingGoals && currentCareerProfile.networkingGoals.length > 0 ? (
                            <span>
                                {currentCareerProfile.networkingGoals.map((goal, i) => (
                                    <span key={i}>
                                        {goal.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        {i < currentCareerProfile.networkingGoals.length - 1 && <span className="text-zinc-400 dark:text-zinc-600 mr-1.5">,</span>}
                                    </span>
                                ))}
                            </span>
                        ) : undefined}
                        onSet={() => handleQuickEdit('networking')}
                    />
                    <SettingRow
                        label="Event Formats"
                        value={formatList(currentCareerProfile.preferredEventTypes || [], (t) => t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}
                        onSet={() => handleQuickEdit('team')}
                    />
                </SettingSection>

            </div>

            {/* Quick Edit Modal */}
            <QuickEditModal
                isOpen={!!quickEditSection}
                onClose={handleQuickEditClose}
                section={quickEditSection || 'role'}
                currentProfile={currentCareerProfile}
                onSectionCompleted={handleOptionalSectionCompleted}
                onStateChange={setQuickEditModalState}
            />
        </div>
    );
}
