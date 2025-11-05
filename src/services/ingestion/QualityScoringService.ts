/**
 * Quality Scoring Service
 * 
 * Computes ingestion quality scores per event with component breakdown.
 * Implements auto-publish thresholds and moderation queue logic.
 */

import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';
import type { EventSourceRecord } from '@/types/ingestion';
import {
    QUALITY_COMPONENT_WEIGHTS,
    QUALITY_THRESHOLDS,
    METADATA_COMPLETENESS_SCORING,
    SPEAKER_VERIFICATION_SCORING,
    HISTORICAL_PERFORMANCE_SCORING,
} from '@/config/ingestionQuality';
import { IngestionSourceService } from './IngestionSourceService';
import * as Sentry from '@sentry/nextjs';

export interface QualityScore {
    overall: number; // 0-100
    components: {
        sourceTrust: number;
        metadataCompleteness: number;
        speakerVerification: number;
        historicalPerformance: number;
    };
    confidence: number; // 0-100
    shouldAutoPublish: boolean;
    requiresModeration: boolean;
    reasonCodes: string[];
}

export class QualityScoringService {
    /**
     * Calculate quality score for an event
     */
    static async calculateQualityScore(
        record: EventSourceRecord,
        sourceId: string,
        supabaseClient: SupabaseClientType
    ): Promise<QualityScore> {
        try {
            // Get source trust score
            const source = await IngestionSourceService.getSourceById(sourceId, supabaseClient);
            const sourceTrust = source?.trust_score || 50.0;

            // Calculate component scores
            const metadataCompleteness = this.calculateMetadataCompleteness(record);
            const speakerVerification = await this.calculateSpeakerVerification(record);
            const historicalPerformance = await this.calculateHistoricalPerformance(
                sourceId,
                supabaseClient
            );

            // Weighted overall score
            const overall = Math.round(
                (sourceTrust * QUALITY_COMPONENT_WEIGHTS.SOURCE_TRUST) / 100 +
                (metadataCompleteness * QUALITY_COMPONENT_WEIGHTS.METADATA_COMPLETENESS) / 100 +
                (speakerVerification * QUALITY_COMPONENT_WEIGHTS.SPEAKER_VERIFICATION) / 100 +
                (historicalPerformance * QUALITY_COMPONENT_WEIGHTS.HISTORICAL_PERFORMANCE) / 100
            );

            // Calculate confidence (based on component reliability)
            const confidence = this.calculateConfidence({
                sourceTrust,
                metadataCompleteness,
                speakerVerification,
                historicalPerformance,
            });

            // Determine reason codes
            const reasonCodes = this.generateReasonCodes({
                overall,
                sourceTrust,
                metadataCompleteness,
                speakerVerification,
                historicalPerformance,
                source: source,
            });

            // Determine auto-publish and moderation requirements
            const isAllowlisted = await IngestionSourceService.isAllowlisted(
                sourceId,
                supabaseClient
            );
            const shouldAutoPublish = this.shouldAutoPublish(overall, isAllowlisted);
            const requiresModeration = this.requiresModeration(overall, isAllowlisted);

            return {
                overall,
                components: {
                    sourceTrust,
                    metadataCompleteness,
                    speakerVerification,
                    historicalPerformance,
                },
                confidence,
                shouldAutoPublish,
                requiresModeration,
                reasonCodes,
            };
        } catch (error) {
            console.error('Error calculating quality score:', error);
            Sentry.captureException(error, {
                extra: { function: 'calculateQualityScore', sourceId },
            });

            // Return default low score on error
            return {
                overall: 30,
                components: {
                    sourceTrust: 30,
                    metadataCompleteness: 30,
                    speakerVerification: 0,
                    historicalPerformance: 30,
                },
                confidence: 0,
                shouldAutoPublish: false,
                requiresModeration: true,
                reasonCodes: ['calculation_error'],
            };
        }
    }

    /**
     * Calculate metadata completeness score (0-100)
     */
    private static calculateMetadataCompleteness(record: EventSourceRecord): number {
        let score = 0;

        // Required fields (20% total)
        const requiredFields = METADATA_COMPLETENESS_SCORING.REQUIRED_FIELDS;
        for (const field of requiredFields) {
            const hasField = this.hasRequiredField(record, field);
            if (hasField) {
                score += METADATA_COMPLETENESS_SCORING.REQUIRED_FIELD_WEIGHT;
            }
        }

        // Optional fields (10% total)
        const optionalFields = METADATA_COMPLETENESS_SCORING.OPTIONAL_FIELDS;
        for (const field of optionalFields) {
            const hasField = this.hasOptionalField(record, field);
            if (hasField) {
                score += METADATA_COMPLETENESS_SCORING.OPTIONAL_FIELD_WEIGHT;
            }
        }

        return Math.min(100, Math.round(score));
    }

