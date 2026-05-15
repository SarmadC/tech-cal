'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CareerProfile, CareerOnboardingData, CareerOptionalSectionStatus } from '@/types/career';
import { QuickEditSection } from './quick-edit/sections';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import { useAuth } from '@/contexts';
import CareerOnboarding from '@/components/onboarding/CareerOnboarding';
import { MobileCareerOnboarding } from '@/components/onboarding/mobile/MobileCareerOnboarding';
import QuickEditModal from './quick-edit';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Button } from '@/components/ui/button';
import { IdentificationCard, CaretRight } from '@phosphor-icons/react';
import { AnalyticsService } from '@/services/analyticsService';
import { useIsMobile } from '@/hooks/useDeviceDetection';
import { filteredEventKeys } from '@/lib/queryKeys';
import { NETWORKING_GOAL_OPTIONS, EVENT_TYPE_OPTIONS } from './quick-edit/config';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';

// --- Shared Components (Refined Linear Style) ---

const SettingSection = ({
    title,
    description,
    children
}: {
    title: string,
    description?: string,
    children: React.ReactNode
}) => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 py-6 border-b border-[var(--border-default)]/20 last:border-0 relative group/section">
        <div className="col-span-4 space-y-1">
            <h3 className="text-sm font-medium text-[var(--foreground-primary)] leading-tight">{title}</h3>
            {description && (
                <p className="text-[13px] text-[var(--foreground-tertiary)] leading-relaxed max-w-[90%]">{description}</p>
            )}
        </div>
        <div className="col-span-8">
            <div className="grid grid-cols-1 border-t border-[var(--border-default)]/20">
                {children}
            </div>
        </div>
    </div>
);

const SettingRow = ({
    label,
    value,
    onClick,
    isEmpty = false,
    className = ''
}: {
    label: string,
    value?: React.ReactNode,
    onClick?: () => void,
    isEmpty?: boolean,
    className?: string
}) => (
    <div
        onClick={onClick}
        className={`group flex items-center justify-between py-2 border-b border-[var(--border-default)]/20 last:border-0 min-h-[40px] cursor-pointer hover:bg-[var(--background-secondary)]/30 -mx-2 px-2 transition-colors ${className}`}
    >
        <div className="text-[13px] font-medium text-[var(--foreground-primary)] transition-colors shrink-0 w-1/3">
            {label}
        </div>
        <div className="flex items-center justify-end gap-2 text-[13px] text-[var(--foreground-primary)] font-medium max-w-[66%] leading-relaxed text-right">
            {isEmpty ? (
                <span className="text-[var(--foreground-tertiary)] opacity-60 transition-colors">Not set</span>
            ) : (
                <div className="min-w-0 flex flex-wrap justify-end w-full">
                    {value}
                </div>
            )}
            <div className="text-[var(--foreground-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity -mr-1 flex-shrink-0">
                <CaretRight size={14} weight="bold" />
            </div>
        </div>
    </div>
);

// --- Content Formatters ---

const ChipsList = ({ items, max = 3 }: { items: string[], max?: number }) => {
    if (!items || items.length === 0) return null;
    const visibleInfo = items.slice(0, max);
    const remaining = items.length - max;

    return (
        <div className="flex flex-wrap gap-1.5 justify-end">
            {visibleInfo.map((item, i) => (
                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-[var(--background-secondary)] text-[var(--foreground-secondary)] text-[11px] font-medium border border-[var(--border-default)]/50 whitespace-nowrap">
                    {item}
                </span>
            ))}
            {remaining > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[var(--foreground-tertiary)] text-[11px] font-medium whitespace-nowrap opacity-70">
                    +{remaining}
                </span>
            )}
        </div>
    );
};

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

const NETWORKING_GOAL_LABEL: Record<string, string> = Object.fromEntries(
    NETWORKING_GOAL_OPTIONS.map(o => [o.value, o.label])
);
const EVENT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
    EVENT_TYPE_OPTIONS.map(o => [o.value, o.label])
);

// --- Types & Constants ---

