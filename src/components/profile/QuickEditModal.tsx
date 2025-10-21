'use client';

/**
 * QuickEditModal - Allows users to edit specific sections of their career profile
 * without going through the full onboarding flow.
 * 
 * Features:
 * - Role Information: Current role, seniority, industry, company size
 * - Skills & Interests: Primary skills, skills to learn, areas of interest
 * - Career Goals: Career goals and timeline
 * 
 * Usage:
 * <QuickEditModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   section="role" // "role", "skills", or "goals"
 *   currentProfile={careerProfile}
 * />
 */

import React, { useEffect, useMemo, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { CareerProfile, LearningStyle, AvailableTime, BudgetRange, NetworkingGoal, CareerEventType } from '@/types/career';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import SkillsDropdown from '@/components/ui/SkillsDropdown';

interface QuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: string;
  currentProfile: CareerProfile;
  onSectionCompleted?: (section: string) => void;
}

interface SectionEditorProps {
  profile: CareerProfile;
  onUpdate: (updates: Partial<CareerProfile>) => void;
}

// Role Information Editor
const RoleEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate }) => {
  const [formData, setFormData] = useState({
    currentRole: profile.currentRole,
    seniority: profile.seniority,
    industry: profile.industry,
    companySize: profile.companySize
  });

  useEffect(() => {
    setFormData({
      currentRole: profile.currentRole,
      seniority: profile.seniority,
      industry: profile.industry,
      companySize: profile.companySize
    });
  }, [profile]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      onUpdate({
        currentRole: updated.currentRole,
        seniority: updated.seniority,
        industry: updated.industry,
        companySize: updated.companySize
      });
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground-secondary">Current Role</label>
        <input
          type="text"
          value={formData.currentRole}
          onChange={(e) => handleFieldChange('currentRole', e.target.value)}
          className="w-full rounded-2xl border border-border-color bg-background-tertiary px-4 py-3 text-base text-foreground-primary shadow-sm transition-all duration-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30"
          placeholder="e.g., Frontend Engineer"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground-secondary">Experience Level</label>
        <select
          value={formData.seniority}
          onChange={(e) => handleFieldChange('seniority', e.target.value)}
          className="w-full rounded-2xl border border-border-color bg-background-tertiary px-4 py-3 text-base text-foreground-primary shadow-sm transition-all duration-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="student">Student</option>
          <option value="entry-level">Entry Level (0-2 years)</option>
          <option value="junior">Junior (2-4 years)</option>
          <option value="mid-level">Mid-level (4-7 years)</option>
          <option value="senior">Senior (7-12 years)</option>
          <option value="staff">Staff (12+ years)</option>
          <option value="principal">Principal (15+ years)</option>
          <option value="lead">Team Lead</option>
          <option value="manager">Manager</option>
          <option value="director">Director</option>
          <option value="vp">VP/Executive</option>
          <option value="founder">Founder/Entrepreneur</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground-secondary">Industry</label>
        <select
          value={formData.industry}
          onChange={(e) => handleFieldChange('industry', e.target.value)}
          className="w-full rounded-2xl border border-border-color bg-background-tertiary px-4 py-3 text-base text-foreground-primary shadow-sm transition-all duration-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="Technology/Software">Technology/Software</option>
          <option value="Healthcare/Biotech">Healthcare/Biotech</option>
          <option value="Finance/FinTech">Finance/FinTech</option>
          <option value="E-commerce/Retail">E-commerce/Retail</option>
          <option value="Gaming/Entertainment">Gaming/Entertainment</option>
          <option value="Education/EdTech">Education/EdTech</option>
          <option value="Energy/CleanTech">Energy/CleanTech</option>
          <option value="Aerospace/Defense">Aerospace/Defense</option>
          <option value="Consulting">Consulting</option>
          <option value="Startup/Early Stage">Startup/Early Stage</option>
          <option value="Non-Profit/Government">Non-Profit/Government</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground-secondary">Company Size</label>
        <select
          value={formData.companySize}
          onChange={(e) => handleFieldChange('companySize', e.target.value)}
          className="w-full rounded-2xl border border-border-color bg-background-tertiary px-4 py-3 text-base text-foreground-primary shadow-sm transition-all duration-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="startup">Startup (&lt; 50 employees)</option>
          <option value="small">Small (50-200 employees)</option>
          <option value="medium">Medium (200-1000 employees)</option>
          <option value="large">Large (1000-10000 employees)</option>
          <option value="enterprise">Enterprise (10000+ employees)</option>
          <option value="freelance">Freelance/Independent</option>
        </select>
      </div>

    </div>
  );
};