    /**
     * Check if required field is present and valid
     */
    private static hasRequiredField(record: EventSourceRecord, field: string): boolean {
        switch (field) {
            case 'title':
                return !!(record.title && record.title.trim().length >= 3);
            case 'start_time':
                return !!record.startTime && !isNaN(new Date(record.startTime).getTime());
            case 'location':
                return !!(record.location && record.location.trim().length > 0);
            case 'organizer':
                return !!(record.organizer && record.organizer !== 'Unknown');
            default:
                return false;
        }
    }

    /**
     * Check if optional field is present
     */
    private static hasOptionalField(record: EventSourceRecord, field: string): boolean {
        switch (field) {
            case 'description':
                return !!(record.description && record.description.trim().length >= 50);
            case 'end_time':
                return !!record.endTime;
            case 'registration_url':
                return !!record.registrationUrl;
            case 'event_image_url':
                return !!record.eventImageUrl;
            case 'speaker_lineup':
                return !!(record.speakerLineup && record.speakerLineup.length > 0);
            case 'tags':
                return !!(record.tags && record.tags.length > 0);
            case 'price_range':
                return !!record.priceRange;
            default:
                return false;
        }
    }

    /**
     * Calculate speaker verification score (0-15%)
     * Verifies LinkedIn/GitHub URLs from speaker_lineup
     * Gated behind config flag and limited to prevent job stalls
     */
    private static async calculateSpeakerVerification(
        record: EventSourceRecord
    ): Promise<number> {
        // Skip verification if disabled via config
        if (!SPEAKER_VERIFICATION_SCORING.ENABLED) {
            return 0;
        }

        if (!record.speakerLineup || record.speakerLineup.length === 0) {
            return 0;
        }

        // Limit verification to first N speakers to prevent stalls
        const speakersToVerify = record.speakerLineup.slice(
            0,
            SPEAKER_VERIFICATION_SCORING.MAX_SPEAKERS_TO_VERIFY
        );

        let verifiedCount = 0;

        // Use Promise.race to enforce overall timeout
        const verificationPromises = speakersToVerify.map(async (speaker) => {
            let isVerified = false;

            // Check LinkedIn URL
            if (speaker.linkedinUrl) {
                isVerified = await this.verifyUrl(speaker.linkedinUrl);
            }

            // Check GitHub URL
            if (!isVerified && speaker.githubUrl) {
                isVerified = await this.verifyUrl(speaker.githubUrl);
            }

            return isVerified;
        });

        try {
            // Race against overall timeout
            const results = await Promise.race([
                Promise.all(verificationPromises),
                new Promise<boolean[]>((resolve) =>
                    setTimeout(() => resolve([]), SPEAKER_VERIFICATION_SCORING.BATCH_TIMEOUT_MS)
                ),
            ]);

            verifiedCount = results.filter(Boolean).length;
        } catch (error) {
            // If verification fails, just continue without bonus
            console.debug('Speaker verification failed:', error);
            return 0;
        }

        // +5% per verified speaker, max 15%
        const bonus = verifiedCount * SPEAKER_VERIFICATION_SCORING.VERIFIED_PROFILE_BONUS;
        return Math.min(SPEAKER_VERIFICATION_SCORING.MAX_BONUS, bonus);
    }

