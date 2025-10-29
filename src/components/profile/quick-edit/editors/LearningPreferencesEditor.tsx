'use client';

import React, { useMemo } from 'react';
import { CareerProfile, LearningStyle, AvailableTime, BudgetRange } from '@/types/career';
import { 
  LEARNING_STYLE_OPTIONS, 
  AVAILABLE_TIME_OPTIONS, 
  BUDGET_OPTIONS 
} from '../config';
import { FormField, CheckboxGroup, Select } from '@/components/onboarding/shared/FormField';

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
      <CheckboxGroup
        label="Learning Styles (select all that apply)"
        options={LEARNING_STYLE_OPTIONS}
        selectedValues={formData.learningStyle}
        onChange={(values) => {
          const learningStyle = values as LearningStyle[];
          onUpdate({ learningStyle });
        }}
        columns={2}
      />

      {/* Available Time */}
      <FormField label="Available Time">
        <Select
          value={formData.availableTime}
          onChange={(e) => handleSelectChange('availableTime', e.target.value)}
        >
          {AVAILABLE_TIME_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </FormField>

      {/* Budget Range */}
      <FormField label="Budget Range">
        <Select
          value={formData.budget}
          onChange={(e) => handleSelectChange('budget', e.target.value)}
        >
          {BUDGET_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </FormField>
    </div>
  );
});

LearningPreferencesEditor.displayName = 'LearningPreferencesEditor';

export default LearningPreferencesEditor;