export interface CareerProfileManagerProps {
    className?: string;
    onProfileUpdate?: (profile: CareerProfile) => void;
}

const QUICK_EDIT_STEP_MAP: Record<QuickEditSection, number> = {
    role: 1,
    skills: 2,
    goals: 3,
    learning: 4,
    networking: 5,
    team: 6
};

const buildOnboardingInitialData = (profile?: CareerProfile | null): Partial<CareerOnboardingData> | undefined => {
    if (!profile) return undefined;
    return {
        step1_role: {
            currentRole: profile.currentRole || '',
            seniority: profile.seniority || 'mid-level',
            industry: profile.industry || '',
            companySize: profile.companySize || 'medium'
        },
        step2_skills: {
            primarySkills: profile.primarySkills || [],
            skillsToLearn: profile.skillsToLearn || [],
            interests: profile.interests || [],
            skillTags: profile.skillTags || []
        },
        step3_goals: {
            careerGoals: profile.careerGoals || [],
            timeframe: profile.timeframe || 'immediate'
        },
        step4_preferences: {
            targetPath: profile.targetPath || '',
            learningStyle: profile.learningStyle || [],
            availableTime: profile.availableTime || 'moderate',
            budget: profile.budget || 'moderate'
        },
        step5_networking: {
            networkingGoals: profile.networkingGoals || [],
            preferredEventTypes: profile.preferredEventTypes || []
        }
    };
};

