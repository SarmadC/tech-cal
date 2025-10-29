'use client';

import React, { useMemo } from 'react';
import { CareerProfile, CareerEventType } from '@/types/career';
import { EVENT_TYPE_OPTIONS } from '../config';
import { CheckboxGroup } from '@/components/onboarding/shared/FormField';

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

  return (
    <div className="space-y-6">
      {/* Preferred Event Types */}
      <CheckboxGroup
        label="Preferred Event Types"
        options={EVENT_TYPE_OPTIONS}
        selectedValues={formData.preferredEventTypes}
        onChange={(values) => {
          const preferredEventTypes = values as CareerEventType[];
          onUpdate({ preferredEventTypes });
        }}
        columns={2}
      />
    </div>
  );
});

TeamPreferencesEditor.displayName = 'TeamPreferencesEditor';

export default TeamPreferencesEditor;