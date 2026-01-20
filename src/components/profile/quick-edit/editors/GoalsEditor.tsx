'use client';

import React, { useMemo } from 'react';
import { CareerProfile } from '@/types/career';
import { GOAL_OPTIONS } from '../config';
import { LinearFormField, LinearSelect, LinearCheckboxGroup } from '../components/LinearInputs';

// Editor prop interface
export interface GoalsEditorProps {
    profile: Partial<CareerProfile>;
    onUpdate: (updates: Partial<CareerProfile>) => void;
}

// Memoized GoalsEditor component
const GoalsEditor: React.FC<GoalsEditorProps> = React.memo(({ profile, onUpdate }) => {
    // Memoized form data to prevent unnecessary re-renders
    const formData = useMemo(() => ({
        careerGoals: profile.careerGoals || [],
        timeframe: profile.timeframe || 'immediate'
    }), [profile]);

    // Timeframe change handler
    const handleTimeframeChange = (timeframe: CareerProfile['timeframe']) => {
        onUpdate({
            careerGoals: formData.careerGoals,
            timeframe
        });
    };

    return (
        <div className="space-y-6">
            {/* Career Goals */}
            <LinearCheckboxGroup
                label="Career Goals"
                description="Select all that apply to your current path"
                options={[...GOAL_OPTIONS]}
                selectedValues={formData.careerGoals}
                onChange={(values) => {
                    const updatedGoals = values as CareerProfile['careerGoals'];
                    onUpdate({
                        careerGoals: updatedGoals,
                        timeframe: formData.timeframe
                    });
                }}
                columns={2}
            />

            {/* Timeline */}
            <LinearFormField label="Timeline">
                <LinearSelect
                    value={formData.timeframe}
                    onChange={(e) => handleTimeframeChange(e.target.value as CareerProfile['timeframe'])}
                >
                    <option value="immediate">Immediately (0-6 months)</option>
                    <option value="short-term">Short-term (6-18 months)</option>
                    <option value="medium-term">Medium-term (1-3 years)</option>
                    <option value="long-term">Long-term (3+ years)</option>
                </LinearSelect>
            </LinearFormField>
        </div>
    );
});

GoalsEditor.displayName = 'GoalsEditor';

export default GoalsEditor;