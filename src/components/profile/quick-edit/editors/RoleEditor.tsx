'use client';

import React, { useMemo } from 'react';
import { CareerProfile } from '@/types/career';
import { 
  SENIORITY_OPTIONS, 
  INDUSTRY_OPTIONS, 
  COMPANY_SIZE_OPTIONS 
} from '../config';
import { FormField, Select } from '@/components/onboarding/shared/FormField';
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
    <div className="space-y-6">
      {/* Current Role - Autocomplete Dropdown */}
      <div className="space-y-1">
        <RoleAutocomplete
          id="current-role"
          label="Current Role"
          hint="Search for your role or browse by category"
          value={formData.currentRole}
          onChange={(value) => handleFieldChange('currentRole', value)}
          required
        />
      </div>

      {/* Seniority Dropdown */}
      <FormField label="Experience Level" required>
        <Select
          value={formData.seniority}
          onChange={(e) => handleFieldChange('seniority', e.target.value)}
        >
          {SENIORITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Industry Dropdown */}
      <FormField label="Industry">
        <Select
          value={formData.industry}
          onChange={(e) => handleFieldChange('industry', e.target.value)}
        >
          {INDUSTRY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Company Size Dropdown */}
      <FormField label="Company Size">
        <Select
          value={formData.companySize}
          onChange={(e) => handleFieldChange('companySize', e.target.value)}
        >
          {COMPANY_SIZE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>
    </div>
  );
});

RoleEditor.displayName = 'RoleEditor';

export default RoleEditor;