export default function CareerProfileManager({
    className = '',
    onProfileUpdate
}: CareerProfileManagerProps) {
    // ... (Hooks and state remain the same)
    const { user, refreshProfile: refreshAuthProfile } = useAuth();
    const isMobile = useIsMobile();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showError } = useSnackbar();
    const [isEditing, setIsEditing] = useState(false);
    const [quickEditSection, setQuickEditSection] = useState<QuickEditSection | null>(null);
    const [, setQuickEditModalState] = useState<{
        isDirty: boolean;
        isSaving: boolean;
        saveError?: string | null;
    }>({
        isDirty: false,
        isSaving: false,
        saveError: null
    });

    // ... (Keep existing refs/effects logic)
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
        markOptionalSectionComplete,
    } = useCareerProfile();

    const sectionKeyMap: Record<QuickEditSection, keyof CareerOptionalSectionStatus> = {
        learning: 'learningPreferences',
        networking: 'networkingPreferences',
        team: 'teamPreferences',
        role: null as never,
        skills: null as never,
        goals: null as never
    };

    // ... (Keep existing prompt logic/handlers)
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
        try {
            await completeOnboarding(data, options?.optionalSectionsCompleted);
            setIsEditing(false);
            if (onProfileUpdate && currentCareerProfile) {
                onProfileUpdate(currentCareerProfile);
            }
            await refreshAuthProfile();
            await queryClient.invalidateQueries({ queryKey: ['profile'] });
            await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            await queryClient.invalidateQueries({ queryKey: filteredEventKeys.all });
            window.dispatchEvent(new CustomEvent('profile-updated'));
        } catch (error) {
            console.error('Career profile update error:', error);
            showError('Failed to update career profile. Please try again.');
        }
    };

    const handleQuickEdit = (section: QuickEditSection) => {
        const optionalKey = sectionKeyMap[section];
        if (optionalKey) {
            loggedShownPrompts.current.delete(optionalKey);
        }
        setQuickEditSection(section);
    };

    const handleQuickEditClose = () => {
        setQuickEditSection(null);
    };

    const handleQuickEditSaved = useCallback(async (updatedProfile: CareerProfile) => {
        await refreshProfile();
        onProfileUpdate?.(updatedProfile);
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
        await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        await queryClient.invalidateQueries({ queryKey: filteredEventKeys.all });
        window.dispatchEvent(new CustomEvent('profile-updated'));
    }, [onProfileUpdate, queryClient, refreshProfile]);

    const handleOptionalSectionCompleted = (section: QuickEditSection) => {
        const optionalKey = sectionKeyMap[section];
        if (optionalKey && !completedSectionsRef.current.has(optionalKey)) {
            void markOptionalSectionComplete(optionalKey);
            loggedShownPrompts.current.delete(optionalKey);
            logPromptEvent('prompt_completed', optionalKey, { completedAt: new Date().toISOString() });
            completedSectionsRef.current.add(optionalKey);
        }
    };


    if (isLoading) return <div className="flex items-center justify-center min-h-[200px]"><BrandLoadingLogo className="h-6 w-6 text-zinc-500" inline size={24} /></div>;
    if (error) return <div className="flex items-center justify-center min-h-[200px] text-red-500">Error loading profile</div>;

    // ... (Keep onboarding/incomplete state logic currently same, focusing on the main view below)
    if (!hasCompletedOnboarding || !currentCareerProfile) {
        return (
            <div className={`career-profile-manager incomplete ${className}`}>
                <div className="flex flex-col items-start text-left py-8">
                    <div className="flex items-center justify-center h-12 w-12 rounded-[36%] bg-[#2E2F33] mb-3">
                        <IdentificationCard
                            size={28}
                            weight="fill"
                            color="#EDEDEF"
                        />
                    </div>
                    <h3 className="text-[14px] font-medium text-[#EDEDEF] mb-1.5">
                        Complete Your Career Profile
                    </h3>
                    <p className="text-[13px] leading-[1.4] text-[#8A8F98] max-w-[320px] mb-6">
                        Get personalized event recommendations by telling us about your career goals and interests.
                    </p>
                    <div className="flex flex-wrap items-center justify-start gap-4">
                        <Button
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            className="h-7 rounded-md bg-[#EDEDEF] px-3 text-[13px] font-medium text-[#191A1D] hover:bg-[#EDEDEF]/90"
                        >
                            Complete Profile
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => router.push('/dashboard')}
                            variant="ghost"
                            className="h-7 rounded-md bg-transparent px-3 text-[13px] font-medium text-[#8A8F98] hover:bg-transparent hover:text-[#EDEDEF]"
                        >
                            Skip for Now
                        </Button>
                    </div>
                </div>
                {/* Onboarding Modal (Desktop) / Fullscreen (Mobile) */}
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center bg-transparent sm:bg-black/50 sm:backdrop-blur-sm">
                        <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-transparent sm:bg-white dark:sm:bg-zinc-900 sm:rounded-xl overflow-hidden shadow-none sm:shadow-2xl">
                            {isMobile ? (
                                <MobileCareerOnboarding
                                    onComplete={handleComplete}
                                    onSkip={() => setIsEditing(false)}
                                    preserveDataOnSkip={true}
                                    initialData={undefined}
                                />
                            ) : (
                                <CareerOnboarding
                                    onComplete={handleComplete}
                                    onSkip={() => setIsEditing(false)}
                                    preserveDataOnSkip={true}
                                    initialData={undefined}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (isMobile && quickEditSection) {
        const initialStep = QUICK_EDIT_STEP_MAP[quickEditSection];
        return (
            <div className={`career-profile-manager mobile-edit ${className}`}>
                <MobileCareerOnboarding
                    onComplete={async (data, options) => {
                        await handleComplete(data, options);
                        handleQuickEditClose();
                    }}
                    onSkip={handleQuickEditClose}
                    preserveDataOnSkip={false}
                    initialData={buildOnboardingInitialData(currentCareerProfile)}
                    initialStep={initialStep}
                    initialIncludeOptionalSteps={initialStep > 3}
                />
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-2 animate-in fade-in duration-500 pb-20">
            {/* Note: Header removed to match "bare settings" style if this is inside a layout that provides it, 
                 but keeping basic structure. */}

            {/* Professional Profile */}
            <SettingSection
                title="Professional Profile"
                description="Your current role and workplace."
            >
                <SettingRow
                    label="Current Role"
                    value={currentCareerProfile.currentRole}
                    isEmpty={!currentCareerProfile.currentRole}
                    onClick={() => handleQuickEdit('role')}
                />
                <SettingRow
                    label="Seniority"
                    value={currentCareerProfile.seniority ? currentCareerProfile.seniority.replace('-', ' ') : undefined}
                    isEmpty={!currentCareerProfile.seniority}
                    onClick={() => handleQuickEdit('role')}
                />
                <SettingRow
                    label="Industry"
                    value={currentCareerProfile.industry}
                    isEmpty={!currentCareerProfile.industry}
                    onClick={() => handleQuickEdit('role')}
                />
                <SettingRow
                    label="Company Size"
                    value={formatCompanySize(currentCareerProfile.companySize || '')}
                    isEmpty={!currentCareerProfile.companySize}
                    onClick={() => handleQuickEdit('role')}
                />
            </SettingSection>

            {/* Skills & Interests */}
            <SettingSection
                title="Skills & Interests"
                description="What you know and what you want to learn."
            >
                <SettingRow
                    label="Primary Skills"
                    value={<ChipsList items={currentCareerProfile.primarySkills || []} />}
                    isEmpty={!currentCareerProfile.primarySkills?.length}
                    onClick={() => handleQuickEdit('skills')}
                />
                <SettingRow
                    label="Skills to Learn"
                    value={<ChipsList items={currentCareerProfile.skillsToLearn || []} />}
                    isEmpty={!currentCareerProfile.skillsToLearn?.length}
                    onClick={() => handleQuickEdit('skills')}
                />
                <SettingRow
                    label="Interests"
                    value={<ChipsList items={currentCareerProfile.interests || []} />}
                    isEmpty={!currentCareerProfile.interests?.length}
                    onClick={() => handleQuickEdit('skills')}
                />
            </SettingSection>

            {/* Goals */}
            <SettingSection
                title="Career Goals"
                description="Your professional objectives and timeline."
            >
                <SettingRow
                    label="Timeframe"
                    value={<span className="capitalize">{currentCareerProfile.timeframe?.replace('-', ' ')}</span>}
                    isEmpty={!currentCareerProfile.timeframe}
                    onClick={() => handleQuickEdit('goals')}
                />
                <SettingRow
                    label="Goals"
                    value={currentCareerProfile.careerGoals?.map(g => g.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')}
                    isEmpty={!currentCareerProfile.careerGoals?.length}
                    onClick={() => handleQuickEdit('goals')}
                />
            </SettingSection>

            {/* Preferences */}
            <SettingSection
                title="Learning & Networking"
                description="Your preferred learning styles and event formats."
            >
                <SettingRow
                    label="Learning Style"
                    value={<ChipsList items={currentCareerProfile.learningStyle?.map(s => formatLearningStyle(s)) || []} />}
                    isEmpty={!currentCareerProfile.learningStyle?.length}
                    onClick={() => handleQuickEdit('learning')}
                />
                <SettingRow
                    label="Networking Goals"
                    value={<ChipsList items={currentCareerProfile.networkingGoals?.map(g => NETWORKING_GOAL_LABEL[g] ?? g.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) || []} />}
                    isEmpty={!currentCareerProfile.networkingGoals?.length}
                    onClick={() => handleQuickEdit('networking')}
                />
                <SettingRow
                    label="Event Formats"
                    value={<ChipsList items={currentCareerProfile.preferredEventTypes?.map(t => EVENT_TYPE_LABEL[t] ?? t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) || []} />}
                    isEmpty={!currentCareerProfile.preferredEventTypes?.length}
                    onClick={() => handleQuickEdit('networking')}
                />
            </SettingSection>

            {/* Quick Edit Modal */}
            {!isMobile && (
                <QuickEditModal
                    isOpen={!!quickEditSection}
                    onClose={handleQuickEditClose}
                    section={quickEditSection || 'role'}
                    currentProfile={currentCareerProfile}
                    onSaveProfile={_saveCareerProfile}
                    onSectionCompleted={handleOptionalSectionCompleted}
                    onProfileSaved={handleQuickEditSaved}
                    onStateChange={setQuickEditModalState}
                />
            )}
        </div>
    );
}
