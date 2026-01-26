'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { CaretLeft, CaretRight, Check, Info, CaretDown, MagnifyingGlass, X, Plus, Minus } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
    CareerOnboardingData,
    SeniorityLevel,
    CareerGoal,
    CareerTimeframe,
    LearningStyle,
    NetworkingGoal,
    CareerOptionalSectionStatus,
    INTEREST_AREAS,
    ROLE_TAXONOMY
} from '@/types/career';
import MultiSelectDropdown from '@/components/ui/MobileMultiSelectDropdown';
import { TeamRoleSelector } from '../TeamRoleSelector';

import { MobileExperienceLevelSelector } from './MobileExperienceLevelSelector';
import { validateOnboardingData, sanitizeOnboardingData } from '@/utils/onboardingUtils';
import { buildSkillOptionList, mapSkillsToCanonical } from '@/utils/skillTaxonomy';
import {
    getSkillsForRole,
    getSuggestedSkillsToLearn
} from '@/utils/skillSuggestions';
import { WelcomeStep } from '../WelcomeStep';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

import styles from './MobileCareerOnboarding.module.css';

// --- Animation Configs ---
const springTransition = {
    type: "spring" as const,
    stiffness: 350,
    damping: 30
};



// --- Mobile Optimized Components ---

const MobileSelectableCard = ({
    selected,
    onClick,
    label,
    children,
    type = 'checkbox'
}: {
    selected: boolean;
    onClick: () => void;
    label?: string;
    children?: React.ReactNode;
    type?: 'checkbox' | 'radio';
}) => (
    <motion.button
        layout
        onClick={onClick}
        whileTap={{ scale: 0.99 }}
        className={styles.selectableCard}
        data-selected={selected}
    >
        <div
            className={cn(
                styles.cardIcon,
                type === 'radio' ? styles.cardIconRadio : styles.cardIconCheckbox
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
    // ... (state management remains the same)

    // --- State Management (Matches Desktop) ---
    const [currentStep, setCurrentStep] = useState(() => {
        if (typeof initialStep === 'number') {
            return initialStep;
        }
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('career-onboarding-step');
            return saved ? parseInt(saved, 10) : 0;
        }
        return 0;
    });

    const [data, setData] = useState<Partial<CareerOnboardingData>>(() => {
        if (initialData && Object.keys(initialData).length > 0) return initialData;
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('career-onboarding-data');
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });

    const [includeOptionalSteps, setIncludeOptionalSteps] = useState(() => {
        if (typeof initialIncludeOptionalSteps === 'boolean') {
            return initialIncludeOptionalSteps;
        }
        if (typeof initialStep === 'number') {
            return initialStep > 3;
        }
        return false;
    });
    const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Total steps logic matches desktop
    const totalSteps = includeOptionalSteps ? 6 : 3;
    const isWelcomeStep = currentStep === 0;
    const { showConfirmation } = useSnackbar();

    useEffect(() => {
        if (currentStep > 3 && !includeOptionalSteps) {
            setIncludeOptionalSteps(true);
        }
    }, [currentStep, includeOptionalSteps]);

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
        // Simplified skip logic for mobile
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
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Ensure top on step change
        } else {
            const validation = validateOnboardingData(data);
            if (validation.isValid) {
                const sanitizedData = sanitizeOnboardingData(data);
                const optionalSectionsCompleted: CareerOptionalSectionStatus = {
                    learningPreferences: includeOptionalSteps && Boolean(data.step4_preferences?.learningStyle?.length),
                    networkingPreferences: includeOptionalSteps && Boolean(data.step5_networking?.networkingGoals?.length),
                    teamPreferences: includeOptionalSteps && Boolean(data.step6_teamBuilding?.teamGoals?.length)
                };
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
            // Logic for skills mapping remains same as original
            if (step === 'step2_skills' && stepData && typeof stepData === 'object') {
                const incoming = stepData as Partial<CareerOnboardingData['step2_skills']>;
                const canonicalPrimary = incoming.primarySkills
                    ? mapSkillsToCanonical(incoming.primarySkills)
                    : prev.step2_skills?.primarySkills ?? [];
                const canonicalSkillsToLearn = incoming.skillsToLearn
                    ? mapSkillsToCanonical(incoming.skillsToLearn)
                    : prev.step2_skills?.skillsToLearn ?? [];

                return {
                    ...prev,
                    step2_skills: {
                        ...prev.step2_skills,
                        primarySkills: canonicalPrimary,
                        skillsToLearn: canonicalSkillsToLearn,
                        interests: incoming.interests ?? prev.step2_skills?.interests ?? [],
                        skillTags: incoming.skillTags ?? prev.step2_skills?.skillTags ?? []
                    }
                };
            }
            return { ...prev, [step]: stepData };
        });
    };

    const isStepComplete = (step: number): boolean => {
        switch (step) {
            case 1: return !!(data.step1_role?.currentRole && data.step1_role?.seniority);
            case 2: return (data.step2_skills?.primarySkills?.length || 0) >= 2;
            case 3: return !!(data.step3_goals?.careerGoals?.length);
            case 4: return !!(data.step4_preferences?.learningStyle?.length);
            case 5: return !!(data.step5_networking?.networkingGoals?.length);
            case 6: return !!(data.step6_teamBuilding?.teamRole || data.step6_teamBuilding?.teamGoals?.length);
            default: return false;
        }
    };

    // --- Data Options ---
    const technicalSkillOptions = useMemo(() => buildSkillOptionList(), []);
    const interestOptions = useMemo(() => INTEREST_AREAS.map(interest => ({
        value: interest,
        label: interest
    })), []);


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
                                if (value) setStep1Errors(prev => { const { currentRole, ...rest } = prev; return rest; });
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
                                    if (value) setStep1Errors(prev => { const { seniority, ...rest } = prev; return rest; });
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
            {renderHeader("Your Skills", "What are you good at? Select 3-5.")}

            <div className="space-y-8">
                <MultiSelectDropdown
                    options={technicalSkillOptions}
                    selectedValues={data.step2_skills?.primarySkills || []}
                    onChange={(values) => updateData('step2_skills', { primarySkills: values })}
                    label="Current Skills"
                    description="Core strengths"
                    placeholder="Add skill..."
                    suggestions={getSkillsForRole(data.step1_role?.currentRole)}
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
                    suggestions={getSuggestedSkillsToLearn(data.step2_skills?.primarySkills || [], data.step1_role?.currentRole)}
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
            {renderHeader("Your Goals", "What are you aiming for?")}

            <div className="space-y-6">
                <div>
                    <label className={cn(styles.inputLabel, "mb-3")}>Primary Goals</label>
                    <div className={styles.listGroup}>
                        {[
                            { value: 'skill-development', label: 'Learn New Skills' },
                            { value: 'role-transition', label: 'Change Roles' },
                            { value: 'leadership-growth', label: 'Develop Leadership' },
                            { value: 'networking', label: 'Build Network' },
                        ].map((goal) => (
                            <MobileSelectableCard
                                key={goal.value}
                                selected={data.step3_goals?.careerGoals?.includes(goal.value as CareerGoal) || false}
                                onClick={() => {
                                    const current = data.step3_goals?.careerGoals || [];
                                    const next = current.includes(goal.value as CareerGoal)
                                        ? current.filter(g => g !== goal.value)
                                        : [...current, goal.value as CareerGoal];
                                    updateData('step3_goals', { ...data.step3_goals, careerGoals: next });
                                }}
                                label={goal.label}
                                type="checkbox"
                            />
                        ))}
                    </div>
                </div>

                <div className={styles.timelineRow}>
                    <span className={styles.timelineLabel}>Timeline</span>
                    <div className={styles.timelineValue}>
                        <span>
                            {data.step3_goals?.timeframe
                                ? {
                                    'immediate': 'Immediately (0-6 months)',
                                    'short-term': 'Short-term (6-18 months)',
                                    'medium-term': 'Medium-term (1-3 years)',
                                    'long-term': 'Long-term (3+ years)',
                                }[data.step3_goals.timeframe] || 'Select...'
                                : 'Select...'}
                        </span>
                        <CaretRight size={12} weight="bold" />
                    </div>
                    <select
                        className={styles.hiddenSelect}
                        value={data.step3_goals?.timeframe || ''}
                        onChange={(e) => updateData('step3_goals', { ...data.step3_goals, timeframe: e.target.value as CareerTimeframe })}
                    >
                        <option value="" disabled>Select timeline</option>
                        <option value="immediate">Immediately (0-6 months)</option>
                        <option value="short-term">Short-term (6-18 months)</option>
                        <option value="medium-term">Medium-term (1-3 years)</option>
                        <option value="long-term">Long-term (3+ years)</option>
                    </select>
                </div>
            </div>

            <div className="pt-6 border-t border-border/50">
                <button
                    onClick={() => {
                        if (includeOptionalSteps) {
                            setIncludeOptionalSteps(false);
                        } else {
                            setIncludeOptionalSteps(true);
                            setCurrentStep(4);
                        }
                    }}
                    className={styles.optionalButton}
                >
                    {includeOptionalSteps ? <Minus size={14} weight="bold" /> : <Plus size={14} weight="bold" />}
                    <span>{includeOptionalSteps ? "Remove detailed preferences" : "Add detailed preferences"}</span>
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className={styles.section}>
            {renderHeader("Learning Style", "How do you learn best?")}
            <div className={styles.listGroup}>
                {[
                    { value: 'hands-on', label: 'Hands-on Workshops' },
                    { value: 'theoretical', label: 'Lectures & Presentations' },
                    { value: 'interactive', label: 'Discussions & Q&A' },
                    { value: 'networking', label: 'Networking Focus' },
                ].map((style) => (
                    <MobileSelectableCard
                        key={style.value}
                        selected={data.step4_preferences?.learningStyle?.includes(style.value as LearningStyle) || false}
                        onClick={() => {
                            const current = data.step4_preferences?.learningStyle || [];
                            const next = current.includes(style.value as LearningStyle)
                                ? current.filter(s => s !== style.value)
                                : [...current, style.value as LearningStyle];
                            updateData('step4_preferences', { ...data.step4_preferences, learningStyle: next });
                        }}
                        label={style.label}
                        type="checkbox"
                    />
                ))}
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className={styles.section}>
            {renderHeader("Networking", "Who do you want to meet?")}
            <div className={styles.listGroup}>
                {[
                    { value: 'find-mentors', label: 'Find Mentors' },
                    { value: 'find-peers', label: 'Meet Peers' },
                    { value: 'find-collaborators', label: 'Find Collaborators' },
                ].map((goal) => (
                    <MobileSelectableCard
                        key={goal.value}
                        selected={data.step5_networking?.networkingGoals?.includes(goal.value as NetworkingGoal) || false}
                        onClick={() => {
                            const current = data.step5_networking?.networkingGoals || [];
                            const next = current.includes(goal.value as NetworkingGoal)
                                ? current.filter(g => g !== goal.value)
                                : [...current, goal.value as NetworkingGoal];
                            updateData('step5_networking', { ...data.step5_networking, networkingGoals: next });
                        }}
                        label={goal.label}
                        type="checkbox"
                    />
                ))}
            </div>

            <div className="mt-8 space-y-4">
                <div className={styles.sectionHeader}>
                    <h2 className="text-[15px] font-medium text-white">Event Formats</h2>
                    <p className="text-[13px] text-[#8A8F98]">What types of events do you prefer?</p>
                </div>
                <MultiSelectDropdown
                    options={[
                        { value: 'conference', label: 'Conference' },
                        { value: 'workshop', label: 'Workshop' },
                        { value: 'meetup', label: 'Meetup' },
                        { value: 'webinar', label: 'Webinar' },
                        { value: 'hackathon', label: 'Hackathon' },
                        { value: 'summit', label: 'Summit' },
                        { value: 'bootcamp', label: 'Bootcamp' },
                        { value: 'certification', label: 'Certification' },
                        { value: 'panel', label: 'Panel' },
                        { value: 'keynote', label: 'Keynote' },
                        { value: 'networking', label: 'Networking' },
                        { value: 'trade-show', label: 'Trade Show' },
                    ]}
                    selectedValues={data.step5_networking?.preferredEventTypes || []}
                    onChange={(values) => updateData('step5_networking', { ...data.step5_networking, preferredEventTypes: values })}
                    label="Preferred Formats"
                    placeholder="Select formats..."
                    maxSelections={5}
                    variant="linear"
                />
            </div>
        </div>
    );

    const renderStep6 = () => (
        <div className={styles.section}>
            {renderHeader("Team Role", "How do you work in teams?")}
            <TeamRoleSelector
                onRoleChange={(role) => updateData('step6_teamBuilding', { ...data.step6_teamBuilding, teamRole: role })}
                currentRole={data.step6_teamBuilding?.teamRole || ''}
                skills={data.step2_skills?.skillTags || []}
            />
        </div>
    );

    const renderContent = () => {
        if (isWelcomeStep) return <WelcomeStep onStart={handleNext} onSkip={handleSkip} />;

        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            case 6: return renderStep6();
            default: return null;
        }
    };

    // --- Bottom Action Bar ---
    const renderActionBar = () => {
        if (isWelcomeStep) return null;

        return (
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className={styles.actionBar}
            >
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
            </motion.div>
        );
    };

    return (
        <div className={cn(styles.container, className)}>
            {!isWelcomeStep && (
                <>
                    <div className={styles.header}>
                        <div className={styles.headerLeft}>
                            {currentStep > 1 ? (
                                <button onClick={handlePrevious} className={styles.backButtonHeader}>
                                    <CaretLeft size={20} />
                                </button>
                            ) : (
                                // Start of flow, show back if onSkip provided or needed
                                onSkip && (
                                    <button onClick={onSkip} className={styles.backButtonHeader}>
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
                            <button onClick={onSkip || (() => { })} className={styles.skipButton}>
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

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={springTransition}
                    className={styles.contentWrapper}
                >
                    {renderContent()}
                </motion.div>
            </AnimatePresence>

            {renderActionBar()}
        </div>
    );
};
