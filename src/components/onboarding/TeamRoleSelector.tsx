'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { TeamRole, TEAM_ROLE_CONFIGS, SkillTag } from '@/types/career';
import { CheckCircle, Star, Users, Code, Palette, Database, Gear, Lightbulb } from '@phosphor-icons/react';
import { ErrorAlert, Card, Badge, getRoleColor } from './shared/OnboardingUI';
import { clsx } from 'clsx';
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
    const [selectedRole, setSelectedRole] = useState<TeamRole | null>(
        currentRole as TeamRole || null
    );
    const [error, setError] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

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
            setSelectedRole(role);
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

    return (
        <div className={twMerge("space-y-6", className)}>
            {error && (
                <ErrorAlert
                    error={error}
                    onDismiss={() => setError(null)}
                />
            )}

            {/* Role Suggestions */}
            {roleSuggestions.length > 0 && (
                <div className="bg-blue-500/5 dark:bg-blue-500/10 rounded-xl p-4 border border-blue-500/20 dark:border-blue-500/30">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-blue-600 dark:text-blue-200 flex items-center">
                            <Star size={16} className="mr-2 text-blue-500 dark:text-blue-400" weight="fill" />
                            Suggested Roles based on your skills
                        </h4>
                        <button
                            onClick={() => setShowSuggestions(!showSuggestions)}
                            className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                            type="button"
                        >
                            {showSuggestions ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {showSuggestions && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            {roleSuggestions.map(suggestion => (
                                <button
                                    key={suggestion.role}
                                    onClick={() => handleRoleSelect(suggestion.role)}
                                    className="w-full text-left p-3 rounded-lg border border-blue-500/20 dark:border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors group"
                                    type="button"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            {getRoleIcon(suggestion.role)}
                                            <span className="font-medium text-sm text-blue-700 dark:text-blue-100 group-hover:text-blue-800 dark:group-hover:text-white">{TEAM_ROLE_CONFIGS[suggestion.role].title}</span>
                                        </div>
                                        <div className="text-[10px] text-blue-600 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/20 dark:border-blue-500/30">
                                            {suggestion.score} matches
                                        </div>
                                    </div>
                                    <p className="text-xs text-blue-600/70 dark:text-blue-300/70 mt-1 pl-7">{suggestion.reason}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(TEAM_ROLE_CONFIGS).map(config => (
                    <Card
                        key={config.role}
                        onClick={() => handleRoleSelect(config.role)}
                        selected={selectedRole === config.role}
                        className={clsx(
                            "text-left p-4 transition-all group h-full flex flex-col",
                            selectedRole === config.role
                                ? "bg-secondary ring-1 ring-border"
                                : "bg-secondary/30 hover:bg-secondary/50 border-border/50"
                        )}
                    >
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="p-2 rounded-lg bg-secondary/50 border border-border/50">
                                {getRoleIcon(config.role)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-foreground group-hover:text-foreground truncate">
                                    {config.title}
                                </h4>
                            </div>
                            {selectedRole === config.role && (
                                <CheckCircle size={20} className="text-foreground flex-shrink-0" weight="fill" />
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 mb-4 line-clamp-2 flex-grow">
                            {config.description}
                        </p>

                        <div className="mt-auto">
                            <h5 className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wide opacity-70">Key Responsibilities</h5>
                            <div className="flex flex-wrap gap-1.5">
                                {config.responsibilities.slice(0, 2).map((responsibility, index) => (
                                    <Badge key={index} size="sm" variant="default" className="bg-secondary/50 border-border/50 text-xs text-muted-foreground">
                                        {responsibility}
                                    </Badge>
                                ))}
                                {config.responsibilities.length > 2 && (
                                    <Badge size="sm" variant="default" className="bg-secondary/50 border-border/50 text-xs text-muted-foreground/70">
                                        +{config.responsibilities.length - 2}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Selected Role Summary */}
            {selectedRole && TEAM_ROLE_CONFIGS[selectedRole] && (
                <div className="bg-secondary/30 rounded-xl p-5 border border-border/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
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