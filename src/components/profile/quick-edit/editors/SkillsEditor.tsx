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
                description="Stack and tools you are proficient in (e.g. React, Python)"
                className="w-full"
            >
                <SkillsDropdown
                    selectedSkills={formData.primarySkills}
                    onSkillsChange={handlePrimarySkillsChange}
                    placeholder="Add skills..."
                    suggestions={skillSuggestions}
                    suggestionHeaderLabel="Suggested Skills"
                />
            </LinearFormField>

            {/* Learning Goals */}
            <LinearFormField
                label="Learning Goals"
                description="Technologies or skills you are actively learning"
                className="w-full"
            >
                <SkillsDropdown
                    selectedSkills={formData.skillsToLearn}
                    onSkillsChange={handleSkillsToLearnChange}
                    placeholder="Add learning goals..."
                    suggestions={skillSuggestions}
                    suggestionHeaderLabel="Suggested Skills"
                />
            </LinearFormField>

            {/* Interests */}
            <LinearFormField
                label="Interests"
                description="Broader topics or industries you are curious about"
                className="w-full"
            >
                <SkillsDropdown
                    selectedSkills={formData.interests}
                    onSkillsChange={handleInterestsChange}
                    placeholder="Add interests..."
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
