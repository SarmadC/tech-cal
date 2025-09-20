'use client';

import React, { useState } from 'react';
import { CaretLeft, CaretRight, User, Target, BookOpen, Network, CheckCircle } from '@phosphor-icons/react';
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
  CareerEventType
} from '@/types/career';

interface CareerOnboardingProps {
  onComplete: (data: CareerOnboardingData) => void;
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

  const totalSteps = 5;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(data as CareerOnboardingData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (step: keyof CareerOnboardingData, stepData: unknown) => {
    setData(prev => ({ ...prev, [step]: stepData }));
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(data.step1_role?.currentRole && data.step1_role?.seniority);
      case 2:
        return !!(data.step2_skills?.primarySkills?.length || data.step2_skills?.skillsToLearn?.length);
      case 3:
        return !!(data.step3_goals?.careerGoals?.length);
      case 4:
        return !!(data.step4_preferences?.learningStyle?.length);
      case 5:
        return !!(data.step5_networking?.networkingGoals?.length);
      default:
        return false;
    }
  };

  const renderProgressBar = () => (
    <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
      />
    </div>
  );

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      {[1, 2, 3, 4, 5].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${step === currentStep 
              ? 'bg-blue-600 text-white' 
              : step < currentStep 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }
          `}>
            {step < currentStep ? <CheckCircle size={16} /> : step}
          </div>
          {step < 5 && (
            <div className={`w-12 h-0.5 mx-2 ${
              step < currentStep ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <User size={48} className="mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your role</h2>
        <p className="text-gray-600">This helps us recommend the most relevant events for your career level.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Current Role</label>
        <input
          type="text"
          placeholder="e.g., Software Engineer, Product Manager, Data Scientist"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={data.step1_role?.currentRole || ''}
          onChange={(e) => updateData('step1_role', { 
            ...data.step1_role, 
            currentRole: e.target.value 
          })}
        />
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

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <BookOpen size={48} className="mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What are your skills?</h2>
        <p className="text-gray-600">Help us understand your technical background and learning interests.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Current Skills</label>
        <input
          type="text"
          placeholder="e.g., React, Python, AWS, Machine Learning (comma separated)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={data.step2_skills?.primarySkills?.join(', ') || ''}
          onChange={(e) => updateData('step2_skills', { 
            ...data.step2_skills, 
            primarySkills: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
          })}
        />
        <p className="text-xs text-gray-500 mt-1">List your strongest technical skills</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Skills You Want to Learn</label>
        <input
          type="text"
          placeholder="e.g., Kubernetes, GraphQL, Rust, Product Management"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={data.step2_skills?.skillsToLearn?.join(', ') || ''}
          onChange={(e) => updateData('step2_skills', { 
            ...data.step2_skills, 
            skillsToLearn: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
          })}
        />
        <p className="text-xs text-gray-500 mt-1">What would you like to learn next?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Areas of Interest</label>
        <input
          type="text"
          placeholder="e.g., AI/ML, Blockchain, DevOps, Design Systems"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={data.step2_skills?.interests?.join(', ') || ''}
          onChange={(e) => updateData('step2_skills', { 
            ...data.step2_skills, 
            interests: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
          })}
        />
        <p className="text-xs text-gray-500 mt-1">Broader topics you&apos;re curious about</p>
      </div>
    </div>
  );

  const renderStep3 = () => (
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
            { value: 'career-advancement', label: 'Get Promoted' },
            { value: 'role-transition', label: 'Change Roles' },
            { value: 'leadership-growth', label: 'Develop Leadership' },
            { value: 'entrepreneurship', label: 'Start a Company' },
            { value: 'networking', label: 'Build Network' },
            { value: 'specialization', label: 'Become Expert' },
            { value: 'salary-increase', label: 'Increase Salary' }
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
    </div>
  );

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

  return (
    <div className={`max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg ${className}`}>
      {renderProgressBar()}
      {renderStepIndicator()}

      <div className="min-h-96">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
        <div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Skip for now
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
