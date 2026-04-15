'use client';

import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, Users, Lightbulb, X, Check } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { EventFeedbackService } from '@/services/eventFeedbackService';
import { EventNetworkingSummaryService } from '@/services/eventNetworkingSummaryService';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { Event } from '@/types';
import { parseOptionalNonNegativeIntegerInput } from './eventFeedbackFormUtils';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';

interface EventFeedbackFormProps {
    event: Event;
    onClose?: () => void;
    onSuccess?: () => void;
    compact?: boolean;
}

const SKILL_SUGGESTIONS = [
    'Technical Skills',
    'Leadership',
    'Communication',
    'Networking',
    'Problem Solving',
    'Industry Knowledge',
    'Project Management',
    'Data Analysis',
];

export function EventFeedbackForm({ event, onClose, onSuccess, compact = false }: EventFeedbackFormProps) {
    const { user } = useAuth();
    const { supabase } = useSupabaseSafe();
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useSnackbar();

    // Form state
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
    const [connectionsMade, setConnectionsMade] = useState<string>('');
    const [linkedinRequestsSent, setLinkedinRequestsSent] = useState<string>('');
    const [skillsGained, setSkillsGained] = useState<string[]>([]);
    const [customSkill, setCustomSkill] = useState('');
    const [feedbackText, setFeedbackText] = useState('');
    const [careerBenefit, setCareerBenefit] = useState('');

    // Fetch existing feedback and outreach summary
    const { data: existingData, isLoading: isFetchingFeedback } = useQuery({
        queryKey: ['event-feedback-form', event.id, user?.id],
        queryFn: async () => {
            if (!user?.id || !supabase) return null;

            const [feedback, networkingSummary] = await Promise.all([
                EventFeedbackService.getFeedbackForEvent(event.id, user.id, supabase),
                EventNetworkingSummaryService.getSummaryForEvent(event.id, user.id, supabase),
            ]);

            return {
                feedback,
                networkingSummary,
            };
        },
        enabled: !!user?.id && !!supabase,
    });

    const existingFeedback = existingData?.feedback ?? null;
    const existingNetworkingSummary = existingData?.networkingSummary ?? null;

    // Populate form with existing feedback
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (existingFeedback) {
            setRating(existingFeedback.actualValueRating || 0);
            setWouldRecommend(existingFeedback.wouldRecommend);
            setConnectionsMade(existingFeedback.connectionsMade?.toString() || '');
            setLinkedinRequestsSent(existingNetworkingSummary?.linkedinRequestsSent?.toString() || '');
            setSkillsGained(existingFeedback.skillsGained || []);
            setFeedbackText(existingFeedback.feedbackText || '');
            setCareerBenefit(existingFeedback.careerBenefit || '');
        } else if (existingNetworkingSummary) {
            setLinkedinRequestsSent(existingNetworkingSummary.linkedinRequestsSent?.toString() || '');
        }
    }, [existingFeedback, existingNetworkingSummary]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async (feedbackData: {
            eventId: string;
            userId: string;
            actualValueRating: number | null;
            wouldRecommend: boolean | null;
            connectionsMade: number | null;
            linkedinRequestsSent: number | null;
            skillsGained: string[] | null;
            feedbackText: string | null;
            careerBenefit: string | null;
            predictedScore: number;
        }) => {
            if (!user?.id || !supabase) throw new Error('Not authenticated');

            const hasFeedbackValues =
                feedbackData.actualValueRating != null ||
                feedbackData.wouldRecommend != null ||
                feedbackData.connectionsMade != null ||
                (feedbackData.skillsGained?.length ?? 0) > 0 ||
                feedbackData.feedbackText != null ||
                feedbackData.careerBenefit != null;

            const [feedback] = await Promise.all([
                existingFeedback
                    ? EventFeedbackService.updateFeedback(
                        existingFeedback.id,
                        {
                            actualValueRating: feedbackData.actualValueRating,
                            wouldRecommend: feedbackData.wouldRecommend,
                            connectionsMade: feedbackData.connectionsMade,
                            skillsGained: feedbackData.skillsGained,
                            feedbackText: feedbackData.feedbackText,
                            careerBenefit: feedbackData.careerBenefit,
                        },
                        supabase
                    )
                    : hasFeedbackValues
                        ? EventFeedbackService.submitFeedback(
                            {
                                eventId: feedbackData.eventId,
                                userId: feedbackData.userId,
                                actualValueRating: feedbackData.actualValueRating,
                                wouldRecommend: feedbackData.wouldRecommend,
                                connectionsMade: feedbackData.connectionsMade,
                                skillsGained: feedbackData.skillsGained,
                                feedbackText: feedbackData.feedbackText,
                                careerBenefit: feedbackData.careerBenefit,
                                predictedScore: feedbackData.predictedScore,
                            },
                            supabase
                        )
                        : Promise.resolve(null),
                feedbackData.linkedinRequestsSent != null || existingNetworkingSummary
                    ? EventNetworkingSummaryService.setLinkedInRequestsSent(
                        {
                            eventId: feedbackData.eventId,
                            userId: feedbackData.userId,
                            linkedinRequestsSent: feedbackData.linkedinRequestsSent,
                            lastOutreachLoggedAt:
                                feedbackData.linkedinRequestsSent == null
                                    ? null
                                    : feedbackData.linkedinRequestsSent === existingNetworkingSummary?.linkedinRequestsSent
                                        ? existingNetworkingSummary?.lastOutreachLoggedAt ?? null
                                        : new Date().toISOString(),
                        },
                        supabase
                    )
                    : Promise.resolve(null),
            ]);

            if (feedback) {
                return feedback;
            }

            return existingFeedback;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-feedback'] });
            queryClient.invalidateQueries({ queryKey: ['event-feedback-form'] });
            queryClient.invalidateQueries({ queryKey: ['event-networking-summary'] });
            showSuccess(existingFeedback ? 'Feedback updated!' : 'Thank you for your feedback!');
            onSuccess?.();
        },
        onError: (error) => {
            console.error('Feedback submission error:', error);
            showError('Failed to submit feedback. Please try again.');
        },
    });

    const handleAddSkill = () => {
        if (customSkill.trim() && !skillsGained.includes(customSkill.trim())) {
            setSkillsGained([...skillsGained, customSkill.trim()]);
            setCustomSkill('');
        }
    };

    const handleToggleSkill = (skill: string) => {
        if (skillsGained.includes(skill)) {
            setSkillsGained(skillsGained.filter(s => s !== skill));
        } else {
            setSkillsGained([...skillsGained, skill]);
        }
    };

    const handleRemoveSkill = (skill: string) => {
        setSkillsGained(skillsGained.filter(s => s !== skill));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const parsedConnections = parseOptionalNonNegativeIntegerInput(
                connectionsMade,
                'real connections'
            );
            const parsedLinkedinRequests = parseOptionalNonNegativeIntegerInput(
                linkedinRequestsSent,
                'LinkedIn requests'
            );

            submitMutation.mutate({
                eventId: event.id,
                userId: user?.id || '',
                actualValueRating: rating || null,
                wouldRecommend,
                connectionsMade: parsedConnections,
                linkedinRequestsSent: parsedLinkedinRequests,
                skillsGained: skillsGained.length > 0 ? skillsGained : null,
                feedbackText: feedbackText || null,
                careerBenefit: careerBenefit || null,
                predictedScore: (event as { careerImpact?: { overall: number } }).careerImpact?.overall || 50,
            });
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Please review your networking feedback');
            return;
        }
    };

    if (isFetchingFeedback) {
        return (
            <div className="flex items-center justify-center py-8">
                <BrandLoadingLogo className="h-6 w-6 text-indigo-500 dark:text-indigo-400" inline size={24} />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={`${compact ? 'space-y-4' : 'space-y-6'}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-medium text-foreground-primary">
                        {existingFeedback ? 'Edit Your Feedback' : 'Rate This Event'}
                    </h3>
                    <p className="text-xs text-foreground-tertiary mt-0.5">
                        Help us improve recommendations
                    </p>
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-background-tertiary text-foreground-tertiary hover:text-foreground-secondary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Star Rating */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">
                    How valuable was this event?
                </label>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transition-transform hover:scale-110"
                        >
                            <Star
                                className={`w-7 h-7 transition-colors ${
                                    star <= (hoverRating || rating)
                                        ? 'text-amber-400'
                                        : 'text-foreground-muted'
                                }`}
                                weight={star <= (hoverRating || rating) ? 'fill' : 'regular'}
                            />
                        </button>
                    ))}
                    {rating > 0 && (
                        <span className="ml-2 text-sm text-foreground-secondary">
                            {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Great' : 'Excellent'}
                        </span>
                    )}
                </div>
            </div>

            {/* Would Recommend */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">
                    Would you recommend this event?
                </label>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setWouldRecommend(true)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border transition-colors ${
                            wouldRecommend === true
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                : 'bg-background-secondary border-border-subtle text-foreground-secondary hover:border-border-default hover:bg-background-tertiary/80'
                        }`}
                    >
                        <ThumbsUp className="w-4 h-4" weight={wouldRecommend === true ? 'fill' : 'regular'} />
                        <span className="text-sm">Yes</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setWouldRecommend(false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border transition-colors ${
                            wouldRecommend === false
                                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                : 'bg-background-secondary border-border-subtle text-foreground-secondary hover:border-border-default hover:bg-background-tertiary/80'
                        }`}
                    >
                        <ThumbsDown className="w-4 h-4" weight={wouldRecommend === false ? 'fill' : 'regular'} />
                        <span className="text-sm">No</span>
                    </button>
                </div>
            </div>

            {/* Connections Made */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Real connections made
                </label>
                <p className="text-xs text-foreground-tertiary">
                    Count confirmed professional connections from this event, including people who only exist on LinkedIn.
                </p>
                <input
                    type="number"
                    min="0"
                    max="100"
                    value={connectionsMade}
                    onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                            setConnectionsMade('');
                            return;
                        }
                        const sanitized = raw.replace(/[^\d]/g, '');
                        setConnectionsMade(sanitized);
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-background-secondary border border-border-subtle rounded-md text-foreground-primary text-sm placeholder:text-foreground-muted focus:outline-none focus:border-indigo-500/50"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    LinkedIn requests sent
                </label>
                <p className="text-xs text-foreground-tertiary">
                    Optional. We use this to remind you to confirm which requests turned into real connections later.
                </p>
                <input
                    type="number"
                    min="0"
                    max="100"
                    value={linkedinRequestsSent}
                    onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                            setLinkedinRequestsSent('');
                            return;
                        }
                        const sanitized = raw.replace(/[^\d]/g, '');
                        setLinkedinRequestsSent(sanitized);
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-background-secondary border border-border-subtle rounded-md text-foreground-primary text-sm placeholder:text-foreground-muted focus:outline-none focus:border-indigo-500/50"
                />
            </div>

            {/* Skills Gained */}
            {!compact && (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Skills developed or learned
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {SKILL_SUGGESTIONS.map((skill) => (
                            <button
                                key={skill}
                                type="button"
                                onClick={() => handleToggleSkill(skill)}
                                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                                    skillsGained.includes(skill)
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                                        : 'bg-background-secondary border-border-subtle text-foreground-tertiary hover:text-foreground-secondary hover:border-border-default'
                                }`}
                            >
                                {skill}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customSkill}
                            onChange={(e) => setCustomSkill(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                            placeholder="Add custom skill..."
                            className="flex-1 px-3 py-2 bg-background-secondary border border-border-subtle rounded-md text-foreground-primary text-sm placeholder:text-foreground-muted focus:outline-none focus:border-indigo-500/50"
                        />
                        <button
                            type="button"
                            onClick={handleAddSkill}
                            disabled={!customSkill.trim()}
                            className="px-3 py-2 bg-background-tertiary text-foreground-secondary rounded-md text-sm hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add
                        </button>
                    </div>
                    {skillsGained.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {skillsGained.map((skill) => (
                                <span
                                    key={skill}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-md"
                                >
                                    {skill}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSkill(skill)}
                                        className="hover:text-indigo-200 dark:hover:text-white"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Additional Comments */}
            {!compact && (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">
                        Additional thoughts (optional)
                    </label>
                    <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Share any thoughts about this event..."
                        rows={3}
                        className="w-full px-3 py-2 bg-background-secondary border border-border-subtle rounded-md text-foreground-primary text-sm placeholder:text-foreground-muted focus:outline-none focus:border-indigo-500/50 resize-none"
                    />
                </div>
            )}

            {/* Career Benefit */}
            {!compact && (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">
                        Career benefit or takeaway
                    </label>
                    <textarea
                        value={careerBenefit}
                        onChange={(e) => setCareerBenefit(e.target.value)}
                        placeholder="How did this event move your career forward?"
                        rows={2}
                        className="w-full px-3 py-2 bg-background-secondary border border-border-subtle rounded-md text-foreground-primary text-sm placeholder:text-foreground-muted focus:outline-none focus:border-indigo-500/50 resize-none"
                    />
                </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 bg-background-tertiary text-foreground-secondary rounded-md text-sm font-medium hover:bg-background-secondary transition-colors"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className={`${onClose ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {submitMutation.isPending ? (
                        <>
                            <BrandLoadingLogo className="h-4 w-4 text-current" inline label={null} size={16} />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4" />
                            <span>{existingFeedback ? 'Update Feedback' : 'Submit Feedback'}</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
