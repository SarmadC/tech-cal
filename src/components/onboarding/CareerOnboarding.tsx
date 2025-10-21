'use client';

import React, { useState, useMemo } from 'react';
import { CaretLeft, CaretRight, User, Target, BookOpen, Network, Users, CheckCircle } from '@phosphor-icons/react';
import {
  CareerOnboardingData,
  SeniorityLevel,
  CompanySize,
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
  ROLE_TAXONOMY,
  COMPANY_SIZE_OPTIONS,
  SENIORITY_LEVELS,
  INDUSTRY_FOCUS,
  INTEREST_AREAS
} from '@/types/career';
import MultiSelectDropdown, { MultiSelectOption } from '@/components/ui/MultiSelectDropdown';
import { SkillProficiencySelector } from './SkillProficiencySelector';
import { TeamRoleSelector } from './TeamRoleSelector';
import { validateOnboardingData, sanitizeOnboardingData, synchronizeSkillTags } from '@/utils/onboardingUtils';
import { buildSkillOptionList, mapSkillsToCanonical, normalizeSkillName } from '@/utils/skillTaxonomy';

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
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<Partial<CareerOnboardingData>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [includeOptionalSteps, setIncludeOptionalSteps] = useState(false);

  const totalSteps = includeOptionalSteps ? 6 : 3;

  // Memoize dropdown options to prevent recreation on every render
  const technicalSkillOptions: MultiSelectOption[] = useMemo(() => buildSkillOptionList(), []);

  const interestOptions: MultiSelectOption[] = useMemo(() => 
    INTEREST_AREAS.map(interest => ({
      value: interest,
      label: interest
    })), []
  );

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setValidationErrors([]); // Clear errors when moving to next step
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
        const primarySkillsRaw = incoming.primarySkills ?? prev.step2_skills?.primarySkills ?? [];
        const skillsToLearnRaw = incoming.skillsToLearn ?? prev.step2_skills?.skillsToLearn ?? [];
        const interests = incoming.interests ?? prev.step2_skills?.interests ?? [];

        const canonicalPrimary = mapSkillsToCanonical(primarySkillsRaw);
        const canonicalSkillsToLearn = mapSkillsToCanonical(skillsToLearnRaw);
        const existingSkillTags = incoming.skillTags ?? prev.step2_skills?.skillTags ?? [];
        const synchronizedTags = synchronizeSkillTags(canonicalPrimary, existingSkillTags);

        return {
          ...prev,
          step2_skills: {
            ...prev.step2_skills,
            ...incoming,
            primarySkills: canonicalPrimary,
            skillsToLearn: canonicalSkillsToLearn,
            interests,
            skillTags: synchronizedTags
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
        return !!(data.step1_role?.currentRole && data.step1_role?.seniority && data.step1_role?.industry);
      case 2:
        const hasSkills = !!(data.step2_skills?.primarySkills?.length || data.step2_skills?.skillsToLearn?.length || data.step2_skills?.interests?.length);
        const primarySkills = data.step2_skills?.primarySkills || [];
        const skillTags = data.step2_skills?.skillTags || [];
        const allSkillsHaveRatings = primarySkills.length === 0 ||
          primarySkills.every(skill => {
            const normalizedSkill = normalizeSkillName(skill);
            const matchingTag = skillTags.find(tag => normalizeSkillName(tag.skill) === normalizedSkill);
            return Boolean(matchingTag?.proficiency);
          });
        return hasSkills && allSkillsHaveRatings;
      case 3:
        return !!(data.step3_goals?.careerGoals?.length);
      case 4:
        return !!(data.step4_preferences?.learningStyle?.length);
      case 5:
        return !!(data.step5_networking?.networkingGoals?.length);
      case 6:
        return !!(data.step6_teamBuilding?.teamRole && data.step6_teamBuilding?.collaborationStyle?.length && data.step6_teamBuilding?.teamGoals?.length);
      default:
        return false;
    }
  };

  const renderProgressBar = () => (
    <div className="w-full bg-gray-200 rounded h-2 mb-8">
      <div 
        className="bg-blue-600 h-2 rounded transition-all duration-300"
        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
      />
    </div>
  );

  const renderStepIndicator = () => {
    const steps = includeOptionalSteps ? [1, 2, 3, 4, 5, 6] : [1, 2, 3];
    return (
      <div className="flex justify-center mb-8">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${step === currentStep
                ? 'bg-blue-600 text-white'
                : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }
            `}
            >
              {step < currentStep ? <CheckCircle size={16} /> : step}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2 ${
                  step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <User size={48} className="mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your role</h2>
        <p className="text-gray-600">This helps us find your peer group and recommend relevant events.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Current Role</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={data.step1_role?.currentRole || ''}
          onChange={(e) => updateData('step1_role', {
            ...data.step1_role,
            currentRole: e.target.value
          })}
        >
          <option value="">Select your role</option>
          {Object.entries(ROLE_TAXONOMY).map(([category, roles]) => (
            <optgroup key={category} label={category}>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Choose the role that best matches your current position</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={data.step1_role?.seniority || ''}
          onChange={(e) => updateData('step1_role', {
            ...data.step1_role,
            seniority: e.target.value as SeniorityLevel
          })}
        >
          <option value="">Select your level</option>
          {SENIORITY_LEVELS.map(level => (
            <option key={level.value} value={level.value}>{level.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Industry Focus</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={data.step1_role?.industry || ''}
          onChange={(e) => updateData('step1_role', {
            ...data.step1_role,
            industry: e.target.value
          })}
        >
          <option value="">Select your industry</option>
          {INDUSTRY_FOCUS.map(industry => (
            <option key={industry} value={industry}>{industry}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={data.step1_role?.companySize || ''}
          onChange={(e) => updateData('step1_role', {
            ...data.step1_role,
            companySize: e.target.value as CompanySize
          })}
        >
          <option value="">Select company size</option>
          {COMPANY_SIZE_OPTIONS.map(size => (
            <option key={size.value} value={size.value}>{size.label}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <BookOpen size={48} className="mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What are your skills?</h2>
        <p className="text-gray-600">Help us understand your technical background and learning interests.</p>
      </div>

      <MultiSelectDropdown
        options={technicalSkillOptions}
        selectedValues={data.step2_skills?.primarySkills || []}
        onChange={(values) => updateData('step2_skills', { 
          primarySkills: values 
        })}
        label="Current Skills"
        description='Select your strongest technical skills. You can search by acronyms like "JS" or "Next.js" and we’ll map them to our canonical list.'
        placeholder="Choose your current skills..."
        maxSelections={10}
        searchable={true}
      />

      {/* Skill Proficiency Selector - Only show if skills are selected */}
      {data.step2_skills?.primarySkills && data.step2_skills.primarySkills.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Your Proficiency</h3>
          <SkillProficiencySelector
            skills={data.step2_skills.primarySkills}
            skillTags={data.step2_skills.skillTags || []}
            onSkillsChange={(skillTags) => {
              try {
                updateData('step2_skills', { skillTags });
              } catch (error) {
                console.error('Error updating skill tags:', error);
              }
            }}
          />
        </div>
      )}

      <MultiSelectDropdown
        options={technicalSkillOptions}
        selectedValues={data.step2_skills?.skillsToLearn || []}
        onChange={(values) => updateData('step2_skills', { 
          skillsToLearn: values 
        })}
        label="Skills You Want to Learn"
        description='What would you like to learn next? Feel free to search with shorthand terms like "GCP" or "K8s".'
        placeholder="Choose skills to learn..."
        maxSelections={10}
        searchable={true}
      />

      <MultiSelectDropdown
        options={interestOptions}
        selectedValues={data.step2_skills?.interests || []}
        onChange={(values) => updateData('step2_skills', { 
          ...data.step2_skills, 
          interests: values 
        })}
        label="Areas of Interest"
        description="Broader topics you're curious about"
        placeholder="Choose your interests..."
        maxSelections={8}
        searchable={true}
      />
    </div>
  );

  const renderStep3 = () => {
    const canContinueToOptional = isStepComplete(3);

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <Target size={48} className="mx-auto mb-4 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">What are your goals?</h2>
          <p className="text-gray-600">Tell us about your career aspirations so we can recommend relevant events.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Career Goals (select all that apply)</label>
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
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{goal.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timeline</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="mt-10 rounded-xl border border-blue-100 bg-blue-50 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Make recommendations even smarter</h3>
            <p className="text-sm text-blue-800">
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
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  canContinueToOptional
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-200 text-blue-100 cursor-not-allowed'
                }`}
              >
                Continue to preferences
              </button>
              <p className="text-xs text-blue-700 sm:ml-4">
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
        <BookOpen size={48} className="mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Learning preferences</h2>
        <p className="text-gray-600">How do you prefer to learn and what&apos;s your availability?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Learning Styles (select all that apply)</label>
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
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{style.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Available Time</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <Network size={48} className="mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Networking goals</h2>
        <p className="text-gray-600">What kind of professional connections are you looking to make?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Networking Goals (select all that apply)</label>
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
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{goal.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Event Types</label>
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
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Users size={48} className="mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Building Preferences</h2>
        <p className="text-gray-600">Help us match you with the perfect hackathon team.</p>
      </div>

      {/* Skill Proficiency (if skills are selected) */}
      {data.step2_skills?.primarySkills && data.step2_skills.primarySkills.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Your Skills</h3>
          <SkillProficiencySelector
            skills={data.step2_skills.primarySkills}
            skillTags={data.step2_skills.skillTags || []}
            onSkillsChange={(skillTags) => updateData('step2_skills', {
              ...(data.step2_skills || {}),
              skillTags
            })}
          />
        </div>
      )}

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
        <label className="block text-sm font-medium text-gray-700 mb-3">Collaboration Style (select all that apply)</label>
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
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{style.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Team Size Preference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Team Size</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <label className="block text-sm font-medium text-gray-700 mb-3">Communication Preferences (select all that apply)</label>
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
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{pref.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Team Availability */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Availability for Team Work</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <label className="block text-sm font-medium text-gray-700 mb-3">Project Types You&apos;re Interested In (select all that apply)</label>
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
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Mentorship Preference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Mentorship Preference</label>
        <select
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <label className="block text-sm font-medium text-gray-700 mb-3">Team Building Goals (select all that apply)</label>
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
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{goal.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg ${className}`}>
      {renderProgressBar()}
      {renderStepIndicator()}

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
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following issues:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
        <div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Improve recommendations later
            </button>
          )}
        </div>

        <div className="flex space-x-3">
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              <CaretLeft size={16} className="mr-1" />
              Previous
            </button>
          )}
          
          <button
            onClick={handleNext}
            disabled={!isStepComplete(currentStep)}
            className={`flex items-center px-6 py-2 rounded-lg font-medium ${
              isStepComplete(currentStep)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {currentStep === totalSteps ? 'Complete Setup' : 'Next'}
            {currentStep < totalSteps && <CaretRight size={16} className="ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CareerOnboarding;
