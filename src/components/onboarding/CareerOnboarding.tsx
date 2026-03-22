'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { CaretLeft, CaretRight, CaretDown, CheckCircle } from '@phosphor-icons/react';
import { AnimatePresence as StepAnimatePresence, motion as stepMotion, useReducedMotion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
    CareerOnboardingData,
    CAREER_EVENT_TYPE_OPTIONS,
    SeniorityLevel,
    CareerGoal,
    CareerTimeframe,
    LearningStyle,
    NetworkingGoal,
    CareerOptionalSectionStatus
} from '@/types/career';
import { usePostHog } from 'posthog-js/react';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import { RoleAutocomplete } from './RoleAutocomplete';
import { ExperienceLevelSelector } from './ExperienceLevelSelector';
import { useOnboardingTaxonomy } from '@/hooks/useOnboardingTaxonomy';
import {
    deriveOptionalSectionStatus,
    clampCareerOnboardingStep,
    hasCoreOnboardingProgress,
    mergeSkillStepData,
    MAX_CAREER_GOALS,
    normalizeCareerGoals,
    normalizeOnboardingDraftData,
    sanitizeOnboardingData,
    validateOnboardingData,
    VISIBLE_ONBOARDING_STEP_COUNT
} from '@/utils/onboardingUtils';
import { WelcomeStep } from './WelcomeStep';
import { StepIndicator } from './StepIndicator';
import { motion, AnimatePresence } from './shared/StaticMotion';


function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const GOAL_OPTIONS: Array<{ value: CareerGoal; label: string; description: string }> = [
    { value: 'skill-development', label: 'Learn New Skills', description: 'Build technical depth.' },
    { value: 'role-transition', label: 'Change Roles', description: 'Move into a new role.' },
    { value: 'leadership-growth', label: 'Develop Leadership', description: 'Grow management skills.' },
    { value: 'networking', label: 'Build Network', description: 'Meet peers and mentors.' },
];

const TIMEFRAME_OPTIONS: Array<{ value: CareerTimeframe; label: string; description: string }> = [
    { value: 'immediate', label: 'Immediate', description: '0-6 months' },
    { value: 'short-term', label: 'Short-term', description: '6-18 months' },
    { value: 'medium-term', label: 'Medium-term', description: '1-3 years' },
    { value: 'long-term', label: 'Long-term', description: '3+ years' },
];

const LEARNING_STYLE_OPTIONS: Array<{ value: LearningStyle; label: string; description: string }> = [
    { value: 'hands-on', label: 'Hands-on Workshops', description: 'Build things in real-time.' },
    { value: 'theoretical', label: 'Lectures & Presentations', description: 'Deep dive into concepts.' },
    { value: 'interactive', label: 'Discussions & Q&A', description: 'Share and debate ideas.' },
    { value: 'networking', label: 'Networking Focus', description: 'Meet new people while learning.' },
];

const NETWORKING_GOAL_OPTIONS: Array<{ value: NetworkingGoal; label: string; description: string }> = [
    { value: 'find-mentors', label: 'Find Mentors', description: 'Connect with experienced leaders.' },
    { value: 'find-peers', label: 'Meet Peers', description: 'Build relationships at your level.' },
    { value: 'find-collaborators', label: 'Find Collaborators', description: 'Find people to build with.' },
];

function getInitialStep(): number {
    if (typeof window === 'undefined') {
        return 0;
    }

    const saved = localStorage.getItem('career-onboarding-step');
    return clampCareerOnboardingStep(saved ? parseInt(saved, 10) : 0);
}

function getInitialDraft(initialData?: Partial<CareerOnboardingData>): Partial<CareerOnboardingData> {
    if (initialData && Object.keys(initialData).length > 0) {
        return normalizeOnboardingDraftData(initialData);
    }

    if (typeof window === 'undefined') {
        return {};
    }

    const saved = localStorage.getItem('career-onboarding-data');
    if (!saved) {
        return {};
    }

    return normalizeOnboardingDraftData(JSON.parse(saved));
}

// --- Animation Configs ---
const springTransition = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const staggerItem = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: springTransition }
};

