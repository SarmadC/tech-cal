'use client';

import React, { useMemo } from 'react';
import { CareerProfile } from '@/types/career';
import { 
  NETWORKING_GOAL_OPTIONS, 
  EVENT_TYPE_OPTIONS 
} from '../config';

// Editor prop interface
export interface NetworkingPreferencesEditorProps {
  profile: Partial<CareerProfile>;
  onUpdate: (updates: Partial<CareerProfile>) => void;
}

// Memoized NetworkingPreferencesEditor component
const NetworkingPreferencesEditor: React.FC<NetworkingPreferencesEditorProps> = React.memo(({ profile, onUpdate }) => {
  // Memoized form data to prevent unnecessary re-renders
  const formData = useMemo(() => ({
    networkingGoals: profile.networkingGoals || [],
    preferredEventTypes: profile.preferredEventTypes || []
  }), [profile]);

  // Checkbox toggle handler for both networking goals and event types
  const toggleCheckbox = <T extends string>(field: 'networkingGoals' | 'preferredEventTypes', value: T) => {
    const currentValues = formData[field] as string[];
    const existing = currentValues.includes(value);
    const nextValues = existing
      ? currentValues.filter(item => item !== value)
      : [...currentValues, value];

    onUpdate({ [field]: nextValues });
  };

  return (
    <div className="space-y-6">
      {/* Networking Goals */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Networking Goals</label>
        <div className="grid grid-cols-2 gap-3">
          {NETWORKING_GOAL_OPTIONS.map(option => (
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

      {/* Preferred Event Types */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Preferred Event Types</label>
        <div className="grid grid-cols-2 gap-3">
          {EVENT_TYPE_OPTIONS.map(option => (
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
});

NetworkingPreferencesEditor.displayName = 'NetworkingPreferencesEditor';

export default NetworkingPreferencesEditor;