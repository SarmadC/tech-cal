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

import React, { useState } from 'react';
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
  onCancel: () => void;
  isSaving: boolean;
}

// Role Information Editor
const RoleEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate, onCancel, isSaving }) => {
  const [formData, setFormData] = useState({
    currentRole: profile.currentRole,
    seniority: profile.seniority,
    industry: profile.industry,
    companySize: profile.companySize
  });

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Save immediately
    onUpdate({
      currentRole: formData.currentRole,
      seniority: formData.seniority,
      industry: formData.industry,
      companySize: formData.companySize,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Current Role</label>
        <input
          type="text"
          value={formData.currentRole}
          onChange={(e) => handleFieldChange('currentRole', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
          placeholder="e.g., Frontend Engineer"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Experience Level</label>
        <select
          value={formData.seniority}
          onChange={(e) => handleFieldChange('seniority', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base bg-white"
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

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Industry</label>
        <select
          value={formData.industry}
          onChange={(e) => handleFieldChange('industry', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base bg-white"
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

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Company Size</label>
        <select
          value={formData.companySize}
          onChange={(e) => handleFieldChange('companySize', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base bg-white"
        >
          <option value="startup">Startup (&lt; 50 employees)</option>
          <option value="small">Small (50-200 employees)</option>
          <option value="medium">Medium (200-1000 employees)</option>
          <option value="large">Large (1000-10000 employees)</option>
          <option value="enterprise">Enterprise (10000+ employees)</option>
          <option value="freelance">Freelance/Independent</option>
        </select>
      </div>

      <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
        >
          Cancel
        </button>
        {isSaving && (
          <div className="flex items-center px-6 py-2.5 text-blue-600 text-sm font-medium">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Saving changes...
          </div>
        )}
      </div>
    </div>
  );
};

// Skills Editor
const SkillsEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate, onCancel, isSaving }) => {
  const [formData, setFormData] = useState({
    primarySkills: profile.primarySkills,
    skillsToLearn: profile.skillsToLearn,
    interests: profile.interests
  });


  const handlePrimarySkillsChange = (skills: string[]) => {
    setFormData(prev => ({
      ...prev,
      primarySkills: skills
    }));
    // Save immediately
    onUpdate({
      primarySkills: skills,
      skillsToLearn: formData.skillsToLearn,
      interests: formData.interests
    });
  };

  const handleSkillsToLearnChange = (skills: string[]) => {
    setFormData(prev => ({
      ...prev,
      skillsToLearn: skills
    }));
    // Save immediately
    onUpdate({
      primarySkills: formData.primarySkills,
      skillsToLearn: skills,
      interests: formData.interests
    });
  };

  const handleInterestsChange = (interests: string[]) => {
    setFormData(prev => ({
      ...prev,
      interests: interests
    }));
    // Save immediately
    onUpdate({
      primarySkills: formData.primarySkills,
      skillsToLearn: formData.skillsToLearn,
      interests: interests
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Current Skills</label>
        <SkillsDropdown
          selectedSkills={formData.primarySkills}
          onSkillsChange={handlePrimarySkillsChange}
          placeholder="Search and select your current skills..."
          maxSkills={20}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Select the skills you currently have and use regularly
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Skills to Learn</label>
        <SkillsDropdown
          selectedSkills={formData.skillsToLearn}
          onSkillsChange={handleSkillsToLearnChange}
          placeholder="Search and select skills you want to learn..."
          maxSkills={15}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Select skills you want to develop or improve
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Areas of Interest</label>
        <SkillsDropdown
          selectedSkills={formData.interests}
          onSkillsChange={handleInterestsChange}
          placeholder="Search and select your areas of interest..."
          maxSkills={10}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Select topics and technologies that interest you
        </p>
      </div>

      <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
        >
          Cancel
        </button>
        {isSaving && (
          <div className="flex items-center px-6 py-2.5 text-blue-600 text-sm font-medium">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Saving changes...
          </div>
        )}
      </div>
    </div>
  );
};

// Career Goals Editor
const GoalsEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate, onCancel, isSaving }) => {
  const [formData, setFormData] = useState({
    careerGoals: profile.careerGoals,
    timeframe: profile.timeframe
  });

  const goalOptions = [
    { value: 'skill-development', label: 'Learn New Skills' },
    { value: 'career-advancement', label: 'Get Promoted' },
    { value: 'role-transition', label: 'Change Roles' },
    { value: 'leadership-growth', label: 'Develop Leadership' },
    { value: 'entrepreneurship', label: 'Start a Company' },
    { value: 'networking', label: 'Build Network' },
    { value: 'specialization', label: 'Become Expert' },
    { value: 'salary-increase', label: 'Increase Salary' }
  ];

  const handleGoalToggle = (goal: string) => {
    const updatedGoals = formData.careerGoals.includes(goal as CareerProfile['careerGoals'][0])
      ? formData.careerGoals.filter(g => g !== goal)
      : [...formData.careerGoals, goal as CareerProfile['careerGoals'][0]];

    setFormData(prev => ({
      ...prev,
      careerGoals: updatedGoals
    }));

    // Save immediately
    onUpdate({
      careerGoals: updatedGoals,
      timeframe: formData.timeframe
    });
  };

  const handleTimeframeChange = (timeframe: CareerProfile['timeframe']) => {
    setFormData(prev => ({ ...prev, timeframe }));
    // Save immediately
    onUpdate({
      careerGoals: formData.careerGoals,
      timeframe: timeframe
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

      <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
        >
          Cancel
        </button>
        {isSaving && (
          <div className="flex items-center px-6 py-2.5 text-blue-600 text-sm font-medium">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Saving changes...
          </div>
        )}
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

const LearningPreferencesEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate, onCancel, isSaving }) => {
  const [formData, setFormData] = useState({
    learningStyle: profile.learningStyle || [],
    availableTime: profile.availableTime || 'moderate',
    budget: profile.budget || 'moderate'
  });

  const toggleLearningStyle = (style: LearningStyle) => {
    setFormData(prev => {
      const exists = prev.learningStyle.includes(style);
      const learningStyle = exists
        ? prev.learningStyle.filter(s => s !== style)
        : [...prev.learningStyle, style];
      onUpdate({ learningStyle });
      return { ...prev, learningStyle };
    });
  };

  const handleSelectChange = (field: 'availableTime' | 'budget', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onUpdate({ [field]: value } as Partial<CareerProfile>);
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

      <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
        >
          Cancel
        </button>
        {isSaving && (
          <div className="flex items-center px-6 py-2.5 text-blue-600 text-sm font-medium">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Saving changes...
          </div>
        )}
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

const NetworkingPreferencesEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate, onCancel, isSaving }) => {
  const [formData, setFormData] = useState({
    networkingGoals: profile.networkingGoals || [],
    preferredEventTypes: profile.preferredEventTypes || []
  });

  const toggleCheckbox = <T extends string>(field: 'networkingGoals' | 'preferredEventTypes', value: T) => {
    setFormData(prev => {
      const existing = (prev[field] as string[]).includes(value);
      const nextValues = existing
        ? (prev[field] as string[]).filter(item => item !== value)
        : [...(prev[field] as string[]), value];
      onUpdate({ [field]: nextValues } as Partial<CareerProfile>);
      return { ...prev, [field]: nextValues };
    });
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

      <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
        >
          Cancel
        </button>
        {isSaving && (
          <div className="flex items-center px-6 py-2.5 text-blue-600 text-sm font-medium">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Saving changes...
          </div>
        )}
      </div>
    </div>
  );
};

// Team Preferences Editor (basic)
const TeamPreferencesEditor: React.FC<SectionEditorProps> = ({ profile, onUpdate, onCancel, isSaving }) => {
  const [preferredEventTypes, setPreferredEventTypes] = useState(profile.preferredEventTypes || []);

  const handleToggle = (value: CareerEventType) => {
    setPreferredEventTypes(prev => {
      const exists = prev.includes(value);
      const updated = exists ? prev.filter(type => type !== value) : [...prev, value];
      onUpdate({ preferredEventTypes: updated });
      return updated;
    });
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

      <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
        >
          Cancel
        </button>
        {isSaving && (
          <div className="flex items-center px-6 py-2.5 text-blue-600 text-sm font-medium">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Saving changes...
          </div>
        )}
      </div>
    </div>
  );
};

const QuickEditModal: React.FC<QuickEditModalProps> = ({ isOpen, onClose, section, currentProfile: _currentProfile, onSectionCompleted }) => {
  const { careerProfile, saveCareerProfile, refreshProfile } = useCareerProfile();
  const { showSuccess, showError } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const [_pendingUpdates, _setPendingUpdates] = useState<Partial<CareerProfile>>({});
  
  // Use the profile from the hook instead of the prop
  const currentProfile = careerProfile || _currentProfile;

  const sectionTitles = {
    role: 'Role Information',
    skills: 'Skills & Interests',
    goals: 'Career Goals',
    learning: 'Learning Preferences',
    networking: 'Networking Goals',
    team: 'Team Preferences'
  };

  const handleUpdate = async (updates: Partial<CareerProfile>) => {
    console.log('QuickEditModal - handleUpdate called with updates:', updates);
    console.log('QuickEditModal - currentProfile before update:', currentProfile);

    // Save immediately instead of using pendingUpdates
    if (Object.keys(updates).length > 0) {
      setIsSaving(true);
      try {
        const updatedProfile = { ...currentProfile, ...updates };
        console.log('QuickEditModal - saving updatedProfile:', updatedProfile);
        await saveCareerProfile(updatedProfile);
        console.log('QuickEditModal - save completed successfully');

        if (onSectionCompleted) {
          onSectionCompleted(section);
        }

        // Force refresh the profile data to ensure UI updates
        await refreshProfile();
        console.log('QuickEditModal - profile refreshed');

        showSuccess('Career profile updated successfully!');

        // Auto-close modal after successful save (with small delay to show success message)
        setTimeout(() => {
          onClose();
        }, 800);
      } catch (error) {
        console.error('Error updating career profile:', error);
        showError('Failed to update career profile. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };


  const handleCancel = () => {
    _setPendingUpdates({});
    onClose();
  };


  if (!isOpen || !currentProfile) return null;

  const renderSectionEditor = () => {
    const editorProps = {
      profile: currentProfile,
      onUpdate: handleUpdate,
      onCancel: handleCancel,
      isSaving
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
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
        <div className="flex items-center justify-between p-8 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">
              Edit {sectionTitles[section as keyof typeof sectionTitles]}
            </h2>
            <p className="text-sm text-gray-600">Update your profile information</p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          {renderSectionEditor()}
        </div>
      </div>
    </div>
  );
};

export default QuickEditModal;
