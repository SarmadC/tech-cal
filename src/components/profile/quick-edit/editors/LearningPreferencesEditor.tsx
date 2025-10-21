'use client';

import React, { useMemo } from 'react';
import { CareerProfile, LearningStyle, AvailableTime, BudgetRange } from '@/types/career';
import { 
  LEARNING_STYLE_OPTIONS, 
  AVAILABLE_TIME_OPTIONS, 
  BUDGET_OPTIONS 
} from '../config';

// Editor prop interface
export interface LearningPreferencesEditorProps {
  profile: Partial<CareerProfile>;
  onUpdate: (updates: Partial<CareerProfile>) => void;
}

// Memoized LearningPreferencesEditor component
const LearningPreferencesEditor: React.FC<LearningPreferencesEditorProps> = React.memo(({ profile, onUpdate }) => {
  // Memoized form data to prevent unnecessary re-renders
  const formData = useMemo(() => ({
    learningStyle: profile.learningStyle || [],
    availableTime: profile.availableTime || 'moderate',
    budget: profile.budget || 'moderate'
  }), [profile]);

  // Learning style toggle handler
  const toggleLearningStyle = (style: LearningStyle) => {
    const exists = formData.learningStyle.includes(style);
    const learningStyle = exists
      ? formData.learningStyle.filter(s => s !== style)
      : [...formData.learningStyle, style];

    onUpdate({ learningStyle });
  };

  // Select change handler for available time and budget
  const handleSelectChange = (field: 'availableTime' | 'budget', value: string) => {
    if (field === 'availableTime') {
      const typedValue = value as AvailableTime;
      onUpdate({ availableTime: typedValue });
    } else {
      const typedValue = value as BudgetRange;
      onUpdate({ budget: typedValue });
    }
  };

  return (
    <div className="space-y-6">
      {/* Learning Styles */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Learning Styles</label>
        <div className="grid grid-cols-2 gap-3">
          {LEARNING_STYLE_OPTIONS.map(option => (
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

      {/* Available Time */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Available Time</label>
        <select
          value={formData.availableTime}
          onChange={(e) => handleSelectChange('availableTime', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base bg-white"
        >
          {AVAILABLE_TIME_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* Budget Range */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Budget Range</label>
        <select
          value={formData.budget}
          onChange={(e) => handleSelectChange('budget', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base bg-white"
        >
          {BUDGET_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
});

LearningPreferencesEditor.displayName = 'LearningPreferencesEditor';

export default LearningPreferencesEditor;