// Skills Editor
const SkillsEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate }) => {
  const [formData, setFormData] = useState({
    primarySkills: profile.primarySkills,
    skillsToLearn: profile.skillsToLearn,
    interests: profile.interests
  });

  useEffect(() => {
    setFormData({
      primarySkills: profile.primarySkills,
      skillsToLearn: profile.skillsToLearn,
      interests: profile.interests
    });
  }, [profile]);

  const syncUpdates = (next: typeof formData) => {
    onUpdate({
      primarySkills: next.primarySkills,
      skillsToLearn: next.skillsToLearn,
      interests: next.interests
    });
  };

  const handlePrimarySkillsChange = (skills: string[]) => {
    setFormData(prev => {
      const next = { ...prev, primarySkills: skills };
      syncUpdates(next);
      return next;
    });
  };

  const handleSkillsToLearnChange = (skills: string[]) => {
    setFormData(prev => {
      const next = { ...prev, skillsToLearn: skills };
      syncUpdates(next);
      return next;
    });
  };

  const handleInterestsChange = (interests: string[]) => {
    setFormData(prev => {
      const next = { ...prev, interests };
      syncUpdates(next);
      return next;
    });
  };

  const SectionCard = ({
    title,
    description,
    children
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-3xl border border-border-color bg-background-secondary/70 p-6 shadow-sm">
      <div className="mb-4 space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">{title}</h3>
        <p className="text-sm text-foreground-muted">{description}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Current Skills"
        description="Select the skills you actively use and feel confident about."
      >
        <SkillsDropdown
          selectedSkills={formData.primarySkills}
          onSkillsChange={handlePrimarySkillsChange}
          placeholder="Search skills you actively use..."
        />
      </SectionCard>

      <SectionCard
        title="Skills to Learn"
        description="Choose skills you want to improve or explore next."
      >
        <SkillsDropdown
          selectedSkills={formData.skillsToLearn}
          onSkillsChange={handleSkillsToLearnChange}
          placeholder="Search skills you want to learn..."
        />
      </SectionCard>

      <SectionCard
        title="Areas of Interest"
        description="Highlight topics and technologies that inspire you."
      >
        <SkillsDropdown
          selectedSkills={formData.interests}
          onSkillsChange={handleInterestsChange}
          placeholder="Search interests and technologies..."
        />
      </SectionCard>
    </div>
  );
};


// Career Goals Editor
const GoalsEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate }) => {
  const [formData, setFormData] = useState({
    careerGoals: profile.careerGoals,
    timeframe: profile.timeframe
  });

  useEffect(() => {
    setFormData({
      careerGoals: profile.careerGoals,
      timeframe: profile.timeframe
    });
  }, [profile]);

  const goalOptions = [
    { value: 'skill-development', label: 'Learn New Skills' },
    { value: 'role-transition', label: 'Change Roles' },
    { value: 'leadership-growth', label: 'Develop Leadership' },
    { value: 'networking', label: 'Build Network' }
  ];

  const handleGoalToggle = (goal: string) => {
    const updatedGoals = formData.careerGoals.includes(goal as CareerProfile['careerGoals'][0])
      ? formData.careerGoals.filter(g => g !== goal)
      : [...formData.careerGoals, goal as CareerProfile['careerGoals'][0]];

    setFormData(prev => ({ ...prev, careerGoals: updatedGoals }));
    onUpdate({
      careerGoals: updatedGoals,
      timeframe: formData.timeframe
    });
  };

  const handleTimeframeChange = (timeframe: CareerProfile['timeframe']) => {
    setFormData(prev => ({ ...prev, timeframe }));
    onUpdate({
      careerGoals: formData.careerGoals,
      timeframe
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-4">Career Goals</label>
        <div className="grid grid-cols-2 gap-3">
          {goalOptions.map((goal) => (
            <label key={goal.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.careerGoals.includes(goal.value as CareerProfile['careerGoals'][0])}
                onChange={() => handleGoalToggle(goal.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{goal.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Timeline</label>
        <select
          value={formData.timeframe}
          onChange={(e) => handleTimeframeChange(e.target.value as CareerProfile['timeframe'])}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base bg-white"
        >
          <option value="immediate">Immediately (0-6 months)</option>
          <option value="short-term">Short-term (6-18 months)</option>
          <option value="medium-term">Medium-term (1-3 years)</option>
          <option value="long-term">Long-term (3+ years)</option>
        </select>
      </div>

    </div>
  );
};

// Learning Preferences Editor
const learningStyleOptions: Array<{ value: LearningStyle; label: string }> = [
  { value: 'hands-on', label: 'Hands-on Workshops' },
  { value: 'theoretical', label: 'Lectures & Presentations' },
  { value: 'interactive', label: 'Discussions & Q&A' },
  { value: 'networking', label: 'Networking & Meeting People' },
  { value: 'case-studies', label: 'Real-world Examples' },
  { value: 'peer-learning', label: 'Learning from Peers' }
];

const availableTimeOptions: Array<{ value: AvailableTime; label: string }> = [
  { value: 'very-limited', label: 'Very Limited (< 2 hrs/month)' },
  { value: 'limited', label: 'Limited (2-8 hrs/month)' },
  { value: 'moderate', label: 'Moderate (8-20 hrs/month)' },
  { value: 'flexible', label: 'Flexible (20+ hrs/month)' },
  { value: 'dedicated', label: 'Dedicated (can take time off)' }
];

const budgetOptions: Array<{ value: BudgetRange; label: string }> = [
  { value: 'free-only', label: 'Free events only' },
  { value: 'low', label: 'Low ($1-100/month)' },
  { value: 'moderate', label: 'Moderate ($100-500/month)' },
  { value: 'high', label: 'High ($500-2000/month)' },
  { value: 'unlimited', label: 'No budget constraints' }
];

const LearningPreferencesEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate }) => {
  const [formData, setFormData] = useState({
    learningStyle: profile.learningStyle || [],
    availableTime: profile.availableTime || 'moderate',
    budget: profile.budget || 'moderate'
  });

  useEffect(() => {
    setFormData({
      learningStyle: profile.learningStyle || [],
      availableTime: profile.availableTime || 'moderate',
      budget: profile.budget || 'moderate'
    });
  }, [profile]);

  const toggleLearningStyle = (style: LearningStyle) => {
    const exists = formData.learningStyle.includes(style);
    const learningStyle = exists
      ? formData.learningStyle.filter(s => s !== style)
      : [...formData.learningStyle, style];

    setFormData(prev => ({ ...prev, learningStyle }));
    onUpdate({ learningStyle });
  };

  const handleSelectChange = (field: 'availableTime' | 'budget', value: string) => {
    if (field === 'availableTime') {
      const typedValue = value as AvailableTime;
      setFormData(prev => ({ ...prev, availableTime: typedValue }));
      onUpdate({ availableTime: typedValue });
    } else {
      const typedValue = value as BudgetRange;
      setFormData(prev => ({ ...prev, budget: typedValue }));
      onUpdate({ budget: typedValue });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Learning Styles</label>
        <div className="grid grid-cols-2 gap-3">
          {learningStyleOptions.map(option => (
            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.learningStyle.includes(option.value)}
                onChange={() => toggleLearningStyle(option.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Available Time</label>
        <select
          value={formData.availableTime}
          onChange={(e) => handleSelectChange('availableTime', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base bg-white"
        >
          {availableTimeOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Budget Range</label>
        <select
          value={formData.budget}
          onChange={(e) => handleSelectChange('budget', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base bg-white"
        >
          {budgetOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

    </div>
  );
};

// Networking Preferences Editor
const networkingGoalOptions: Array<{ value: NetworkingGoal; label: string }> = [
  { value: 'find-mentors', label: 'Connect with mentors' },
  { value: 'find-mentees', label: 'Support mentees' },
  { value: 'find-peers', label: 'Meet peers at my level' },
  { value: 'find-collaborators', label: 'Find collaborators' },
  { value: 'find-employers', label: 'Explore job opportunities' },
  { value: 'industry-insights', label: 'Learn industry trends' },
  { value: 'thought-leadership', label: 'Establish expertise' }
];

const eventTypeOptions: Array<{ value: CareerEventType; label: string }> = [
  { value: 'conference', label: 'Conferences' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'meetup', label: 'Meetups' },
  { value: 'webinar', label: 'Webinars' },
  { value: 'summit', label: 'Summits' },
  { value: 'networking', label: 'Networking Events' },
  { value: 'bootcamp', label: 'Bootcamps' },
  { value: 'hackathon', label: 'Hackathons' },
  { value: 'panel', label: 'Panels' },
  { value: 'keynote', label: 'Keynotes' },
  { value: 'trade-show', label: 'Trade Shows' }
];

const NetworkingPreferencesEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate }) => {
  const [formData, setFormData] = useState({
    networkingGoals: profile.networkingGoals || [],
    preferredEventTypes: profile.preferredEventTypes || []
  });

  useEffect(() => {
    setFormData({
      networkingGoals: profile.networkingGoals || [],
      preferredEventTypes: profile.preferredEventTypes || []
    });
  }, [profile]);

  const toggleCheckbox = <T extends string>(field: 'networkingGoals' | 'preferredEventTypes', value: T) => {
    const currentValues = formData[field] as string[];
    const existing = currentValues.includes(value);
    const nextValues = existing
      ? currentValues.filter(item => item !== value)
      : [...currentValues, value];

    setFormData(prev => ({ ...prev, [field]: nextValues }));
    onUpdate({ [field]: nextValues } as Partial<CareerProfile>);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Networking Goals</label>
        <div className="grid grid-cols-2 gap-3">
          {networkingGoalOptions.map(option => (
            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.networkingGoals.includes(option.value)}
                onChange={() => toggleCheckbox('networkingGoals', option.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Preferred Event Types</label>
        <div className="grid grid-cols-2 gap-3">
          {eventTypeOptions.map(option => (
            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.preferredEventTypes.includes(option.value)}
                onChange={() => toggleCheckbox('preferredEventTypes', option.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

    </div>
  );
};

// Team Preferences Editor (basic)
const TeamPreferencesEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate }) => {
  const [preferredEventTypes, setPreferredEventTypes] = useState(profile.preferredEventTypes || []);

  useEffect(() => {
    setPreferredEventTypes(profile.preferredEventTypes || []);
  }, [profile]);

  const handleToggle = (value: CareerEventType) => {
    const exists = preferredEventTypes.includes(value);
    const updated = exists
      ? preferredEventTypes.filter(type => type !== value)
      : [...preferredEventTypes, value];

    setPreferredEventTypes(updated);
    void onUpdate({ preferredEventTypes: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Preferred Event Types</label>
        <div className="grid grid-cols-2 gap-3">
          {eventTypeOptions.map(option => (
            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferredEventTypes.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

    </div>
  );
};

const QuickEditModal: React.FC<QuickEditModalProps> = ({ isOpen, onClose, section, currentProfile: _currentProfile, onSectionCompleted }) => {
  const { careerProfile, saveCareerProfile, refreshProfile } = useCareerProfile();
  const { showSuccess, showError } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Partial<CareerProfile>>({});
  
  // Use the profile from the hook instead of the prop
  const currentProfile = careerProfile || _currentProfile;

  useEffect(() => {
    if (isOpen) {
      setPendingUpdates({});
    }
  }, [isOpen, section, currentProfile]);

  const draftProfile = useMemo(() => {
    if (!currentProfile) return currentProfile;
    return { ...currentProfile, ...pendingUpdates } as CareerProfile;
  }, [currentProfile, pendingUpdates]);

  const sectionTitles = {
    role: 'Role Information',
    skills: 'Skills & Interests',
    goals: 'Career Goals',
    learning: 'Learning Preferences',
    networking: 'Networking Goals',
    team: 'Team Preferences'
  };

  const handleUpdate = (updates: Partial<CareerProfile>) => {
    if (updates && Object.keys(updates).length > 0) {
      setPendingUpdates(prev => ({ ...prev, ...updates }));
    }
  };

  const handleSave = async () => {
    if (!currentProfile || Object.keys(pendingUpdates).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfile = { ...currentProfile, ...pendingUpdates } as CareerProfile;
      await saveCareerProfile(updatedProfile);

      if (onSectionCompleted) {
        onSectionCompleted(section);
      }

      await refreshProfile();
      showSuccess('Career profile updated successfully!');
      setPendingUpdates({});
      onClose();
    } catch (error) {
      console.error('Error updating career profile:', error);
      showError('Failed to update career profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  const handleCancel = () => {
    setPendingUpdates({});
    onClose();
  };


  if (!isOpen || !currentProfile) return null;

  const effectiveProfile = (draftProfile ?? currentProfile) as CareerProfile;

  const hasPendingChanges = Object.keys(pendingUpdates).length > 0;

  const renderSectionEditor = () => {
    const editorProps = {
      profile: effectiveProfile,
      onUpdate: handleUpdate
    };

    switch (section) {
      case 'role':
        return <RoleEditor {...editorProps} />;
      case 'skills':
        return <SkillsEditor {...editorProps} />;
      case 'goals':
        return <GoalsEditor {...editorProps} />;
      case 'learning':
        return <LearningPreferencesEditor {...editorProps} />;
      case 'networking':
        return <NetworkingPreferencesEditor {...editorProps} />;
      case 'team':
        return <TeamPreferencesEditor {...editorProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/70">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border border-border-color bg-background-secondary shadow-2xl transition-transform duration-300">
        <div className="flex items-center justify-between border-b border-border-subtle bg-background-secondary/80 px-8 py-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground-primary mb-1">
              Edit {sectionTitles[section as keyof typeof sectionTitles]}
            </h2>
            <p className="text-sm text-foreground-secondary">
              Update your profile information
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-foreground-muted transition-all duration-200 hover:border-border-color hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-6rem)] overflow-y-auto px-8 py-6">
          {renderSectionEditor()}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border-subtle bg-background-secondary/80 px-8 py-5">
          <button
            onClick={handleCancel}
            className="inline-flex items-center rounded-xl border border-border-color bg-background-tertiary px-5 py-2.5 text-sm font-medium text-foreground-secondary transition-all duration-200 hover:bg-background-tertiary/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasPendingChanges || isSaving}
            className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickEditModal;
