'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { TeamRole, TEAM_ROLE_CONFIGS, SkillTag } from '@/types/career';
import { CheckCircle, Star, Users, Code, Palette, Database, Gear, Lightbulb } from '@phosphor-icons/react';
import { ErrorAlert } from './shared/OnboardingUI';
import { twMerge } from 'tailwind-merge';

interface TeamRoleSelectorProps {
    onRoleChange: (role: TeamRole) => void;
    currentRole: string;
    skills: SkillTag[];
    className?: string;
}

export const TeamRoleSelector: React.FC<TeamRoleSelectorProps> = ({
    onRoleChange,
    currentRole,
    skills,
    className = ''
}) => {
    const [error, setError] = useState<string | null>(null);
    const selectedRole = (currentRole as TeamRole) || null;

    // Calculate role suggestions based on skills
    const roleSuggestions = useMemo(() => {
        if (!Array.isArray(skills) || skills.length === 0) return [];

        const skillNames = skills.map(s => s.skill.toLowerCase());
        const suggestions: { role: TeamRole; score: number; reason: string }[] = [];

        Object.values(TEAM_ROLE_CONFIGS).forEach(config => {
            if (config.role === 'flexible') return;

            let score = 0;
            const matchedSkills: string[] = [];

            // Check required skills
            config.requiredSkills?.forEach(requiredSkill => {
                if (skillNames.some(skill => skill.includes(requiredSkill.toLowerCase()))) {
                    score += 3;
                    matchedSkills.push(requiredSkill);
                }
            });

            // Check recommended skills
            config.recommendedSkills?.forEach(recommendedSkill => {
                if (skillNames.some(skill => skill.includes(recommendedSkill.toLowerCase()))) {
                    score += 1;
                    matchedSkills.push(recommendedSkill);
                }
            });

            if (score > 0) {
                suggestions.push({
                    role: config.role,
                    score,
                    reason: `Matches: ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? '...' : ''}`
                });
            }
        });

        return suggestions.sort((a, b) => b.score - a.score).slice(0, 3);
    }, [skills]);

    const handleRoleSelect = useCallback((role: TeamRole) => {
        try {
            onRoleChange(role);
            setError(null);
        } catch (_error) {
            setError('Failed to select role');
        }
    }, [onRoleChange]);

    const getRoleIcon = useCallback((role: TeamRole) => {
        const iconMap: Record<TeamRole, React.ReactNode> = {
            'frontend-developer': <Code size={20} className="text-blue-400" />,
            'backend-developer': <Database size={20} className="text-emerald-400" />,
            'full-stack-developer': <Gear size={20} className="text-purple-400" />,
            'mobile-developer': <Code size={20} className="text-indigo-400" />,
            'ui-ux-designer': <Palette size={20} className="text-pink-400" />,
            'product-manager': <Users size={20} className="text-orange-400" />,
            'data-scientist': <Database size={20} className="text-teal-400" />,
            'devops-engineer': <Gear size={20} className="text-gray-400" />,
            'qa-engineer': <CheckCircle size={20} className="text-yellow-400" />,
            'tech-lead': <Star size={20} className="text-amber-400" />,
            'project-manager': <Users size={20} className="text-cyan-400" />,
            'flexible': <Lightbulb size={20} className="text-violet-400" />
        };
        return iconMap[role] || <Users size={20} className="text-muted-foreground" />;
    }, []);


    if (!Array.isArray(skills)) {
        return (
            <ErrorAlert
                error="Invalid skills array provided"
                className={className}
            />
        );
    }

    const suggestedRole = roleSuggestions[0]?.role ?? selectedRole ?? 'flexible';
    const suggestedConfig = TEAM_ROLE_CONFIGS[suggestedRole];
    const suggestedReason = roleSuggestions[0]?.reason ?? 'Recommended based on the skills you have shared so far.';
    const isSuggestedRoleSelected = selectedRole === suggestedRole;

    return (
        <div className={twMerge("space-y-4", className)}>
            {error && (
                <ErrorAlert
                    error={error}
                    onDismiss={() => setError(null)}
                />
            )}

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                    <Star size={14} className="text-blue-400" weight="fill" />
                    <h4 className="text-sm font-medium text-blue-100">Suggested role</h4>
                </div>

                <button
                    type="button"
                    onClick={() => handleRoleSelect(suggestedRole)}
                    className="w-full rounded-lg border border-blue-500/20 bg-white/[0.03] p-4 text-left transition-colors hover:border-blue-500/30 hover:bg-white/[0.05]"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2">
                                {getRoleIcon(suggestedRole)}
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-foreground">{suggestedConfig.title}</div>
                                <p className="text-xs leading-5 text-muted-foreground/82">{suggestedConfig.description}</p>
                                <p className="text-xs leading-5 text-blue-200/80">{suggestedReason}</p>
                            </div>
                        </div>

                        {isSuggestedRoleSelected ? (
                            <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
                                Selected
                            </span>
                        ) : (
                            <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-200">
                                Use suggestion
                            </span>
                        )}
                    </div>
                </button>
            </div>

            {/* Selected Role Summary */}
            {selectedRole && TEAM_ROLE_CONFIGS[selectedRole] && (
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-5">
                    <h4 className="font-medium text-foreground mb-3 flex items-center text-sm">
                        <CheckCircle size={16} className="mr-2 text-emerald-400" weight="fill" />
                        Selection Summary
                    </h4>
                    <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                            {getRoleIcon(selectedRole)}
                        </div>
                        <div>
                            <p className="font-medium text-foreground text-base">{TEAM_ROLE_CONFIGS[selectedRole].title}</p>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-2xl">{TEAM_ROLE_CONFIGS[selectedRole].description}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
