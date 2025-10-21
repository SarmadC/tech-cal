'use client';

import React, { useMemo } from 'react';
import { CareerProfile } from '@/types/career';
import SkillsDropdown from '@/components/ui/SkillsDropdown';

// Editor prop interface
export interface SkillsEditorProps {
  profile: Partial<CareerProfile>;
  onUpdate: (updates: Partial<CareerProfile>) => void;
}

// Memoized SkillsEditor component
const SkillsEditor: React.FC<SkillsEditorProps> = React.memo(({ profile, onUpdate }) => {
  // Memoized form data to prevent unnecessary re-renders
  const formData = useMemo(() => ({
    primarySkills: profile.primarySkills || [],
    skillsToLearn: profile.skillsToLearn || [],
    interests: profile.interests || []
  }), [profile]);

  // Skill change handlers
  const handlePrimarySkillsChange = (skills: string[]) => {
    onUpdate({ primarySkills: skills });
  };

  const handleSkillsToLearnChange = (skills: string[]) => {
    onUpdate({ skillsToLearn: skills });
  };

  const handleInterestsChange = (interests: string[]) => {
    onUpdate({ interests });
  };

  // Reusable section card component
  const SectionCard = ({
    title,
    description,
    children
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-3xl border border-border-color bg-background-secondary/70 p-6 shadow-sm">
      <div className="mb-4 space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">{title}</h3>
        <p className="text-sm text-foreground-muted">{description}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Current Skills */}
      <SectionCard
        title="Current Skills"
        description="Select the skills you actively use and feel confident about."
      >
        <SkillsDropdown
          selectedSkills={formData.primarySkills}
          onSkillsChange={handlePrimarySkillsChange}
          placeholder="Search skills you actively use..."
        />
      </SectionCard>

      {/* Skills to Learn */}
      <SectionCard
        title="Skills to Learn"
        description="Choose skills you want to improve or explore next."
      >
        <SkillsDropdown
          selectedSkills={formData.skillsToLearn}
          onSkillsChange={handleSkillsToLearnChange}
          placeholder="Search skills you want to learn..."
        />
      </SectionCard>

      {/* Areas of Interest */}
      <SectionCard
        title="Areas of Interest"
        description="Highlight topics and technologies that inspire you."
      >
        <SkillsDropdown
          selectedSkills={formData.interests}
          onSkillsChange={handleInterestsChange}
          placeholder="Search interests and technologies..."
        />
      </SectionCard>
    </div>
  );
});

SkillsEditor.displayName = 'SkillsEditor';

export default SkillsEditor;