// --- Premium SelectableCard ---
const SelectableCard = ({
    selected,
    onClick,
    label,
    children,
    shortcut,
    disabled = false,
    type = 'checkbox',
    compact = false
}: {
    selected: boolean;
    onClick: () => void;
    label?: string;
    children?: React.ReactNode;
    shortcut?: string;
    disabled?: boolean;
    type?: 'checkbox' | 'radio';
    compact?: boolean;
}) => (
    <motion.button
        type="button"
        layout
        disabled={disabled}
        onClick={onClick}
        whileHover={disabled ? undefined : { scale: 1.005 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        aria-pressed={type === 'checkbox' ? selected : undefined}
        aria-checked={type === 'radio' ? selected : undefined}
        role={type === 'radio' ? 'radio' : undefined}
        className={cn(
            'group relative w-full select-none rounded-md border text-left transition-colors',
            compact ? 'p-3' : 'p-3.5',
            selected
                ? 'border-white/[0.14] bg-white/[0.025]'
                : 'border-white/[0.07] bg-transparent',
            disabled
                ? 'cursor-not-allowed opacity-45'
                : 'cursor-pointer hover:border-white/[0.11] hover:bg-white/[0.02]'
        )}
    >
        <div className="flex items-start justify-between gap-3">
            <div className={cn('flex items-start', compact ? 'gap-2.5' : 'gap-3')}>
                {/* Custom Checkbox */}
                <div className={cn(
                    'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-200',
                    selected
                        ? 'border-emerald-500/60 bg-emerald-500/14 text-emerald-400'
                        : 'border-white/[0.12] bg-transparent text-transparent',
                    !disabled && !selected && 'group-hover:border-white/[0.15]'
                )}>
                    <motion.div
                        initial={false}
                        animate={{ scale: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
                        transition={springTransition}
                    >
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </motion.div>
                </div>
                <div>
                    {label && <div className={cn(compact ? 'text-[13px]' : 'text-sm', 'font-medium tracking-[-0.01em] transition-colors', selected ? 'text-foreground' : 'text-foreground/90')}>{label}</div>}
                    {children && <div className={cn(compact ? 'mt-0.5 text-[12px] leading-[1.1rem]' : 'mt-1 text-[13px] leading-5', 'text-muted-foreground/82')}>{children}</div>}
                </div>
            </div>

            {shortcut && (
                <span className="px-1 py-0.5 font-mono text-[10px] uppercase text-muted-foreground/52 opacity-0 transition-opacity group-hover:opacity-100">
                    {shortcut}
                </span>
            )}
        </div>
    </motion.button>
);

const PreferenceChip = ({
    selected,
    label,
    onClick
}: {
    selected: boolean;
    label: string;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
            selected
                ? 'border-emerald-500/30 bg-emerald-500/12 text-foreground'
                : 'border-white/[0.08] bg-transparent text-foreground/74 hover:border-white/[0.14] hover:text-foreground'
        )}
    >
        <span
            className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors',
                selected ? 'bg-emerald-400' : 'bg-white/[0.22]'
            )}
        />
        <span>{label}</span>
    </button>
);


const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <motion.div variants={staggerItem} className="mb-6 space-y-1.5">
        <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[2.125rem]">{title}</h2>
        {subtitle && <p className="max-w-[34rem] text-[15px] leading-6 text-muted-foreground/82">{subtitle}</p>}
    </motion.div>
);

// --- Main Component ---

interface CareerOnboardingProps {
    onComplete: (data: CareerOnboardingData, options?: { optionalSectionsCompleted: CareerOptionalSectionStatus }) => void;
    onSkip?: () => void;
    className?: string;
    initialData?: Partial<CareerOnboardingData>; // Initial data to populate form (for edit mode)
    preserveDataOnSkip?: boolean; // If true, don't clear data when skipping (for edit mode)
}

