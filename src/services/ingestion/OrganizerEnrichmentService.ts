/**
 * Organizer Enrichment Service
 * 
 * Auto-creates missing organizers from ingestion and links to existing ones
 * by domain/name fuzzy matching. Enriches from external APIs.
 */

import type { SupabaseClientType } from '@/types';
import { TIMEOUT_CONFIG } from '@/config/ingestionConstants';
import * as Sentry from '@sentry/nextjs';

export interface OrganizerInput {
    name: string;
    domain?: string;
    websiteUrl?: string;
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
            let domain = input.domain;
            if (!domain && input.websiteUrl) {
                domain = this.extractDomain(input.websiteUrl);
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
            if (input.name && input.name !== 'Unknown') {
                // Exact match first
                const { data: exactMatch } = await supabaseClient
                    .from('organizers')
                    .select('id')
                    .eq('name', input.name)
                    .single();

                if (exactMatch) {
                    return exactMatch.id;
                }

                // Fuzzy match on name using pg_trgm
                // Note: This requires the GIN index we created in the migration
                const namePattern = `%${input.name}%`;
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

            // Create new organizer
            const logoUrl = domain ? await this.fetchLogoFromClearbit(domain) : null;

            const { data: newOrganizer, error: createError } = await supabaseClient
                .from('organizers')
                .insert({
                    name: input.name,
                    domain: domain || null,
                    website_url: input.websiteUrl || null,
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
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            return domain;
        } catch {
            return undefined;
        }
    }

    /**
     * Fetch logo from Clearbit API (graceful degradation)
     */
    private static async fetchLogoFromClearbit(domain: string): Promise<string | null> {
        try {
            // Clearbit logo API (already in next.config.ts allowlist)
            const logoUrl = `https://logo.clearbit.com/${domain}`;
            
            // Verify the logo exists with a HEAD request (quick check)
            const response = await fetch(logoUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(TIMEOUT_CONFIG.ORGANIZER_LOOKUP_MS),
            });

            if (response.ok) {
                return logoUrl;
            }

            return null;
        } catch (error) {
            // Graceful degradation - continue without logo
            console.debug(`Failed to fetch logo for ${domain}:`, error);
            return null;
        }
    }
}


