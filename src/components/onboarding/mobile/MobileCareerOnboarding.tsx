'use client';

import React, { useState, useEffect } from 'react';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { CaretLeft, Check, CaretDown, MagnifyingGlass, X } from '@phosphor-icons/react';
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
    CareerOptionalSectionStatus,
    ROLE_TAXONOMY
} from '@/types/career';
import MultiSelectDropdown from '@/components/ui/MobileMultiSelectDropdown';
import { useOnboardingTaxonomy } from '@/hooks/useOnboardingTaxonomy';

import { MobileExperienceLevelSelector } from './MobileExperienceLevelSelector';
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
import { WelcomeStep } from '../WelcomeStep';
import { motion, AnimatePresence } from '../shared/StaticMotion';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

import styles from './MobileCareerOnboarding.module.css';

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

function getInitialStep(initialStep?: number): number {
    if (typeof initialStep === 'number') {
        return clampCareerOnboardingStep(initialStep);
    }

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

// --- Mobile Optimized Components ---

const MobileSelectableCard = ({
    selected,
    onClick,
    label,
    children,
    type = 'checkbox',
    disabled = false,
    compact = false
}: {
    selected: boolean;
    onClick: () => void;
    label?: string;
    children?: React.ReactNode;
    type?: 'checkbox' | 'radio';
    disabled?: boolean;
    compact?: boolean;
}) => (
    <motion.button
        type="button"
        layout
        disabled={disabled}
        onClick={onClick}
        whileTap={disabled ? undefined : { scale: 0.99 }}
        className={cn(styles.selectableCard, compact && styles.selectableCardCompact)}
        data-selected={selected}
        data-disabled={disabled}
        data-compact={compact}
        aria-pressed={type === 'checkbox' ? selected : undefined}
        aria-checked={type === 'radio' ? selected : undefined}
        role={type === 'radio' ? 'radio' : undefined}
    >
        <div
            className={cn(
                styles.cardIcon,
                styles.cardIconCheckbox
            )}
            data-selected={selected}
        >
            {selected && <Check weight="bold" size={12} />}
        </div>
        <div className={styles.cardContent}>
            {label && <div className={styles.cardLabel}>{label}</div>}
            {children && <div className={styles.cardDescription}>{children}</div>}
        </div>
    </motion.button>
);

const MobilePreferenceChip = ({
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
                ? 'border-emerald-500/35 bg-emerald-500/12 text-white'
                : 'border-white/[0.12] bg-transparent text-white/78'
        )}
    >
        <span
            className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors',
                selected ? 'bg-emerald-400' : 'bg-white/[0.24]'
            )}
        />
        <span>{label}</span>
    </button>
);

interface MobileCareerOnboardingProps {
    onComplete: (data: CareerOnboardingData, options?: { optionalSectionsCompleted: CareerOptionalSectionStatus }) => void;
    onSkip?: () => void;
    className?: string;
    initialData?: Partial<CareerOnboardingData>;
    preserveDataOnSkip?: boolean;
    initialStep?: number;
    initialIncludeOptionalSteps?: boolean;
}

