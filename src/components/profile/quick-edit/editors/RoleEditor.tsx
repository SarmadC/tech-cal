'use client';

import React, { useMemo } from 'react';
import { CareerProfile } from '@/types/career';
import {
    SENIORITY_OPTIONS,
    INDUSTRY_OPTIONS,
    COMPANY_SIZE_OPTIONS
} from '../config';
import { LinearFormField, LinearSelect } from '../components/LinearInputs';
import { RoleAutocomplete } from '@/components/onboarding/RoleAutocomplete';

// Editor prop interface
export interface RoleEditorProps {
    profile: Partial<CareerProfile>;
    onUpdate: (updates: Partial<CareerProfile>) => void;
}

// Memoized RoleEditor component
const RoleEditor: React.FC<RoleEditorProps> = React.memo(({ profile, onUpdate }) => {
    // Memoized form data to prevent unnecessary re-renders
    const formData = useMemo(() => ({
        currentRole: profile.currentRole || '',
        seniority: profile.seniority || '',
        industry: profile.industry || '',
        companySize: profile.companySize || ''
    }), [profile]);

    // Field change handler with direct update
    const handleFieldChange = (field: keyof typeof formData, value: string) => {
        onUpdate({ [field]: value });
    };

    return (
        <div className="space-y-6 sm:space-y-5">
            {/* Current Role - Autocomplete Dropdown */}
            <LinearFormField
                label="Current Role"
                description="Choose your role from the browser dropdown"
                required
            >
                <RoleAutocomplete
                    id="current-role"
                    label="Current Role"
                    hint="Choose your role from the list"
                    value={formData.currentRole}
                    onChange={(value) => handleFieldChange('currentRole', value)}
                    required
                    className="w-full"
                    hideLabel
                    hideHint
                />
            </LinearFormField>

            <div className="space-y-4 sm:space-y-4 pt-2">
                {/* Seniority Dropdown */}
                <LinearFormField label="Experience Level" required>
                    <LinearSelect
                        value={formData.seniority}
                        onChange={(e) => handleFieldChange('seniority', e.target.value)}
                    >
                        <option value="" disabled>Select level...</option>
                        {SENIORITY_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </LinearSelect>
                </LinearFormField>

                {/* Industry Dropdown */}
                <LinearFormField label="Industry">
                    <LinearSelect
                        value={formData.industry}
                        onChange={(e) => handleFieldChange('industry', e.target.value)}
                    >
                        <option value="" disabled>Select industry...</option>
                        {INDUSTRY_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </LinearSelect>
                </LinearFormField>

                {/* Company Size Dropdown */}
                <LinearFormField label="Company Size">
                    <LinearSelect
                        value={formData.companySize}
                        onChange={(e) => handleFieldChange('companySize', e.target.value)}
                    >
                        <option value="" disabled>Select size...</option>
                        {COMPANY_SIZE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </LinearSelect>
                </LinearFormField>
            </div>
        </div>
    );
});

RoleEditor.displayName = 'RoleEditor';

export default RoleEditor;
