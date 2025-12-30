'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
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
    INTEREST_AREAS
} from '@/types/career';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import { TeamRoleSelector } from './TeamRoleSelector';
import { RoleAutocomplete } from './RoleAutocomplete';
import { ExperienceLevelSelector } from './ExperienceLevelSelector';
import { validateOnboardingData, sanitizeOnboardingData } from '@/utils/onboardingUtils';
import { buildSkillOptionList, mapSkillsToCanonical } from '@/utils/skillTaxonomy';
import {
    getSkillsForRole,
    getSuggestedSkillsToLearn
} from '@/utils/skillSuggestions';
import { WelcomeStep } from './WelcomeStep';
import { StepIndicator } from './StepIndicator';


function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Animation Configs ---
const springTransition = {
    type: "spring" as const,
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
    shortcut
}: {
    selected: boolean;
    onClick: () => void;
    label?: string;
    children?: React.ReactNode;
    shortcut?: string;
}) => (
    <motion.div
        layout
        onClick={onClick}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
            "cursor-pointer group relative rounded-xl border p-4 transition-all duration-200 select-none",
            selected
                ? "bg-secondary border-border shadow-[0_0_0_1px_hsl(var(--border)),inset_0_0_20px_hsl(var(--muted)/0.3)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),inset_0_0_20px_rgba(255,255,255,0.05)]"
                : "bg-secondary/30 border-border/50 hover:border-border hover:bg-secondary/50"
        )}
    >
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
                {/* Custom Checkbox */}
                <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 mt-0.5",
                    selected
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                        : "border-border bg-transparent group-hover:border-border"
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
                    {label && <div className={cn("font-medium text-sm transition-colors", selected ? "text-foreground" : "text-foreground/90")}>{label}</div>}
                    {children && <div className="text-sm text-muted-foreground mt-1 leading-snug">{children}</div>}
                </div>
            </div>

            {shortcut && (
                <span className="text-[10px] uppercase font-mono text-muted-foreground/40 border border-border/50 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {shortcut}
                </span>
            )}
        </div>
    </motion.div>
);


const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <motion.div variants={staggerItem} className="mb-8 space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-base text-muted-foreground leading-relaxed">{subtitle}</p>}
    </motion.div>
);

// --- Main Component ---

interface CareerOnboardingProps {
    onComplete: (data: CareerOnboardingData, options?: { optionalSectionsCompleted: CareerOptionalSectionStatus }) => void;
    onSkip?: () => void;
    className?: string;
}

