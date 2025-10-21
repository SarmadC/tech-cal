'use client';

import React, { useMemo } from 'react';
import { CareerProfile, CareerEventType } from '@/types/career';
import { EVENT_TYPE_OPTIONS } from '../config';

// Editor prop interface
export interface TeamPreferencesEditorProps {
  profile: Partial<CareerProfile>;
  onUpdate: (updates: Partial<CareerProfile>) => void;
}

// Memoized TeamPreferencesEditor component
const TeamPreferencesEditor: React.FC<TeamPreferencesEditorProps> = React.memo(({ profile, onUpdate }) => {
  // Memoized form data to prevent unnecessary re-renders
  const formData = useMemo(() => ({
    preferredEventTypes: profile.preferredEventTypes || []
  }), [profile]);

  // Event type toggle handler
  const handleToggle = (value: CareerEventType) => {
    const exists = formData.preferredEventTypes.includes(value);
    const updated = exists
      ? formData.preferredEventTypes.filter(type => type !== value)
      : [...formData.preferredEventTypes, value];

    onUpdate({ preferredEventTypes: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Preferred Event Types</label>
        <div className="grid grid-cols-2 gap-3">
          {EVENT_TYPE_OPTIONS.map(option => (
            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.preferredEventTypes.includes(option.value as CareerEventType)}
                onChange={() => handleToggle(option.value as CareerEventType)}
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

TeamPreferencesEditor.displayName = 'TeamPreferencesEditor';

export default TeamPreferencesEditor;