const CareerOnboarding: React.FC<CareerOnboardingProps> = ({
    onComplete,
    onSkip,
    className = '',
    initialData,
    preserveDataOnSkip = false
}) => {
    // Load persisted state or use initial data
    const [currentStep, setCurrentStep] = useState(() => getInitialStep());

    const [data, setData] = useState<Partial<CareerOnboardingData>>(() => getInitialDraft(initialData));

    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [showOptionalPreferences, setShowOptionalPreferences] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        const savedStep = localStorage.getItem('career-onboarding-step');
        return savedStep ? parseInt(savedStep, 10) > VISIBLE_ONBOARDING_STEP_COUNT : false;
    });
    const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
    const [fieldSuccessStates, setFieldSuccessStates] = useState<Record<string, boolean>>({});

    const totalSteps = VISIBLE_ONBOARDING_STEP_COUNT;
    const isWelcomeStep = currentStep === 0;
    const prefersReducedMotion = useReducedMotion();
    const posthog = usePostHog();

    const { showConfirmation } = useSnackbar();

    // Calculate progress for the metallic bar if we want to keep it?
    // User liked it. Let's put the Metallic Bar BACK at the top, maybe under the StepIndicator or AS it.
    // Actually, StepIndicator replaces the stepper visuals. Let's keep the metallic bar broadly for "overall completion"?
    // OR we put the metallic bar IN the StepIndicator.
    // For now, let's leave StepIndicator as the primary navigation.

    // Persist state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('career-onboarding-step', currentStep.toString());
            localStorage.setItem('career-onboarding-data', JSON.stringify(data));
        };
    }, [currentStep, data]);

    const clearPersistedState = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('career-onboarding-step');
            localStorage.removeItem('career-onboarding-data');
        }
    }, []);

    const handleSkip = () => {
        // If preserveDataOnSkip is true (edit mode), just skip without clearing
        if (preserveDataOnSkip) {
            onSkip?.();
            return;
        }

        posthog?.capture('onboarding_skipped', {
            skipped_at_step: currentStep,
            step_name: ['welcome', 'role', 'skills', 'goals'][currentStep] ?? `step_${currentStep}`,
            had_progress: hasCoreOnboardingProgress(data),
        });

        // Otherwise, check for progress and show confirmation
        const hasProgress = hasCoreOnboardingProgress(data);

        if (hasProgress) {
            showConfirmation(
                'Skip Onboarding?',
                'Your progress will be lost. You can complete your profile later in settings.',
                () => {
                    clearPersistedState();
                    onSkip?.();
                },
                { confirmText: 'Skip anyway', cancelText: 'Keep editing' }
            );
        } else {
            clearPersistedState();
            onSkip?.();
        }
    };

    const {
        skillOptions: technicalSkillOptions,
        interestOptions,
        getCurrentSkillSuggestions,
        getLearningSkillSuggestions
    } = useOnboardingTaxonomy();

    const handleNext = useCallback(() => {
        if (currentStep === 1) {
            const errors: Record<string, string> = {};
            if (!data.step1_role?.currentRole) errors.currentRole = 'Please select your current role';
            if (!data.step1_role?.seniority) errors.seniority = 'Please select your experience level';

            if (Object.keys(errors).length > 0) {
                setStep1Errors(errors);
                return;
            }
        }

        if (currentStep < totalSteps) {
            const nextStep = currentStep + 1;
            posthog?.capture('onboarding_step_completed', {
                step: currentStep,
                step_name: ['welcome', 'role', 'skills', 'goals'][currentStep] ?? `step_${currentStep}`,
                next_step: nextStep,
            });
            setCurrentStep(nextStep);
            setValidationErrors([]);
            setStep1Errors({});
        } else {
            const validation = validateOnboardingData(data);
            if (validation.isValid) {
                const sanitizedData = sanitizeOnboardingData(data);
                const optionalSectionsCompleted = deriveOptionalSectionStatus(data);
                posthog?.capture('onboarding_completed', {
                    steps_completed: totalSteps,
                    has_optional_preferences: showOptionalPreferences,
                });
                clearPersistedState();
                onComplete(sanitizedData, { optionalSectionsCompleted });
            } else {
                setValidationErrors(validation.errors);
            }
        }
    }, [clearPersistedState, currentStep, data, onComplete, totalSteps, posthog, showOptionalPreferences]);

    const handlePrevious = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    const updateData = (step: keyof CareerOnboardingData, stepData: unknown) => {
        setData(prev => {
            if (step === 'step2_skills' && stepData && typeof stepData === 'object') {
                const incoming = stepData as Partial<CareerOnboardingData['step2_skills']>;
                return {
                    ...prev,
                    step2_skills: mergeSkillStepData(prev.step2_skills, incoming)
                };
            }
            if (step === 'step3_goals' && stepData && typeof stepData === 'object') {
                const incoming = stepData as Partial<CareerOnboardingData['step3_goals']>;
                const nextStep3Goals = {
                    ...prev.step3_goals,
                    ...incoming,
                    careerGoals: normalizeCareerGoals(incoming.careerGoals ?? prev.step3_goals?.careerGoals ?? [])
                } as CareerOnboardingData['step3_goals'];

                return {
                    ...prev,
                    step3_goals: nextStep3Goals
                } as Partial<CareerOnboardingData>;
            }
            return { ...prev, [step]: stepData };
        });
    };

    const isStepComplete = useCallback((step: number): boolean => {
        switch (step) {
            case 1: return !!(data.step1_role?.currentRole && data.step1_role?.seniority);
            case 2: return (data.step2_skills?.primarySkills?.length || 0) >= 2;
            case 3: {
                const goalCount = data.step3_goals?.careerGoals?.length || 0;
                return goalCount > 0 && goalCount <= MAX_CAREER_GOALS && Boolean(data.step3_goals?.timeframe);
            }
            default: return false;
        }
    }, [data]);

    // Keyboard support for main actions
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'Enter' && e.metaKey) {
                if (currentStep === 0) {
                    handleNext();
                } else if (isStepComplete(currentStep)) {
                    handleNext();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep, handleNext, isStepComplete]); // Dependencies for keyboard listener

    const renderStep1 = () => {
        const hasRole = !!data.step1_role?.currentRole;
        const hasSeniority = !!data.step1_role?.seniority;
        
        return (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
                <SectionHeader title="Tell us about your role" subtitle="This helps us find your peer group and relevant events." />

                <motion.div variants={staggerItem} className="space-y-6 relative">
                    {/* Success feedback wrapper for role field */}
                    <motion.div
                        className="relative"
                        animate={{
                            scale: fieldSuccessStates.currentRole ? [1, 1.02, 1] : 1,
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        <RoleAutocomplete
                            id="current-role"
                            label="Current Role"
                            hint="Choose the role that best matches your work"
                            value={data.step1_role?.currentRole || ''}
                            onChange={(value) => {
                                updateData('step1_role', { ...data.step1_role, currentRole: value });
                                if (value) {
                                    setStep1Errors(prev => { const { currentRole: _currentRole, ...rest } = prev; return rest; });
                                    // Show success feedback
                                    setFieldSuccessStates(prev => ({ ...prev, currentRole: true }));
                                    setTimeout(() => {
                                        setFieldSuccessStates(prev => ({ ...prev, currentRole: false }));
                                    }, 2000);
                                }
                            }}
                            error={step1Errors.currentRole}
                            required
                            showSuccess={fieldSuccessStates.currentRole}
                        />
                        
                        {/* Success checkmark indicator */}
                        <AnimatePresence>
                            {fieldSuccessStates.currentRole && hasRole && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0, x: -20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                    className="absolute right-3 top-[calc(100%-2.5rem)] flex items-center gap-2"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ 
                                            delay: 0.1, 
                                            type: "spring", 
                                            stiffness: 400,
                                            damping: 12
                                        }}
                                        className="bg-emerald-500/20 rounded-full p-1"
                                    >
                                        <CheckCircle size={16} className="text-emerald-400" weight="fill" />
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Ghost connector line - shows when role is selected but seniority is not */}
                    <AnimatePresence>
                        {hasRole && !hasSeniority && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.4 }}
                                className="relative flex items-center justify-center py-4"
                            >
                                <div 
                                    className="absolute left-6 w-px h-16 border-l border-dashed"
                                    style={{ 
                                        borderColor: 'var(--border-default)',
                                        opacity: 0.2
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Ghost placeholder for Experience Level */}
                    <AnimatePresence>
                        {hasRole && !hasSeniority && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 0.2, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-3 pointer-events-none"
                            >
                                <label className="text-sm font-medium flex items-center" style={{ color: 'var(--foreground-secondary)' }}>
                                    Experience Level <span className="text-red-500 ml-1">*</span>
                                </label>
                                <div 
                                    className="rounded-xl border border-dashed p-4"
                                    style={{ 
                                        backgroundColor: 'var(--background-secondary)',
                                        borderColor: 'var(--border-default)',
                                        opacity: 0.2
                                    }}
                                >
                                    <div className="h-12 bg-secondary/30 rounded-lg" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Actual Experience Level Selector */}
                    <AnimatePresence mode="wait">
                        {hasRole && (
                            <motion.div
                                key="experience-selector"
                                initial={{ opacity: 0, height: 0, y: 20 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -20 }}
                                transition={{ 
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30,
                                    opacity: { duration: 0.2 }
                                }}
                                className="overflow-hidden"
                            >
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <ExperienceLevelSelector
                                        value={data.step1_role?.seniority || ''}
                                        onChange={(value) => {
                                            updateData('step1_role', { ...data.step1_role, seniority: value as SeniorityLevel });
                                            if (value) {
                                                setStep1Errors(prev => { const { seniority: _seniority, ...rest } = prev; return rest; });
                                                // Show success feedback
                                                setFieldSuccessStates(prev => ({ ...prev, seniority: true }));
                                                setTimeout(() => {
                                                    setFieldSuccessStates(prev => ({ ...prev, seniority: false }));
                                                }, 2000);
                                            }
                                        }}
                                        error={step1Errors.seniority}
                                        className="overflow-visible"
                                    />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        );
    };

    const renderStep2 = () => (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={staggerItem} className="space-y-3">
                <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
                    <span>Step 2 of {totalSteps}</span>
                    <span className="h-px w-10 bg-white/[0.12]" />
                </div>
                <SectionHeader
                    title="What are your skills?"
                    subtitle="Start with what you use today, then add what you want to learn next."
                />
            </motion.div>

            <motion.div variants={staggerItem} className="space-y-4">
                <MultiSelectDropdown
                    options={technicalSkillOptions}
                    selectedValues={data.step2_skills?.primarySkills || []}
                    onChange={(values) => updateData('step2_skills', { primarySkills: values })}
                    label="Current Skills"
                    description="The skills, disciplines, or tools you already use with confidence."
                    statusText={
                        (data.step2_skills?.primarySkills?.length ?? 0) < 2
                            ? (data.step2_skills?.primarySkills?.length ?? 0) === 1
                                ? 'Pick 1 more skill to continue.'
                                : 'Pick at least 2 skills to continue.'
                            : `You can add ${10 - (data.step2_skills?.primarySkills?.length ?? 0)} more.`
                    }
                    placeholder="Search current skills..."
                    suggestions={getCurrentSkillSuggestions(data.step1_role?.currentRole)}
                    suggestionLabel="Popular for your role"
                    maxSelections={10}
                    variant="inline-search"
                    emphasis="primary"
                />

                <MultiSelectDropdown
                    options={technicalSkillOptions}
                    selectedValues={data.step2_skills?.skillsToLearn || []}
                    onChange={(values) => updateData('step2_skills', { skillsToLearn: values })}
                    label="Learning Next"
                    description="The skills, disciplines, or tools you want to build next."
                    statusText={`You can add ${10 - (data.step2_skills?.skillsToLearn?.length ?? 0)} more.`}
                    placeholder="Search future skills..."
                    suggestions={getLearningSkillSuggestions(data.step2_skills?.primarySkills || [], data.step1_role?.currentRole)}
                    suggestionLabel="Suggested next"
                    maxSelections={10}
                    relatedValues={data.step2_skills?.primarySkills || []}
                    relatedLabel="Current Skills"
                    variant="inline-search"
                    emphasis="subtle"
                />

                <MultiSelectDropdown
                    options={interestOptions}
                    selectedValues={data.step2_skills?.interests || []}
                    onChange={(values) => updateData('step2_skills', { interests: values })}
                    label="Interests"
                    description="Shapes mentors, events, and recommendations."
                    statusText={`You can add ${5 - (data.step2_skills?.interests?.length ?? 0)} more.`}
                    placeholder="Search or add an interest..."
                    maxSelections={5}
                    allowCustom
                    variant="inline-search"
                    emphasis="subtle"
                />
            </motion.div>
        </motion.div>
    );

    const renderStep3 = () => {
        const selectedGoals = data.step3_goals?.careerGoals || [];
        const goalLimitReached = selectedGoals.length >= MAX_CAREER_GOALS;

        return (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
                <motion.div variants={staggerItem} className="space-y-3">
                    <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/72">
                        <span>Step 3 of {totalSteps}</span>
                        <span className="h-px w-10 bg-white/[0.12]" />
                    </div>
                    <SectionHeader
                        title="What are your goals?"
                        subtitle="Finish with your main priorities, timeline, and any optional preferences you want us to tailor around."
                    />
                </motion.div>

                <motion.div variants={staggerItem} className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground/68">Career goal</p>
                            <span className="text-[11px] text-muted-foreground/62">
                                {selectedGoals.length}/{MAX_CAREER_GOALS}
                            </span>
                        </div>
                        <h3 className="text-sm font-medium text-foreground/92">Choose up to 2 priorities.</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {GOAL_OPTIONS.map((goal, index) => {
                            const selected = selectedGoals.includes(goal.value);

                            return (
                                <SelectableCard
                                    key={goal.value}
                                    selected={selected}
                                    disabled={goalLimitReached && !selected}
                                    onClick={() => {
                                        const next = selected
                                            ? selectedGoals.filter((currentGoal) => currentGoal !== goal.value)
                                            : [...selectedGoals, goal.value];
                                        updateData('step3_goals', { ...data.step3_goals, careerGoals: next });
                                    }}
                                    compact
                                    label={goal.label}
                                    shortcut={`${index + 1}`}
                                >
                                    {goal.description}
                                </SelectableCard>
                            );
                        })}
                    </div>
                </motion.div>

                <motion.div variants={staggerItem} className="space-y-3">
                    <div className="space-y-1">
                        <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground/68">Timeline</p>
                        <h3 className="text-sm font-medium text-foreground/92">Choose when you want this shift to happen.</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Timeline">
                        {TIMEFRAME_OPTIONS.map((timeframe) => (
                            <SelectableCard
                                key={timeframe.value}
                                selected={data.step3_goals?.timeframe === timeframe.value}
                                onClick={() => updateData('step3_goals', { ...data.step3_goals, timeframe: timeframe.value })}
                                compact
                                label={timeframe.label}
                                type="radio"
                            >
                                {timeframe.description}
                            </SelectableCard>
                        ))}
                    </div>
                </motion.div>

                <motion.div variants={staggerItem} className="space-y-4 border-t border-white/[0.06] pt-4">
                    <button
                        type="button"
                        onClick={() => {
                            setShowOptionalPreferences(prev => !prev);
                            setValidationErrors([]);
                        }}
                        aria-expanded={showOptionalPreferences}
                        className="flex w-full items-start justify-between gap-4 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                    >
                        <div className="space-y-1">
                            <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground/68">Preferences (optional)</p>
                            <h3 className="text-sm font-medium text-foreground/92">Add preferences</h3>
                        </div>

                        <div className="mt-1 flex shrink-0 items-center gap-2 text-xs text-muted-foreground/72">
                            <span>{showOptionalPreferences ? 'Collapse' : 'Expand'}</span>
                            <CaretDown
                                size={14}
                                className={cn('transition-transform duration-200', showOptionalPreferences && 'rotate-180')}
                            />
                        </div>
                    </button>

                    <AnimatePresence>
                        {showOptionalPreferences && (
                            <motion.div
                                key="optional-preferences"
                                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
                                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                className="space-y-5"
                            >
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-foreground/92">Learning style</h4>
                                        <p className="text-[13px] leading-5 text-muted-foreground/74">Choose the formats that help you learn best.</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {LEARNING_STYLE_OPTIONS.map((style) => (
                                            <SelectableCard
                                                key={style.value}
                                                selected={data.step4_preferences?.learningStyle?.includes(style.value) || false}
                                                onClick={() => {
                                                    const current = data.step4_preferences?.learningStyle || [];
                                                    const next = current.includes(style.value)
                                                        ? current.filter((currentStyle) => currentStyle !== style.value)
                                                        : [...current, style.value];
                                                    updateData('step4_preferences', { ...data.step4_preferences, learningStyle: next });
                                                }}
                                                label={style.label}
                                                compact
                                            >
                                                {style.description}
                                            </SelectableCard>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-foreground/92">Who do you want to meet?</h4>
                                        <p className="text-[13px] leading-5 text-muted-foreground/74">Pick the people you want more introductions to.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {NETWORKING_GOAL_OPTIONS.map((goal) => (
                                            <PreferenceChip
                                                key={goal.value}
                                                selected={data.step5_networking?.networkingGoals?.includes(goal.value) || false}
                                                onClick={() => {
                                                    const current = data.step5_networking?.networkingGoals || [];
                                                    const next = current.includes(goal.value)
                                                        ? current.filter((currentGoal) => currentGoal !== goal.value)
                                                        : [...current, goal.value];
                                                    updateData('step5_networking', { ...data.step5_networking, networkingGoals: next });
                                                }}
                                                label={goal.label}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <MultiSelectDropdown
                                        options={CAREER_EVENT_TYPE_OPTIONS}
                                        selectedValues={data.step5_networking?.preferredEventTypes || []}
                                        onChange={(values) => updateData('step5_networking', {
                                            ...data.step5_networking,
                                            preferredEventTypes: values
                                        })}
                                        label="Event formats"
                                        description="Pick the formats you'd actually attend."
                                        placeholder="Choose formats..."
                                        maxSelections={5}
                                        variant="native"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        );
    };


    const renderContent = () => {
        switch (currentStep) {
            case 0: return <WelcomeStep onStart={handleNext} onSkip={handleSkip} />;
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            default: return null;
        }
    };

    return (
        <div className={cn("mx-auto w-full max-w-[36rem]", className)}>
            <div className="mb-6">
                {currentStep > 0 && (
                    <div className="mb-3 flex items-center justify-between">
                        <StepIndicator currentStep={currentStep} />
                    </div>
                )}
                {/* 
                     We removed the old ProgressBar because we use StepIndicator.
                */}
            </div>

            <StepAnimatePresence mode="wait">
                <stepMotion.div
                    key={currentStep}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
                    transition={prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="min-h-[360px]"
                >
                    <div>
                        {renderContent()}
                    </div>
                </stepMotion.div>
            </StepAnimatePresence>

            {!isWelcomeStep && (
                <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-4">
                    <button
                        disabled={currentStep <= 1}
                        className={cn(
                            "group flex items-center text-sm font-medium transition-colors",
                            currentStep === 1
                                ? "text-muted-foreground/30 cursor-not-allowed"
                                : "text-muted-foreground/88 hover:text-foreground"
                        )}
                        onClick={handlePrevious}
                    >
                        <CaretLeft size={16} className="mr-1" />
                        Back
                    </button>

                    <div className="flex items-center gap-3">
                        {/* Keyboard hint - now inline with actions */}
                        <span className="hidden items-center gap-1.5 text-[10px] text-muted-foreground/68 sm:flex">
                            <kbd className="rounded border border-white/[0.14] bg-white/[0.045] px-1.5 py-0.5 font-mono">⌘</kbd>
                            <kbd className="rounded border border-white/[0.14] bg-white/[0.045] px-1.5 py-0.5 font-mono">↵</kbd>
                        </span>

                        {onSkip && (
                            <button
                                onClick={handleSkip}
                                className="text-sm text-muted-foreground/88 transition-colors hover:text-foreground"
                            >
                                Skip
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            disabled={!isStepComplete(currentStep)}
                            className={cn(
                                "group relative flex items-center overflow-hidden rounded-md px-4 py-2.5 text-sm font-medium tracking-[-0.01em] transition-colors",
                                isStepComplete(currentStep)
                                    ? "bg-primary text-primary-foreground hover:bg-primary/92"
                                    : "cursor-not-allowed border border-white/[0.12] bg-white/[0.05] text-muted-foreground/68"
                            )}
                        >
                            <span className="relative z-10 flex items-center">
                                {currentStep === totalSteps ? 'Complete' : 'Continue'}
                                <CaretRight size={16} className="ml-2" />
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {validationErrors.length > 0 && (
                <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                    {validationErrors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
            )}
        </div>
    );
};

export default CareerOnboarding;
