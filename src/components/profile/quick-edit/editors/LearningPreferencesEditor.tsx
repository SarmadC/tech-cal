'use client';

import React, { useMemo } from 'react';
import { CareerProfile, LearningStyle, AvailableTime, BudgetRange } from '@/types/career';
import {
    LEARNING_STYLE_OPTIONS,
    AVAILABLE_TIME_OPTIONS,
    BUDGET_OPTIONS
} from '../config';
import { LinearFormField, LinearSelect, LinearCheckboxGroup } from '../components/LinearInputs';

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
            <LinearCheckboxGroup
                label="Learning Styles"
                description="Select all that fit your preference"
                options={LEARNING_STYLE_OPTIONS}
                selectedValues={formData.learningStyle}
                onChange={(values) => {
                    const learningStyle = values as LearningStyle[];
                    onUpdate({ learningStyle });
                }}
                columns={2}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Available Time */}
                <LinearFormField label="Available Time">
                    <LinearSelect
                        value={formData.availableTime}
                        onChange={(e) => handleSelectChange('availableTime', e.target.value)}
                    >
                        {AVAILABLE_TIME_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </LinearSelect>
                </LinearFormField>

                {/* Budget Range */}
                <LinearFormField label="Budget Range">
                    <LinearSelect
                        value={formData.budget}
                        onChange={(e) => handleSelectChange('budget', e.target.value)}
                    >
                        {BUDGET_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </LinearSelect>
                </LinearFormField>
            </div>
        </div>
    );
});

LearningPreferencesEditor.displayName = 'LearningPreferencesEditor';

export default LearningPreferencesEditor;