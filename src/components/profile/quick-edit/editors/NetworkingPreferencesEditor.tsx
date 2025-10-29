'use client';

import React, { useMemo } from 'react';
import { CareerProfile, NetworkingGoal, CareerEventType } from '@/types/career';
import { 
  NETWORKING_GOAL_OPTIONS, 
  EVENT_TYPE_OPTIONS 
} from '../config';
import { CheckboxGroup } from '@/components/onboarding/shared/FormField';

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

  return (
    <div className="space-y-6">
      {/* Networking Goals */}
      <CheckboxGroup
        label="Networking Goals (select all that apply)"
        options={NETWORKING_GOAL_OPTIONS}
        selectedValues={formData.networkingGoals}
        onChange={(values) => {
          const networkingGoals = values as NetworkingGoal[];
          onUpdate({ networkingGoals });
        }}
        columns={1}
      />

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

NetworkingPreferencesEditor.displayName = 'NetworkingPreferencesEditor';

export default NetworkingPreferencesEditor;