    /**
     * Verify URL exists (lightweight HEAD request)
     */
    private static async verifyUrl(url: string): Promise<boolean> {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                signal: AbortSignal.timeout(SPEAKER_VERIFICATION_SCORING.VERIFICATION_TIMEOUT_MS),
                redirect: 'follow',
            });

            return response.ok || response.status === 301 || response.status === 302;
        } catch {
            return false;
        }
    }

    /**
     * Calculate historical performance score (0-15%)
     */
    private static async calculateHistoricalPerformance(
        sourceId: string,
        supabaseClient: SupabaseClientType
    ): Promise<number> {
        try {
            // Get most recent trust score data
            const { data, error } = await supabaseClient
                .from('source_trust_scores')
                .select('avg_quality_score, duplicate_rate, error_rate, events_approved, events_rejected')
                .eq('source_id', sourceId)
                .order('calculated_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                // No historical data - return baseline
                return HISTORICAL_PERFORMANCE_SCORING.APPROVAL_RATE_WEIGHT / 2;
            }

            let score = HISTORICAL_PERFORMANCE_SCORING.APPROVAL_RATE_WEIGHT;

            // Calculate approval rate bonus
            const totalEvents = (data.events_approved || 0) + (data.events_rejected || 0);
            if (totalEvents > 0) {
                const approvalRate = (data.events_approved || 0) / totalEvents;
                score = approvalRate * HISTORICAL_PERFORMANCE_SCORING.APPROVAL_RATE_WEIGHT;
            }

            // Apply duplicate rate penalty
            const duplicatePenalty = (data.duplicate_rate || 0) / 100 * HISTORICAL_PERFORMANCE_SCORING.DUPLICATE_RATE_PENALTY;
            score -= duplicatePenalty;

            // Apply error rate penalty
            const errorPenalty = (data.error_rate || 0) / 100 * HISTORICAL_PERFORMANCE_SCORING.ERROR_RATE_PENALTY;
            score -= errorPenalty;

            return Math.max(0, Math.min(15, Math.round(score)));
        } catch (error) {
            console.error('Error calculating historical performance:', error);
            return 0;
        }
    }

    /**
     * Calculate confidence in the quality score
     */
    private static calculateConfidence(components: {
        sourceTrust: number;
        metadataCompleteness: number;
        speakerVerification: number;
        historicalPerformance: number;
    }): number {
        // Confidence based on data availability and reliability
        let confidence = 50; // Base confidence

        // Higher confidence if we have good metadata
        if (components.metadataCompleteness >= 70) {
            confidence += 20;
        } else if (components.metadataCompleteness >= 50) {
            confidence += 10;
        }

        // Higher confidence if source has good trust score
        if (components.sourceTrust >= 70) {
            confidence += 20;
        } else if (components.sourceTrust >= 50) {
            confidence += 10;
        }

        // Higher confidence if we have historical data
        if (components.historicalPerformance > 0) {
            confidence += 10;
        }

        return Math.min(100, confidence);
    }

    /**
     * Generate reason codes for moderation
     */
    private static generateReasonCodes(params: {
        overall: number;
        sourceTrust: number;
        metadataCompleteness: number;
        speakerVerification: number;
        historicalPerformance: number;
        source: Awaited<ReturnType<typeof IngestionSourceService.getSourceById>> | null;
    }): string[] {
        const codes: string[] = [];

        if (params.overall < QUALITY_THRESHOLDS.MODERATION_REQUIRED) {
            codes.push('low_quality_score');
        }

        if (params.metadataCompleteness < 50) {
            codes.push('missing_required_fields');
        }

        if (params.sourceTrust < 40) {
            codes.push('source_low_trust');
        }

        if (params.historicalPerformance < 5) {
            codes.push('historical_performance_poor');
        }

        if (params.speakerVerification === 0 && params.source?.source_type === 'RSS') {
            // Only flag if we expected speaker verification but got none
            codes.push('speaker_verification_failed');
        }

        return codes;
    }

    /**
     * Determine if event should auto-publish
     */
    private static shouldAutoPublish(
        overallScore: number,
        isAllowlisted: boolean
    ): boolean {
        if (isAllowlisted) {
            // Allowlisted sources have lower threshold (50 instead of 75)
            return overallScore >= 50;
        }

        return overallScore >= QUALITY_THRESHOLDS.AUTO_PUBLISH;
    }

    /**
     * Determine if event requires mandatory moderation
     */
    private static requiresModeration(
        overallScore: number,
        isAllowlisted: boolean
    ): boolean {
        if (isAllowlisted && overallScore >= 50) {
            // Allowlisted sources skip moderation if score >= 50
            return false;
        }

        return overallScore < QUALITY_THRESHOLDS.MODERATION_REQUIRED;
    }

    /**
     * Store quality score in event record
     */
    static async storeQualityScore(
        eventId: string,
        qualityScore: QualityScore,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            // Get existing provenance first
            const { data: existingEvent } = await supabaseClient
                .from('events')
                .select('ingestion_provenance')
                .eq('id', eventId)
                .single();

            const existingProvenance = (existingEvent?.ingestion_provenance as Record<string, unknown>) || {};

            // Update with quality score and components
            const updatedProvenance: Record<string, unknown> = {
                ...existingProvenance,
                quality_components: qualityScore.components,
            };

            await supabaseClient
                .from('events')
                .update({
                    ingestion_quality_score: qualityScore.overall,
                    ingestion_confidence: qualityScore.confidence,
                    ingestion_provenance: updatedProvenance as unknown as Database['public']['Tables']['events']['Update']['ingestion_provenance'],
                })
                .eq('id', eventId);
        } catch (error) {
            console.error('Error storing quality score:', error);
            // Don't throw - non-critical
        }
    }

    /**
     * Queue event for moderation if required
     */
    static async queueForModeration(
        sourceEventId: string,
        eventId: string,
        qualityScore: QualityScore,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            await supabaseClient
                .from('event_moderation_queue')
                .insert({
                    source_event_id: sourceEventId,
                    event_id: eventId,
                    ingestion_quality_score: qualityScore.overall,
                    reason_codes: qualityScore.reasonCodes,
                    status: 'pending',
                });
        } catch (error) {
            console.error('Error queueing for moderation:', error);
            // Don't throw - non-critical
        }
    }
}

