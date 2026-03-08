/**
 * Organizer Enrichment Service
 * 
 * Auto-creates missing organizers from ingestion and links to existing ones
 * by domain/name fuzzy matching. Enriches from external APIs.
 */

import type { SupabaseClientType } from '@/types';
import { TIMEOUT_CONFIG } from '@/config/ingestionConstants';
import * as Sentry from '@sentry/nextjs';
import { getLogoSources } from '@/utils/logoUtils';
import {
    extractCanonicalDomain,
    humanizeOrganizerNameFromDomain,
    isPlaceholderOrganizerName,
    normalizeHostname,
} from '@/utils/ingestion/sourceCleanup';
import { OgImageExtractorService } from './OgImageExtractorService';

export interface OrganizerInput {
    name?: string;
    domain?: string;
    websiteUrl?: string;
    sourceUrl?: string; // Event source URL for og:image extraction
}

export class OrganizerEnrichmentService {
    /**
     * Find existing organizer or create new one
     * Uses fuzzy matching on domain/name to avoid duplicates
     */
    static async findOrCreateOrganizer(
        input: OrganizerInput,
        supabaseClient: SupabaseClientType
    ): Promise<string | null> {
        try {
            // Extract domain from website URL if not provided
            let domain = input.domain ? normalizeHostname(input.domain) : undefined;
            if (!domain && input.websiteUrl) {
                domain = this.extractDomain(input.websiteUrl);
            }

            const normalizedName = input.name?.trim();
            const organizerName = isPlaceholderOrganizerName(normalizedName)
                ? (domain ? humanizeOrganizerNameFromDomain(domain) : undefined)
                : normalizedName;

            if (!organizerName && !domain) {
                return null;
            }

            // Try to find existing organizer by domain (most reliable)
            if (domain) {
                const { data: existingByDomain } = await supabaseClient
                    .from('organizers')
                    .select('id')
                    .eq('domain', domain)
                    .single();

                if (existingByDomain) {
                    return existingByDomain.id;
                }

                // Try fuzzy match on domain using pg_trgm (if similarity is high)
                // Using LIKE for now - can be enhanced with similarity() if needed
                const domainPattern = `%${domain}%`;
                const { data: fuzzyMatch } = await supabaseClient
                    .from('organizers')
                    .select('id, domain')
                    .ilike('domain', domainPattern)
                    .limit(1)
                    .single();

                if (fuzzyMatch) {
                    return fuzzyMatch.id;
                }
            }

            // Try to find by name (fuzzy match)
            if (organizerName) {
                // Exact match first
                const { data: exactMatch } = await supabaseClient
                    .from('organizers')
                    .select('id')
                    .eq('name', organizerName)
                    .single();

                if (exactMatch) {
                    return exactMatch.id;
                }

                // Fuzzy match on name using pg_trgm
                // Note: This requires the GIN index we created in the migration
                const namePattern = `%${organizerName}%`;
                const { data: nameFuzzy } = await supabaseClient
                    .from('organizers')
                    .select('id, name')
                    .ilike('name', namePattern)
                    .limit(1)
                    .single();

                if (nameFuzzy) {
                    return nameFuzzy.id;
                }
            }

            if (!organizerName) {
                return null;
            }

            // Create new organizer - try og:image first, then domain services
            const canonicalWebsiteUrl = input.websiteUrl || (domain ? `https://${domain}` : null);
            const logoUrl = await this.fetchLogo(input.sourceUrl || canonicalWebsiteUrl || undefined, domain);

            const { data: newOrganizer, error: createError } = await supabaseClient
                .from('organizers')
                .insert({
                    name: organizerName,
                    domain: domain || null,
                    website_url: canonicalWebsiteUrl,
                    logo_url: logoUrl,
                    auto_discovered: true,
                })
                .select('id')
                .single();

            if (createError || !newOrganizer) {
                console.error('Failed to create organizer:', createError);
                return null;
            }

            return newOrganizer.id;
        } catch (error) {
            console.error('Error finding/creating organizer:', error);
            Sentry.captureException(error, {
                extra: { function: 'findOrCreateOrganizer', input },
            });
            return null;
        }
    }

    /**
     * Extract domain from URL
     */
    private static extractDomain(url: string): string | undefined {
        return extractCanonicalDomain(url);
    }

    /**
     * Fetch logo with og:image as primary source, falling back to domain services
     */
    private static async fetchLogo(
        sourceUrl: string | undefined,
        domain: string | undefined
    ): Promise<string | null> {
        // Try og:image from source URL first (primary source)
        if (sourceUrl) {
            const ogImage = await OgImageExtractorService.extractOgImage(sourceUrl);
            if (ogImage) {
                console.debug(`Got og:image for organizer from ${sourceUrl}`);
                return ogImage;
            }
        }

        // Fall back to domain-based services
        if (domain) {
            return this.fetchLogoFromDomainServices(domain);
        }

        return null;
    }

    /**
     * Fetch logo from multiple sources with fallback chain (graceful degradation)
     * Tries Supabase storage, special logos, Google favicon, Icon Horse, and Clearbit
     */
    private static async fetchLogoFromDomainServices(domain: string): Promise<string | null> {
        // Get all logo sources in priority order
        const logoSources = getLogoSources(domain);
        
        // Try each source in sequence
        for (const logoUrl of logoSources) {
            try {
                // Verify the logo exists with a HEAD request (quick check)
                const response = await fetch(logoUrl, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(TIMEOUT_CONFIG.ORGANIZER_LOOKUP_MS),
                });

                if (response.ok) {
                    return logoUrl;
                }
            } catch (error) {
                // Continue to next source on error
                console.debug('Failed to fetch logo from', logoUrl + ':', error);
                continue;
            }
        }

        // All sources failed
        console.debug('Failed to fetch logo for', domain, 'from all sources');
        return null;
    }
}

