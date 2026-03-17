'use client';

import React, { useMemo } from 'react';
import { CareerProfile } from '@/types/career';
import SkillsDropdown from '@/components/ui/SkillsDropdown';
import { LinearFormField } from '../components/LinearInputs';
import { useOnboardingTaxonomy } from '@/hooks/useOnboardingTaxonomy';

// Editor prop interface
export interface SkillsEditorProps {
    profile: Partial<CareerProfile>;
    onUpdate: (updates: Partial<CareerProfile>) => void;
}

// Memoized SkillsEditor component
const SkillsEditor: React.FC<SkillsEditorProps> = React.memo(({ profile, onUpdate }) => {
    const { skillOptions, interestOptions } = useOnboardingTaxonomy();

    // Memoized form data to prevent unnecessary re-renders
    const formData = useMemo(() => ({
        primarySkills: profile.primarySkills || [],
        skillsToLearn: profile.skillsToLearn || [],
        interests: profile.interests || []
    }), [profile]);
    const skillSuggestions = useMemo(
        () => skillOptions.map((option) => option.value),
        [skillOptions]
    );
    const interestSuggestions = useMemo(
        () => interestOptions.map((option) => option.value),
        [interestOptions]
    );

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

    return (
        <div className="space-y-6">
            {/* Core Skills */}
            <LinearFormField
                label="Core Skills"
                description="Skills, disciplines, or tools you are proficient in (e.g. React, Product Strategy)"
                className="w-full"
            >
                <SkillsDropdown
                    selectedSkills={formData.primarySkills}
                    onSkillsChange={handlePrimarySkillsChange}
                    placeholder="Select a skill..."
                    suggestions={skillSuggestions}
                    suggestionHeaderLabel="Suggested Skills"
                />
            </LinearFormField>

            {/* Learning Goals */}
            <LinearFormField
                label="Learning Goals"
                description="Skills, disciplines, or tools you are actively learning"
                className="w-full"
            >
                <SkillsDropdown
                    selectedSkills={formData.skillsToLearn}
                    onSkillsChange={handleSkillsToLearnChange}
                    placeholder="Select a learning goal..."
                    suggestions={skillSuggestions}
                    suggestionHeaderLabel="Suggested Skills"
                />
            </LinearFormField>

            {/* Interests */}
            <LinearFormField
                label="Interests"
                description="Broader topics, industries, or domains you are curious about"
                className="w-full"
            >
                <SkillsDropdown
                    selectedSkills={formData.interests}
                    onSkillsChange={handleInterestsChange}
                    placeholder="Select an interest..."
                    suggestions={interestSuggestions}
                    suggestionHeaderLabel="Suggested Interests"
                    entityName="interests"
                />
            </LinearFormField>
        </div>
    );
});

SkillsEditor.displayName = 'SkillsEditor';

export default SkillsEditor;