export const MobileCareerOnboarding: React.FC<MobileCareerOnboardingProps> = ({
    onComplete,
    onSkip,
    className = '',
    initialData,
    preserveDataOnSkip = false,
    initialStep,
    initialIncludeOptionalSteps
}) => {
    // --- State Management (Matches Desktop) ---
    const [currentStep, setCurrentStep] = useState(() => getInitialStep(initialStep));

    const [data, setData] = useState<Partial<CareerOnboardingData>>(() => getInitialDraft(initialData));

    const [showOptionalPreferences, setShowOptionalPreferences] = useState(() => {
        if (typeof window === 'undefined') {
            return Boolean(initialIncludeOptionalSteps) || (typeof initialStep === 'number' && initialStep > VISIBLE_ONBOARDING_STEP_COUNT);
        }

        const savedStep = localStorage.getItem('career-onboarding-step');
        return Boolean(initialIncludeOptionalSteps) ||
            (typeof initialStep === 'number' && initialStep > VISIBLE_ONBOARDING_STEP_COUNT) ||
            (savedStep ? parseInt(savedStep, 10) > VISIBLE_ONBOARDING_STEP_COUNT : false);
    });
    const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const totalSteps = VISIBLE_ONBOARDING_STEP_COUNT;
    const isWelcomeStep = currentStep === 0;
    const { showConfirmation } = useSnackbar();
    const prefersReducedMotion = useReducedMotion();

    // Persist state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('career-onboarding-step', currentStep.toString());
            localStorage.setItem('career-onboarding-data', JSON.stringify(data));
        }
    }, [currentStep, data]);

    const clearPersistedState = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('career-onboarding-step');
            localStorage.removeItem('career-onboarding-data');
        }
    };

    const handleSkip = () => {
        if (preserveDataOnSkip) {
            onSkip?.();
            return;
        }

        if (hasCoreOnboardingProgress(data)) {
            showConfirmation(
                'Skip Onboarding?',
                'Your progress will be lost. You can complete your profile later in settings.',
                () => {
                    clearPersistedState();
                    onSkip?.();
                },
                { confirmText: 'Skip anyway', cancelText: 'Keep editing' }
            );
            return;
        }

        clearPersistedState();
        onSkip?.();
    };

    const handleNext = () => {
        if (currentStep === 1) {
            const errors: Record<string, string> = {};
            if (!data.step1_role?.currentRole) errors.currentRole = 'Required';
            if (!data.step1_role?.seniority) errors.seniority = 'Required';

            if (Object.keys(errors).length > 0) {
                setStep1Errors(errors);
                return;
            }
        }

        if (currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0 });
        } else {
            const validation = validateOnboardingData(data);
            if (validation.isValid) {
                const sanitizedData = sanitizeOnboardingData(data);
                const optionalSectionsCompleted = deriveOptionalSectionStatus(data);
                clearPersistedState();
                onComplete(sanitizedData, { optionalSectionsCompleted });
            } else {
                setValidationErrors(validation.errors);
            }
        }
    };

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

    const isStepComplete = (step: number): boolean => {
        switch (step) {
            case 1: return !!(data.step1_role?.currentRole && data.step1_role?.seniority);
            case 2: return (data.step2_skills?.primarySkills?.length || 0) >= 2;
            case 3: {
                const goalCount = data.step3_goals?.careerGoals?.length || 0;
                return goalCount > 0 && goalCount <= MAX_CAREER_GOALS && Boolean(data.step3_goals?.timeframe);
            }
            default: return false;
        }
    };

    // --- Data Options ---
    const {
        skillOptions: technicalSkillOptions,
        interestOptions,
        getCurrentSkillSuggestions,
        getLearningSkillSuggestions
    } = useOnboardingTaxonomy();


    // --- Render Steps ---

    const renderHeader = (title: string, subtitle?: string) => (
        <div className={styles.sectionHeader}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
    );

    const renderStep1 = () => (
        <div className={styles.section}>
            {renderHeader("About your role", "We'll suggest relevant events and peers.")}

            <div className="space-y-6">
                <div className={styles.inputGroup}>
                    <label htmlFor="current-role-mobile" className={styles.inputLabel}>
                        Current Role <span className={styles.requiredStar}>*</span>
                    </label>
                    <div className={styles.inputWrapper}>
                        <select
                            id="current-role-mobile"
                            className={cn(
                                styles.input,
                                step1Errors.currentRole && styles.inputError
                            )}
                            value={data.step1_role?.currentRole || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                updateData('step1_role', { ...data.step1_role, currentRole: value });
                                if (value) setStep1Errors(prev => { const { currentRole: _currentRole, ...rest } = prev; return rest; });
                            }}
                        >
                            <option value="" disabled>Select your role...</option>
                            {Object.entries(ROLE_TAXONOMY).map(([category, roles]) => (
                                <optgroup key={category} label={category}>
                                    {roles.map((role) => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <div className={styles.inputIconLeft}>
                            <MagnifyingGlass size={16} weight="bold" />
                        </div>

                        {!data.step1_role?.currentRole && (
                            <div className={styles.inputIconRight}>
                                <CaretDown size={14} weight="bold" />
                            </div>
                        )}
                    </div>
                    {step1Errors.currentRole && (
                        <p className={styles.errorText}>{step1Errors.currentRole}</p>
                    )}
                </div>

                <AnimatePresence>
                    {data.step1_role?.currentRole && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <MobileExperienceLevelSelector
                                value={data.step1_role?.seniority || ''}
                                onChange={(value) => {
                                    updateData('step1_role', { ...data.step1_role, seniority: value as SeniorityLevel });
                                    if (value) setStep1Errors(prev => { const { seniority: _seniority, ...rest } = prev; return rest; });
                                }}
                                error={step1Errors.seniority}
                                className="overflow-visible"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className={styles.section}>
            {renderHeader("Your Skills", "What are you good at? Select at least 2.")}

            <div className="space-y-8">
                <MultiSelectDropdown
                    options={technicalSkillOptions}
                    selectedValues={data.step2_skills?.primarySkills || []}
                    onChange={(values) => updateData('step2_skills', { primarySkills: values })}
                    label="Current Skills"
                    description="Core strengths"
                    placeholder="Add skill..."
                    suggestions={getCurrentSkillSuggestions(data.step1_role?.currentRole)}
                    suggestionLabel="Suggested"
                    maxSelections={10}
                    variant="linear"
                />

                <MultiSelectDropdown
                    options={technicalSkillOptions}
                    selectedValues={data.step2_skills?.skillsToLearn || []}
                    onChange={(values) => updateData('step2_skills', { skillsToLearn: values })}
                    label="To Learn"
                    description="Future goals"
                    placeholder="Add skill..."
                    suggestions={getLearningSkillSuggestions(data.step2_skills?.primarySkills || [], data.step1_role?.currentRole)}
                    suggestionLabel="Suggested"
                    maxSelections={10}
                    variant="linear"
                />

                <MultiSelectDropdown
                    options={interestOptions}
                    selectedValues={data.step2_skills?.interests || []}
                    onChange={(values) => updateData('step2_skills', { interests: values })}
                    label="Interests"
                    placeholder="Add topic..."
                    maxSelections={5}
                    allowCustom
                    variant="linear"
                />
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className={styles.section}>
            <div className="space-y-3">
                <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A8F98]">
                    <span>Step 3 of {totalSteps}</span>
                    <span className="h-px w-8 bg-white/10" />
                </div>
                {renderHeader("What are your goals?", "Finish with your main priorities, timeline, and any optional preferences you want us to tailor around.")}
            </div>

            <div className="space-y-6">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <p className="text-[11px] font-medium tracking-[0.08em] text-[#8A8F98]">Career goal</p>
                            <span className="text-[11px] text-[#A5A9B1]">
                            {(data.step3_goals?.careerGoals?.length ?? 0)}/{MAX_CAREER_GOALS}
                            </span>
                        </div>
                        <h3 className="text-[14px] font-medium text-white">Choose up to 2 priorities.</h3>
                    </div>
                    <div className={styles.listGroup}>
                        {GOAL_OPTIONS.map((goal) => {
                            const selectedGoals = data.step3_goals?.careerGoals || [];
                            const selected = selectedGoals.includes(goal.value);

                            return (
                                <MobileSelectableCard
                                    key={goal.value}
                                    selected={selected}
                                    disabled={selectedGoals.length >= MAX_CAREER_GOALS && !selected}
                                    onClick={() => {
                                        const next = selected
                                            ? selectedGoals.filter((currentGoal) => currentGoal !== goal.value)
                                            : [...selectedGoals, goal.value];
                                        updateData('step3_goals', { ...data.step3_goals, careerGoals: next });
                                    }}
                                    compact
                                    label={goal.label}
                                    type="checkbox"
                                >
                                    {goal.description}
                                </MobileSelectableCard>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <p className="text-[11px] font-medium tracking-[0.08em] text-[#8A8F98]">Timeline</p>
                        <h3 className="text-[14px] font-medium text-white">Choose when you want this shift to happen.</h3>
                    </div>
                    <div className={styles.listGroup} role="radiogroup" aria-label="Timeline">
                        {TIMEFRAME_OPTIONS.map((timeframe) => (
                            <MobileSelectableCard
                                key={timeframe.value}
                                selected={data.step3_goals?.timeframe === timeframe.value}
                                onClick={() => updateData('step3_goals', { ...data.step3_goals, timeframe: timeframe.value })}
                                compact
                                label={timeframe.label}
                                type="radio"
                            >
                                {timeframe.description}
                            </MobileSelectableCard>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-4">
                    <button
                        type="button"
                        onClick={() => {
                            setShowOptionalPreferences(prev => !prev);
                            setValidationErrors([]);
                        }}
                        aria-expanded={showOptionalPreferences}
                        className="flex w-full items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left"
                    >
                        <div className="space-y-1">
                            <p className="text-[11px] font-medium tracking-[0.08em] text-[#8A8F98]">Preferences (optional)</p>
                            <h3 className="text-[14px] font-medium text-white">Add preferences</h3>
                        </div>
                        <div className="mt-1 flex shrink-0 items-center gap-2 text-[12px] text-[#A5A9B1]">
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
                                key="mobile-optional-preferences"
                                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
                                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                className="space-y-5"
                            >
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h4 className="text-[14px] font-medium text-white">Learning style</h4>
                                        <p className="text-[13px] leading-5 text-[#A5A9B1]">Choose the formats that help you learn best.</p>
                                    </div>
                                    <div className={styles.listGroup}>
                                        {LEARNING_STYLE_OPTIONS.map((style) => (
                                            <MobileSelectableCard
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
                                                type="checkbox"
                                            >
                                                {style.description}
                                            </MobileSelectableCard>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <h4 className="text-[14px] font-medium text-white">Who do you want to meet?</h4>
                                        <p className="text-[13px] leading-5 text-[#A5A9B1]">Pick the people you want more introductions to.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {NETWORKING_GOAL_OPTIONS.map((goal) => (
                                            <MobilePreferenceChip
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
                                        onChange={(values) => updateData('step5_networking', { ...data.step5_networking, preferredEventTypes: values })}
                                        label="Event formats"
                                        description="Pick the formats you'd actually attend."
                                        placeholder="Select formats..."
                                        maxSelections={5}
                                        variant="linear"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        if (isWelcomeStep) return <WelcomeStep onStart={handleNext} onSkip={handleSkip} />;

        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            default: return null;
        }
    };

    // --- Bottom Action Bar ---
    const renderActionBar = () => {
        if (isWelcomeStep) return null;

        return (
            <div className={styles.actionBar}>
                <button
                    onClick={handleNext}
                    disabled={!isStepComplete(currentStep)}
                    className={cn(
                        styles.primaryButton,
                        !isStepComplete(currentStep) && styles.primaryButtonDisabled
                    )}
                >
                    {currentStep === totalSteps ? 'Complete' : 'Continue'}
                </button>
            </div>
        );
    };

    return (
        <div className={cn(styles.container, className)}>
            {!isWelcomeStep && (
                <>
                    <div className={styles.header}>
                        <div className={styles.headerLeft}>
                            {currentStep > 1 ? (
                                <button onClick={handlePrevious} className={styles.backButtonHeader} aria-label="Go back">
                                    <CaretLeft size={20} />
                                </button>
                            ) : (
                                // Start of flow, show back if onSkip provided or needed
                                onSkip && (
                                    <button onClick={handleSkip} className={styles.backButtonHeader} aria-label="Exit onboarding">
                                        <CaretLeft size={20} />
                                    </button>
                                )
                            )}
                        </div>
                        <div className="flex-1 flex justify-center">
                            <span className="text-[12px] font-medium text-[#8A8F98]">
                                Step {currentStep} of {totalSteps}
                            </span>
                        </div>
                        <div className={styles.headerRight}>
                            <button onClick={handleSkip} className={styles.skipButton} aria-label="Skip onboarding">
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.progressSegments}>
                            {Array.from({ length: totalSteps }).map((_, index) => (
                                <div
                                    key={`step-${index}`}
                                    className={cn(
                                        styles.progressSegment,
                                        index < currentStep ? "bg-[#E3E3E3]" : "bg-[#2E2F33]" // Ensure colors match theme if variables aren't working
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}

            <StepAnimatePresence mode="wait">
                <stepMotion.div
                    key={currentStep}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
                    transition={prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className={styles.contentWrapper}
                >
                    {renderContent()}
                </stepMotion.div>
            </StepAnimatePresence>

            {renderActionBar()}

            {validationErrors.length > 0 && (
                <div className="px-4 pb-24">
                    <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                        {validationErrors.map((error) => <div key={error}>{error}</div>)}
                    </div>
                </div>
            )}
        </div>
    );
};