const CareerOnboarding: React.FC<CareerOnboardingProps> = ({
    onComplete,
    onSkip,
    className = ''
}) => {
    // Load persisted state
    const [currentStep, setCurrentStep] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('career-onboarding-step');
            // Default to 0 (Welcome) if no saved state
            return saved ? parseInt(saved, 10) : 0;
        }
        return 0;
    });

    const [data, setData] = useState<Partial<CareerOnboardingData>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('career-onboarding-data');
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });

    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [includeOptionalSteps, setIncludeOptionalSteps] = useState(false);
    const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
    const [showSaveIndicator, setShowSaveIndicator] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const totalSteps = includeOptionalSteps ? 6 : 3;
    // Helper to check if we are in "setup" mode (step 0)
    const isWelcomeStep = currentStep === 0;

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

            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (Object.keys(data).length > 0) {
                setShowSaveIndicator(true);
                saveTimeoutRef.current = setTimeout(() => setShowSaveIndicator(false), 1500);
            }
        }
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [currentStep, data]);

    const clearPersistedState = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('career-onboarding-step');
            localStorage.removeItem('career-onboarding-data');
        }
    };

    const handleSkip = () => {
        const hasProgress = data.step1_role?.currentRole ||
            (data.step2_skills?.primarySkills?.length ?? 0) > 0 ||
            (data.step3_goals?.careerGoals?.length ?? 0) > 0;

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

    const technicalSkillOptions = useMemo(() => buildSkillOptionList(), []);
    const interestOptions = useMemo(() => INTEREST_AREAS.map(interest => ({
        value: interest,
        label: interest
    })), []);

    const handleNext = () => {
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
            setCurrentStep(prev => prev + 1);
            setValidationErrors([]);
            setStep1Errors({});
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
    }, [currentStep, data, isStepComplete]); // Dependencies for keyboard listener

    const renderStep1 = () => (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
            <SectionHeader title="Tell us about your role" subtitle="This helps us find your peer group and relevant events." />

            <motion.div variants={staggerItem} className="space-y-6">
                <RoleAutocomplete
                    id="current-role"
                    label="Current Role"
                    hint="Search for your role"
                    value={data.step1_role?.currentRole || ''}
                    onChange={(value) => {
                        updateData('step1_role', { ...data.step1_role, currentRole: value });
                        if (value) setStep1Errors(prev => { const { currentRole, ...rest } = prev; return rest; });
                    }}
                    error={step1Errors.currentRole}
                    required
                />

                <AnimatePresence>
                    {data.step1_role?.currentRole && (
                        <ExperienceLevelSelector
                            value={data.step1_role?.seniority || ''}
                            onChange={(value) => {
                                updateData('step1_role', { ...data.step1_role, seniority: value as SeniorityLevel });
                                if (value) setStep1Errors(prev => { const { seniority, ...rest } = prev; return rest; });
                            }}
                            error={step1Errors.seniority}
                            // Pass down styling to match progressive disclosure
                            className="overflow-hidden"
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
            <SectionHeader title="What are your skills?" subtitle="Help us understand your technical background." />

            <motion.div variants={staggerItem} className="space-y-6">
                <MultiSelectDropdown
                    options={technicalSkillOptions}
                    selectedValues={data.step2_skills?.primarySkills || []}
                    onChange={(values) => updateData('step2_skills', { primarySkills: values })}
                    label="Current Skills"
                    description="Select 3–5 of your strongest skills"
                    placeholder="Search skills..."
                    suggestions={getSkillsForRole(data.step1_role?.currentRole)}
                    suggestionLabel="Popular for your role"
                    maxSelections={10}
                    variant="minimal"
                />

                <MultiSelectDropdown
                    options={technicalSkillOptions}
                    selectedValues={data.step2_skills?.skillsToLearn || []}
                    onChange={(values) => updateData('step2_skills', { skillsToLearn: values })}
                    label="Skills You Want to Learn"
                    description="What's next on your roadmap?"
                    placeholder="Search skills..."
                    suggestions={getSuggestedSkillsToLearn(data.step2_skills?.primarySkills || [], data.step1_role?.currentRole)}
                    suggestionLabel="Suggested"
                    maxSelections={10}
                    variant="minimal"
                />

                <MultiSelectDropdown
                    options={interestOptions}
                    selectedValues={data.step2_skills?.interests || []}
                    onChange={(values) => updateData('step2_skills', { interests: values })}
                    label="Interests"
                    placeholder="Search or add topics..."
                    maxSelections={5}
                    allowCustom
                    variant="minimal"
                />
            </motion.div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
            <SectionHeader title="What are your goals?" subtitle="Select your primary career aspirations." />

            <div className="space-y-8">
                <motion.div variants={staggerItem} className="space-y-4">
                    <label className="text-sm font-medium text-foreground/80">Career Goals</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { value: 'skill-development', label: 'Learn New Skills' },
                            { value: 'role-transition', label: 'Change Roles' },
                            { value: 'leadership-growth', label: 'Develop Leadership' },
                            { value: 'networking', label: 'Build Network' },
                        ].map((goal, i) => (
                            <SelectableCard
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
                                shortcut={`${i + 1}`}
                            />
                        ))}
                    </div>
                </motion.div>

                <motion.div variants={staggerItem} className="space-y-4">
                    <label className="text-sm font-medium text-foreground/80">Timeline</label>
                    <div className="relative group">
                        <select
                            className="w-full appearance-none rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground focus:border-border focus:bg-secondary/50 focus:outline-none transition-all duration-200"
                            value={data.step3_goals?.timeframe || ''}
                            onChange={(e) => updateData('step3_goals', { ...data.step3_goals, timeframe: e.target.value as CareerTimeframe })}
                        >
                            <option value="" disabled>Select timeline</option>
                            <option value="immediate">Immediately (0-6 months)</option>
                            <option value="short-term">Short-term (6-18 months)</option>
                            <option value="medium-term">Medium-term (1-3 years)</option>
                            <option value="long-term">Long-term (3+ years)</option>
                        </select>
                        <CaretDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors" />
                    </div>
                </motion.div>
            </div>

            {!includeOptionalSteps && (
                <motion.div variants={staggerItem} className="pt-6 border-t border-border/50">
                    <button
                        onClick={() => {
                            if (!isStepComplete(3)) return;
                            setIncludeOptionalSteps(true);
                            setCurrentStep(4);
                            setValidationErrors([]);
                        }}
                        disabled={!isStepComplete(3)}
                        className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-2 group"
                    >
                        <span>I want to add more details (Learning style, Networking, Team prefs)</span>
                        <CaretRight className="opacity-0 group-hover:opacity-100 transition-opacity -ml-1 group-hover:translate-x-1" size={12} />
                    </button>
                </motion.div>
            )}
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
            <SectionHeader title="Learning Preferences" />
            <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                    { value: 'hands-on', label: 'Hands-on Workshops', desc: 'Build things in real-time' },
                    { value: 'theoretical', label: 'Lectures & Presentations', desc: 'Deep dive into concepts' },
                    { value: 'interactive', label: 'Discussions & Q&A', desc: 'Share and debate ideas' },
                    { value: 'networking', label: 'Networking Focus', desc: 'Meet new people' },
                ].map((style, i) => (
                    <SelectableCard
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
                        shortcut={`${i + 1}`}
                    >
                        {style.desc}
                    </SelectableCard>
                ))}
            </motion.div>
        </motion.div>
    );

    const renderStep5 = () => (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
            <SectionHeader title="Networking Goals" />
            <motion.div variants={staggerItem} className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                    {[
                        { value: 'find-mentors', label: 'Find Mentors', desc: 'Connect with experienced leaders' },
                        { value: 'find-peers', label: 'Meet Peers', desc: 'Connect with people at your level' },
                        { value: 'find-collaborators', label: 'Find Collaborators', desc: 'Start projects together' },
                    ].map((goal, i) => (
                        <SelectableCard
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
                            shortcut={`${i + 1}`}
                        >
                            {goal.desc}
                        </SelectableCard>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );

    const renderStep6 = () => (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
            <SectionHeader title="Team Building" />
            <motion.div variants={staggerItem}>
                <TeamRoleSelector
                    onRoleChange={(role) => updateData('step6_teamBuilding', { ...data.step6_teamBuilding, teamRole: role })}
                    currentRole={data.step6_teamBuilding?.teamRole || ''}
                    skills={data.step2_skills?.skillTags || []}
                />
            </motion.div>
        </motion.div>
    );


    const renderContent = () => {
        switch (currentStep) {
            case 0: return <WelcomeStep onStart={handleNext} onSkip={handleSkip} />;
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            case 6: return renderStep6();
            default: return null;
        }
    };

    return (
        <div className={cn("w-full mx-auto max-w-xl", className)}>
            <div className="mb-8">
                {currentStep > 0 && (
                    <div className="flex items-center justify-between mb-4">
                        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
                    </div>
                )}
                {/* 
                     We removed the old ProgressBar because we use StepIndicator.
                */}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20, filter: "blur(5px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -20, filter: "blur(5px)" }}
                    transition={springTransition}
                    className="min-h-[400px]"
                >
                    {renderContent()}
                </motion.div>
            </AnimatePresence>

            {!isWelcomeStep && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-12 flex items-center justify-between pt-6 border-t border-dashed border-border/50"
                >
                    <button
                        disabled={currentStep <= 1}
                        className={cn(
                            "flex items-center text-sm font-medium transition-colors group",
                            currentStep === 1
                                ? "text-muted-foreground/30 cursor-not-allowed"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={handlePrevious}
                    >
                        <CaretLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>

                    <div className="flex items-center gap-4">
                        {/* Keyboard hint - now inline with actions */}
                        <span className="text-[10px] text-muted-foreground/40 hidden sm:flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 rounded border border-border/50 bg-secondary/30 font-mono">⌘</kbd>
                            <kbd className="px-1.5 py-0.5 rounded border border-border/50 bg-secondary/30 font-mono">↵</kbd>
                        </span>

                        {onSkip && (
                            <button
                                onClick={handleSkip}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Skip
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            disabled={!isStepComplete(currentStep)}
                            className={cn(
                                "flex items-center px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                isStepComplete(currentStep)
                                    ? "bg-primary text-primary-foreground shadow-lg dark:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-xl dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-primary/90"
                                    : "bg-secondary/30 text-muted-foreground/50 cursor-not-allowed"
                            )}
                        >
                            {/* Validation Pulse Effect */}
                            {isStepComplete(currentStep) && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-primary/20"
                                />
                            )}
                            <span className="relative z-10 flex items-center">
                                {currentStep === totalSteps ? 'Complete' : 'Continue'}
                                <CaretRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                        </button>
                    </div>
                </motion.div>
            )}

            {validationErrors.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm"
                >
                    {validationErrors.map((e, i) => <div key={i}>{e}</div>)}
                </motion.div>
            )}
        </div>
    );
};

const CaretDownIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.75 4.5L6 8.25L2.25 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default CareerOnboarding;
