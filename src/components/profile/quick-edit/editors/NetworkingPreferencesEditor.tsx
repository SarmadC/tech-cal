'use client';

import React, { useMemo } from 'react';
import { CareerProfile, NetworkingGoal, CareerEventType } from '@/types/career';
import {
    NETWORKING_GOAL_OPTIONS,
    EVENT_TYPE_OPTIONS
} from '../config';
import { LinearCheckboxGroup } from '../components/LinearInputs';

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
            <LinearCheckboxGroup
                label="Networking Goals"
                description="Who you want to meet"
                options={NETWORKING_GOAL_OPTIONS}
                selectedValues={formData.networkingGoals}
                onChange={(values) => {
                    const networkingGoals = values as NetworkingGoal[];
                    onUpdate({ networkingGoals });
                }}
                columns={1}
            />

            {/* Preferred Event Types */}
            <LinearCheckboxGroup
                label="Preferred Event Types"
                description="Formats you are interested in"
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