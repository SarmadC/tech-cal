'use client';

import React, { useMemo } from 'react';
import { CareerProfile } from '@/types/career';
import { 
  SENIORITY_OPTIONS, 
  INDUSTRY_OPTIONS, 
  COMPANY_SIZE_OPTIONS 
} from '../config';

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
      {/* Current Role Input */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground-secondary">
          Current Role
        </label>
        <input
          type="text"
          value={formData.currentRole}
          onChange={(e) => handleFieldChange('currentRole', e.target.value)}
          className="w-full rounded-2xl border border-border-color bg-background-tertiary px-4 py-3 text-base text-foreground-primary shadow-sm transition-all duration-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30"
          placeholder="e.g., Frontend Engineer"
        />
      </div>

      {/* Seniority Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground-secondary">
          Experience Level
        </label>
        <select
          value={formData.seniority}
          onChange={(e) => handleFieldChange('seniority', e.target.value)}
          className="w-full rounded-2xl border border-border-color bg-background-tertiary px-4 py-3 text-base text-foreground-primary shadow-sm transition-all duration-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30"
        >
          {SENIORITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Industry Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground-secondary">
          Industry
        </label>
        <select
          value={formData.industry}
          onChange={(e) => handleFieldChange('industry', e.target.value)}
          className="w-full rounded-2xl border border-border-color bg-background-tertiary px-4 py-3 text-base text-foreground-primary shadow-sm transition-all duration-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30"
        >
          {INDUSTRY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Company Size Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground-secondary">
          Company Size
        </label>
        <select
          value={formData.companySize}
          onChange={(e) => handleFieldChange('companySize', e.target.value)}
          className="w-full rounded-2xl border border-border-color bg-background-tertiary px-4 py-3 text-base text-foreground-primary shadow-sm transition-all duration-200 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30"
        >
          {COMPANY_SIZE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
});

RoleEditor.displayName = 'RoleEditor';

export default RoleEditor;