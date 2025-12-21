'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import {
  CareerOnboardingData,
  SeniorityLevel,
  CareerGoal,
  CareerTimeframe,
  LearningStyle,
  AvailableTime,
  BudgetRange,
  NetworkingGoal,
  CareerEventType,
  CollaborationStyle,
  TeamSizePreference,
  CommunicationPreference,
  MentorshipPreference,
  CareerOptionalSectionStatus,
  INTEREST_AREAS
} from '@/types/career';
import MultiSelectDropdown, { MultiSelectOption } from '@/components/ui/MultiSelectDropdown';
import { TeamRoleSelector } from './TeamRoleSelector';
import { RoleAutocomplete } from './RoleAutocomplete';
import { ProgressStepper } from './ProgressStepper';
import { ExperienceLevelSelector } from './ExperienceLevelSelector';
import { validateOnboardingData, sanitizeOnboardingData } from '@/utils/onboardingUtils';
import { buildSkillOptionList, mapSkillsToCanonical } from '@/utils/skillTaxonomy';
import {
  getSkillsForRole,
  getSuggestedSkillsToLearn
} from '@/utils/skillSuggestions';

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
  // Load persisted state from localStorage on mount
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('career-onboarding-step');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
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

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('career-onboarding-step', currentStep.toString());
    }
  }, [currentStep]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('career-onboarding-data', JSON.stringify(data));

      // Show save indicator briefly (debounced)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Only show if there's actually data to save
      if (Object.keys(data).length > 0) {
        setShowSaveIndicator(true);
        saveTimeoutRef.current = setTimeout(() => {
          setShowSaveIndicator(false);
        }, 1500);
      }
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data]);

  // Clear localStorage on completion or skip
  const clearPersistedState = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('career-onboarding-step');
      localStorage.removeItem('career-onboarding-data');
    }
  };

  // Snackbar for confirmations
  const { showConfirmation } = useSnackbar();

  // Handle skip with confirmation if user has entered data
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

  // Memoize dropdown options to prevent recreation on every render
  const technicalSkillOptions: MultiSelectOption[] = useMemo(() => buildSkillOptionList(), []);

  const interestOptions: MultiSelectOption[] = useMemo(() => 
    INTEREST_AREAS.map(interest => ({
      value: interest,
      label: interest
    })), []
  );

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      const errors: Record<string, string> = {};
      
      if (!data.step1_role?.currentRole) {
        errors.currentRole = 'Please select your current role';
      }
      
      if (!data.step1_role?.seniority) {
        errors.seniority = 'Please select your experience level';
      }
      
      if (Object.keys(errors).length > 0) {
        setStep1Errors(errors);
        
        // Scroll to first error
        setTimeout(() => {
          const firstError = document.querySelector('[aria-invalid="true"]') as HTMLElement;
          firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstError?.focus();
        }, 100);
        
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setValidationErrors([]); // Clear errors when moving to next step
      setStep1Errors({}); // Clear Step 1 errors
    } else {
      // Validate and sanitize data before completing
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
        // Show validation errors to user
        setValidationErrors(validation.errors);
        console.error('Onboarding validation failed:', validation.errors);
        return; // Stop the completion process
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (step: keyof CareerOnboardingData, stepData: unknown) => {
    setData(prev => {
      if (step === 'step2_skills' && stepData && typeof stepData === 'object') {
        const incoming = stepData as Partial<CareerOnboardingData['step2_skills']>;
        
        // Map to canonical for primary skills and skills to learn
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
            // Keep existing skillTags if not explicitly updated (backward compatibility)
            skillTags: incoming.skillTags ?? prev.step2_skills?.skillTags ?? []
          }
        };
      }

      return {
        ...prev,
        [step]: stepData
      };
    });
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        // Only Current Role and Experience Level required
        return !!(data.step1_role?.currentRole && data.step1_role?.seniority);
      case 2:
        // Require at least 2 current skills (proficiency rating removed)
        return (data.step2_skills?.primarySkills?.length || 0) >= 2;
      case 3:
        return !!(data.step3_goals?.careerGoals?.length);
      case 4:
        return !!(data.step4_preferences?.learningStyle?.length);
      case 5:
        return !!(data.step5_networking?.networkingGoals?.length);
      case 6:
        // Optional step: complete if user has entered ANY team building data
        return !!(
          data.step6_teamBuilding?.teamRole ||
          data.step6_teamBuilding?.collaborationStyle?.length ||
          data.step6_teamBuilding?.teamGoals?.length ||
          data.step6_teamBuilding?.teamSizePreference ||
          data.step6_teamBuilding?.communicationPreferences?.length ||
          data.step6_teamBuilding?.projectTypePreferences?.length
        );
      default:
        return false;
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, name: 'Your Role' },
      { number: 2, name: 'Skills' },
      { number: 3, name: 'Goals' }
    ];
    
    return <ProgressStepper currentStep={currentStep} totalSteps={totalSteps} steps={steps} />;
  };

  const renderStep1 = () => {
    const handleRoleChange = (value: string) => {
      updateData('step1_role', {
        ...data.step1_role,
        currentRole: value
      });
      if (value) {
        setStep1Errors(prev => {
          const { currentRole: _, ...rest } = prev;
          return rest;
        });
      }
      
      // Note: Smart track pre-selection would be handled by ExperienceLevelSelector
      // when it receives the role value, but for now we'll keep it simple
    };

    return (
      <div className="space-y-6">
        {/* Header with tighter spacing and time estimate */}
        <div className="text-center mb-3">
          <h2 className="text-2xl font-bold mb-1">Tell us about your role</h2>
          <p className="text-sm opacity-70 mb-0">Takes under 1 minute</p>
          <p className="text-sm opacity-80 mt-2">This helps us find your peer group and recommend relevant events</p>
        </div>

        {/* Current Role - Searchable Autocomplete */}
        <RoleAutocomplete
          id="current-role"
          label="Current Role"
          hint="Search for your role or browse by category"
          value={data.step1_role?.currentRole || ''}
          onChange={handleRoleChange}
          error={step1Errors.currentRole}
          required
        />

        {/* Experience Level - Two-track selector */}
        <ExperienceLevelSelector
          value={data.step1_role?.seniority || ''}
          onChange={(value) => {
            updateData('step1_role', {
              ...data.step1_role,
              seniority: value as SeniorityLevel
            });
            if (value) {
              setStep1Errors(prev => {
                const { seniority: _, ...rest } = prev;
                return rest;
              });
            }
          }}
          error={step1Errors.seniority}
        />
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-1">What are your skills?</h2>
        <p className="text-sm opacity-70 mb-0">~45 seconds</p>
        <p className="opacity-80 mt-2">Help us understand your technical background and learning interests.</p>
      </div>

      <MultiSelectDropdown
        options={technicalSkillOptions}
        selectedValues={data.step2_skills?.primarySkills || []}
        onChange={(values) => {
          updateData('step2_skills', { primarySkills: values });
        }}
        onDuplicateAttempt={(value) => {
          console.warn(`Duplicate attempt: ${value}`);
        }}
        label="Current Skills"
        description="Add 3–5 of your strongest skills"
        placeholder="Type to search or select from suggestions..."
        suggestions={getSkillsForRole(data.step1_role?.currentRole)}
        suggestionLabel="Popular for your role"
        maxSelections={10}
        searchable={true}
      />

      <MultiSelectDropdown
        options={technicalSkillOptions}
        selectedValues={data.step2_skills?.skillsToLearn || []}
        onChange={(values) => {
          updateData('step2_skills', { skillsToLearn: values });
        }}
        onDuplicateAttempt={(value) => {
          console.warn(`Duplicate attempt: ${value}`);
        }}
        label="Skills You Want to Learn"
        description="What's next on your roadmap? Add 2–3 skills"
        placeholder="Type to search or select..."
        suggestions={getSuggestedSkillsToLearn(
          data.step2_skills?.primarySkills || [],
          data.step1_role?.currentRole
        )}
        suggestionLabel="Suggested based on your skills"
        maxSelections={10}
        searchable={true}
      />

      <MultiSelectDropdown
        options={interestOptions}
        selectedValues={data.step2_skills?.interests || []}
        onChange={(values) => {
          updateData('step2_skills', { interests: values });
        }}
        onDuplicateAttempt={(value) => {
          console.warn(`Duplicate attempt: ${value}`);
        }}
        label="Areas of Interest"
        description="Broader topics you're curious about"
        placeholder="Type to search or add custom topics..."
        maxSelections={5}
        searchable={true}
        allowCustom={true}
      />
    </div>
  );

  const renderStep3 = () => {
    const canContinueToOptional = isStepComplete(3);

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">What are your goals?</h2>
          <p className="opacity-80">Tell us about your career aspirations so we can recommend relevant events.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-3">Career Goals (select all that apply)</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'skill-development', label: 'Learn New Skills' },
              { value: 'role-transition', label: 'Change Roles' },
              { value: 'leadership-growth', label: 'Develop Leadership' },
              { value: 'networking', label: 'Build Network' },
              // Aspirational options like promotion or salary increase are paused until we can track them reliably
            ].map((goal) => (
              <label key={goal.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.step3_goals?.careerGoals?.includes(goal.value as CareerGoal) || false}
                  onChange={(e) => {
                    const currentGoals = data.step3_goals?.careerGoals || [];
                    const newGoals = e.target.checked
                      ? [...currentGoals, goal.value as CareerGoal]
                      : currentGoals.filter(g => g !== goal.value);
                    updateData('step3_goals', {
                      ...data.step3_goals,
                      careerGoals: newGoals
                    });
                  }}
                  className="accent-primary"
                />
                <span className="text-sm">{goal.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Timeline</label>
          <select
            className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
            value={data.step3_goals?.timeframe || ''}
            onChange={(e) => updateData('step3_goals', {
              ...data.step3_goals,
              timeframe: e.target.value as CareerTimeframe
            })}
          >
            <option value="">When do you want to achieve these goals?</option>
            <option value="immediate">Immediately (0-6 months)</option>
            <option value="short-term">Short-term (6-18 months)</option>
            <option value="medium-term">Medium-term (1-3 years)</option>
            <option value="long-term">Long-term (3+ years)</option>
          </select>
        </div>

        {!includeOptionalSteps && (
          <div className="mt-10 rounded-lg border border-border bg-muted/50 p-6">
            <h3 className="text-base font-semibold text-foreground mb-2">Make recommendations even smarter</h3>
            <p className="text-sm text-muted-foreground">
              Share your learning preferences, availability, and networking goals when you&apos;re ready. These details are optional and can be added later.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={!canContinueToOptional}
                onClick={() => {
                  if (!canContinueToOptional) return;
                  setIncludeOptionalSteps(true);
                  setCurrentStep(4);
                  setValidationErrors([]);
                }}
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  canContinueToOptional
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                Continue to preferences
              </button>
              <p className="text-xs text-muted-foreground sm:ml-4">
                Prefer to do this later? You can update these details anytime from your profile.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Learning preferences</h2>
        <p className="opacity-80">How do you prefer to learn and what&apos;s your availability?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Learning Styles (select all that apply)</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'hands-on', label: 'Hands-on Workshops' },
            { value: 'theoretical', label: 'Lectures & Presentations' },
            { value: 'interactive', label: 'Discussions & Q&A' },
            { value: 'networking', label: 'Networking & Meeting People' },
            { value: 'case-studies', label: 'Real-world Examples' },
            { value: 'peer-learning', label: 'Learning from Peers' }
          ].map((style) => (
            <label key={style.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.step4_preferences?.learningStyle?.includes(style.value as LearningStyle) || false}
                onChange={(e) => {
                  const currentStyles = data.step4_preferences?.learningStyle || [];
                  const newStyles = e.target.checked
                    ? [...currentStyles, style.value as LearningStyle]
                    : currentStyles.filter(s => s !== style.value);
                  updateData('step4_preferences', { 
                    ...data.step4_preferences, 
                    learningStyle: newStyles 
                  });
                }}
                className="accent-primary"
              />
              <span className="text-sm">{style.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Available Time</label>
        <select
          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          value={data.step4_preferences?.availableTime || ''}
          onChange={(e) => updateData('step4_preferences', {
            ...data.step4_preferences,
            availableTime: e.target.value as AvailableTime
          })}
        >
          <option value="">How much time can you dedicate to learning?</option>
          <option value="very-limited">Very Limited (&lt; 2 hours/month)</option>
          <option value="limited">Limited (2-8 hours/month)</option>
          <option value="moderate">Moderate (8-20 hours/month)</option>
          <option value="flexible">Flexible (20+ hours/month)</option>
          <option value="dedicated">Dedicated (can take time off)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Budget Range</label>
        <select
          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          value={data.step4_preferences?.budget || ''}
          onChange={(e) => updateData('step4_preferences', {
            ...data.step4_preferences,
            budget: e.target.value as BudgetRange
          })}
        >
          <option value="">What&apos;s your learning budget?</option>
          <option value="free-only">Free events only</option>
          <option value="low">Low ($1-100/month)</option>
          <option value="moderate">Moderate ($100-500/month)</option>
          <option value="high">High ($500-2000/month)</option>
          <option value="unlimited">No budget constraints</option>
        </select>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Networking goals</h2>
        <p className="opacity-80">What kind of professional connections are you looking to make?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Networking Goals (select all that apply)</label>
        <div className="grid grid-cols-1 gap-3">
          {[
            { value: 'find-mentors', label: 'Connect with Senior Professionals & Mentors' },
            { value: 'find-peers', label: 'Meet Peers at My Level' },
            { value: 'find-collaborators', label: 'Find Project Partners & Collaborators' },
            { value: 'find-employers', label: 'Explore Job Opportunities' },
            { value: 'industry-insights', label: 'Learn About Industry Trends' },
            { value: 'thought-leadership', label: 'Establish My Expertise' }
          ].map((goal) => (
            <label key={goal.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.step5_networking?.networkingGoals?.includes(goal.value as NetworkingGoal) || false}
                onChange={(e) => {
                  const currentGoals = data.step5_networking?.networkingGoals || [];
                  const newGoals = e.target.checked
                    ? [...currentGoals, goal.value as NetworkingGoal]
                    : currentGoals.filter(g => g !== goal.value);
                  updateData('step5_networking', { 
                    ...data.step5_networking, 
                    networkingGoals: newGoals 
                  });
                }}
                className="accent-primary"
              />
              <span className="text-sm">{goal.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Preferred Event Types</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'conference', label: 'Conferences' },
            { value: 'workshop', label: 'Workshops' },
            { value: 'meetup', label: 'Local Meetups' },
            { value: 'webinar', label: 'Webinars' },
            { value: 'summit', label: 'Executive Summits' },
            { value: 'networking', label: 'Networking Events' }
          ].map((type) => (
            <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.step5_networking?.preferredEventTypes?.includes(type.value as CareerEventType) || false}
                onChange={(e) => {
                  const currentTypes = data.step5_networking?.preferredEventTypes || [];
                  const newTypes = e.target.checked
                    ? [...currentTypes, type.value as CareerEventType]
                    : currentTypes.filter(t => t !== type.value);
                  updateData('step5_networking', { 
                    ...data.step5_networking, 
                    preferredEventTypes: newTypes 
                  });
                }}
                className="accent-primary"
              />
              <span className="text-sm">{type.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Team Building Preferences</h2>
        <p className="opacity-80">Help us match you with the perfect hackathon team.</p>
      </div>


      {/* Team Role Selector */}
      <div>
        <TeamRoleSelector
          onRoleChange={(role) => updateData('step6_teamBuilding', {
            ...data.step6_teamBuilding,
            teamRole: role
          })}
          currentRole={data.step6_teamBuilding?.teamRole || ''}
          skills={data.step2_skills?.skillTags || []}
        />
      </div>

      {/* Collaboration Style */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Collaboration Style (select all that apply)</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'hands-on', label: 'Hands-on Coding' },
            { value: 'strategic', label: 'Strategic Planning' },
            { value: 'mentoring', label: 'Mentoring Others' },
            { value: 'learning', label: 'Learning from Others' },
            { value: 'leading', label: 'Taking Initiative' },
            { value: 'supporting', label: 'Supporting Others' },
            { value: 'innovating', label: 'Exploring New Ideas' },
            { value: 'executing', label: 'Implementing Solutions' }
          ].map((style) => (
            <label key={style.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.step6_teamBuilding?.collaborationStyle?.includes(style.value as CollaborationStyle) || false}
                onChange={(e) => {
                  const currentStyles = data.step6_teamBuilding?.collaborationStyle || [];
                  const newStyles = e.target.checked
                    ? [...currentStyles, style.value as CollaborationStyle]
                    : currentStyles.filter(s => s !== style.value);
                  updateData('step6_teamBuilding', { 
                    ...data.step6_teamBuilding, 
                    collaborationStyle: newStyles 
                  });
                }}
                className="accent-primary"
              />
              <span className="text-sm">{style.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Team Size Preference */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Preferred Team Size</label>
        <select
          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          value={data.step6_teamBuilding?.teamSizePreference || ''}
          onChange={(e) => updateData('step6_teamBuilding', {
            ...data.step6_teamBuilding,
            teamSizePreference: e.target.value as TeamSizePreference
          })}
        >
          <option value="">Select preferred team size</option>
          <option value="small">Small (2-3 people)</option>
          <option value="medium">Medium (4-5 people)</option>
          <option value="large">Large (6+ people)</option>
          <option value="flexible">Flexible - Any size</option>
        </select>
      </div>

      {/* Communication Preferences */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Communication Preferences (select all that apply)</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'slack', label: 'Slack' },
            { value: 'discord', label: 'Discord' },
            { value: 'zoom', label: 'Video Calls' },
            { value: 'github', label: 'GitHub Discussions' },
            { value: 'email', label: 'Email' },
            { value: 'in-person', label: 'In-Person' },
            { value: 'async', label: 'Async Communication' },
            { value: 'real-time', label: 'Real-time Collaboration' }
          ].map((pref) => (
            <label key={pref.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.step6_teamBuilding?.communicationPreferences?.includes(pref.value as CommunicationPreference) || false}
                onChange={(e) => {
                  const currentPrefs = data.step6_teamBuilding?.communicationPreferences || [];
                  const newPrefs = e.target.checked
                    ? [...currentPrefs, pref.value as CommunicationPreference]
                    : currentPrefs.filter(p => p !== pref.value);
                  updateData('step6_teamBuilding', { 
                    ...data.step6_teamBuilding, 
                    communicationPreferences: newPrefs 
                  });
                }}
                className="accent-primary"
              />
              <span className="text-sm">{pref.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Team Availability */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Availability for Team Work</label>
        <select
          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          value={data.step6_teamBuilding?.availabilityPattern?.timezone || ''}
          onChange={(e) => updateData('step6_teamBuilding', {
            ...data.step6_teamBuilding,
            availabilityPattern: {
              ...data.step6_teamBuilding?.availabilityPattern,
              timezone: e.target.value
            }
          })}
        >
          <option value="">Select your availability</option>
          <option value="weekends-only">Weekends Only</option>
          <option value="evenings-only">Evenings Only</option>
          <option value="flexible-hours">Flexible Hours</option>
          <option value="dedicated-time">Dedicated Time Blocks</option>
          <option value="part-time">Part-time</option>
          <option value="full-time">Full-time During Hackathon</option>
        </select>
      </div>

      {/* Project Types */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Project Types You&apos;re Interested In (select all that apply)</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'web-application', label: 'Web Applications' },
            { value: 'mobile-app', label: 'Mobile Apps' },
            { value: 'ai-ml', label: 'AI/ML Projects' },
            { value: 'blockchain', label: 'Blockchain/Web3' },
            { value: 'iot', label: 'IoT Projects' },
            { value: 'game', label: 'Game Development' },
            { value: 'data-visualization', label: 'Data Visualization' },
            { value: 'social-impact', label: 'Social Impact' },
            { value: 'fintech', label: 'FinTech' },
            { value: 'healthtech', label: 'HealthTech' },
            { value: 'edtech', label: 'EdTech' },
            { value: 'open-source', label: 'Open Source' }
          ].map((type) => (
            <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.step6_teamBuilding?.projectTypePreferences?.includes(type.value) || false}
                onChange={(e) => {
                  const currentTypes = data.step6_teamBuilding?.projectTypePreferences || [];
                  const newTypes = e.target.checked
                    ? [...currentTypes, type.value]
                    : currentTypes.filter(t => t !== type.value);
                  updateData('step6_teamBuilding', { 
                    ...data.step6_teamBuilding, 
                    projectTypePreferences: newTypes 
                  });
                }}
                className="accent-primary"
              />
              <span className="text-sm">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Mentorship Preference */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Mentorship Preference</label>
        <select
          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          value={data.step6_teamBuilding?.mentorshipPreference || ''}
          onChange={(e) => updateData('step6_teamBuilding', {
            ...data.step6_teamBuilding,
            mentorshipPreference: e.target.value as MentorshipPreference
          })}
        >
          <option value="">Select your mentorship preference</option>
          <option value="mentor">I prefer to mentor others</option>
          <option value="mentee">I prefer to be mentored</option>
          <option value="peer">I prefer peer-to-peer learning</option>
          <option value="flexible">I&apos;m flexible - either mentor or mentee</option>
        </select>
      </div>

      {/* Team Building Goals */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">Team Building Goals (select all that apply)</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'learn-new-skills', label: 'Learn New Skills' },
            { value: 'build-portfolio', label: 'Build Portfolio' },
            { value: 'network', label: 'Network & Meet People' },
            { value: 'win-prize', label: 'Win Prizes' },
            { value: 'startup-idea', label: 'Develop Startup Idea' },
            { value: 'contribute-open-source', label: 'Contribute to Open Source' },
            { value: 'career-advancement', label: 'Career Advancement' },
            { value: 'have-fun', label: 'Have Fun' }
          ].map((goal) => (
            <label key={goal.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.step6_teamBuilding?.teamGoals?.includes(goal.value) || false}
                onChange={(e) => {
                  const currentGoals = data.step6_teamBuilding?.teamGoals || [];
                  const newGoals = e.target.checked
                    ? [...currentGoals, goal.value]
                    : currentGoals.filter(g => g !== goal.value);
                  updateData('step6_teamBuilding', { 
                    ...data.step6_teamBuilding, 
                    teamGoals: newGoals 
                  });
                }}
                className="accent-primary"
              />
              <span className="text-sm">{goal.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`max-w-2xl mx-auto p-6 rounded-lg border border-border bg-card ${className}`}>
      {renderStepIndicator()}

      {/* Progress saved indicator */}
      <div
        className={`
          flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-4
          transition-opacity duration-300
          ${showSaveIndicator ? 'opacity-100' : 'opacity-0'}
        `}
        aria-live="polite"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Progress saved
      </div>

      <div className="min-h-96">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {includeOptionalSteps && currentStep === 4 && renderStep4()}
        {includeOptionalSteps && currentStep === 5 && renderStep5()}
        {includeOptionalSteps && currentStep === 6 && renderStep6()}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <h4 className="text-sm font-medium mb-2 text-destructive">Please fix the following issues:</h4>
          <ul className="text-sm space-y-1 text-destructive">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border gap-3">
        <div className="flex items-center gap-3">
          {/* Persistent Back button */}
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`
              flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors border border-border
              ${currentStep === 1
                ? 'opacity-50 cursor-not-allowed text-muted-foreground'
                : 'hover:bg-accent text-foreground'
              }
            `}
          >
            <CaretLeft size={16} className="mr-1" />
            Back
          </button>

          {/* Skip for now button */}
          {onSkip && (
            <button
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Next/Complete button */}
        <button
          onClick={handleNext}
          disabled={!isStepComplete(currentStep)}
          className={`
            flex items-center px-6 py-2 rounded-md text-sm font-medium transition-colors
            ${isStepComplete(currentStep)
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
        >
          {currentStep === totalSteps ? 'Complete Setup' : 'Next'}
          {currentStep < totalSteps && <CaretRight size={16} className="ml-1" />}
        </button>
      </div>
    </div>
  );
};

export default CareerOnboarding;
