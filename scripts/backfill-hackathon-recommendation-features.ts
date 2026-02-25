/**
 * Backfill Hackathon Recommendation Features
 *
 * Populates persisted recommendation fields for existing hackathons:
 * - tags (from text extraction + enrichment)
 * - recommendation_features (structured signals: tracks, sponsors, difficulty, etc.)
 * - feature_version
 *
 * Merges rich extraction data from extract-data JSON files when available.
 *
 * Usage:
 *   npx tsx scripts/backfill-hackathon-recommendation-features.ts
 *
 * Env:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - EXTRACTION_DATA_PATH (default: extract-data-2026-02-25.json)
 * - BACKFILL_MAX_HACKATHONS (default: 0 = unlimited)
 * - BACKFILL_BATCH_SIZE (default: 50)
 * - BACKFILL_DRY_RUN (set to '1' to skip writes)
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  HACKATHON_FEATURE_VERSION,
  buildRecommendationFeatures,
  extractFeatureSignalsFromPayload,
  mergeStoredAndExtractedTags,
} from '../src/services/hackathonFeatureService';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXTRACTION_PATH = process.env.EXTRACTION_DATA_PATH || 'extract-data-2026-02-25.json';
const MAX_HACKATHONS = Number.parseInt(process.env.BACKFILL_MAX_HACKATHONS || '0', 10);
const BATCH_SIZE = Number.parseInt(process.env.BACKFILL_BATCH_SIZE || '50', 10);
const DRY_RUN = process.env.BACKFILL_DRY_RUN === '1';
const FEATURE_VERSION = HACKATHON_FEATURE_VERSION;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type HackathonRow = {
  id: string;
  title: string;
  description: string | null;
  is_virtual: boolean;
  max_team_size: number | null;
  prize_pool: string | null;
  prize_description: string | null;
  tags: string[] | null;
  recommendation_features: Record<string, unknown> | null;
  feature_version: number | null;
};

interface ExtractedHackathon {
  title: string;
  description?: string;
  tags?: string[];
  tracks?: { value: string }[];
  sponsors?: { value: string }[];
  requirements?: { value: string }[];
  prizes?: { value: string }[];
  resources?: unknown;
  metadata?: unknown;
  schedule?: unknown[];
  mentors?: unknown[];
}

function loadExtractionData(): Map<string, ExtractedHackathon> {
  const fullPath = path.resolve(EXTRACTION_PATH);
  if (!fs.existsSync(fullPath)) {
    console.log(`No extraction data file found at ${fullPath}, proceeding with text-only extraction.`);
    return new Map();
  }

  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  const hackathons: ExtractedHackathon[] = raw.hackathons || [];
  const map = new Map<string, ExtractedHackathon>();

  for (const h of hackathons) {
    // Index by normalized title for fuzzy matching
    const key = h.title.toLowerCase().trim().replace(/\s+/g, ' ');
    map.set(key, h);
  }

  console.log(`Loaded ${map.size} hackathons from extraction data.`);
  return map;
}

function findExtractedMatch(title: string, extractionMap: Map<string, ExtractedHackathon>): ExtractedHackathon | null {
  const normalized = title.toLowerCase().trim().replace(/\s+/g, ' ');

  // Exact match
  if (extractionMap.has(normalized)) return extractionMap.get(normalized)!;

  // Substring match — DB title might have extra info like year
  for (const [key, value] of extractionMap) {
    if (normalized.includes(key) || key.includes(normalized)) return value;
  }

  // Word overlap match — at least 70% of words must match
  const titleWords = normalized.split(/\s+/).filter(w => w.length > 2);
  for (const [key, value] of extractionMap) {
    const keyWords = key.split(/\s+/).filter(w => w.length > 2);
    const overlap = titleWords.filter(w => keyWords.includes(w)).length;
    const ratio = overlap / Math.min(titleWords.length, keyWords.length);
    if (ratio >= 0.7 && overlap >= 2) return value;
  }

  return null;
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, sortObjectKeys(nested)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

function hasSameFeatures(
  current: Record<string, unknown> | null | undefined,
  expected: Record<string, unknown>
): boolean {
  if (!current) return false;
  return stableJson(current) === stableJson(expected);
}

function hasSameTags(current: string[] | null | undefined, expected: string[]): boolean {
  const a = [...new Set((current || []).map(tag => tag.trim().toLowerCase()))].sort();
  const b = [...new Set(expected.map(tag => tag.trim().toLowerCase()))].sort();
  if (a.length !== b.length) return false;
  return a.every((tag, idx) => tag === b[idx]);
}

async function runBackfill() {
  console.log('Starting hackathon recommendation feature backfill (v2 — rich signals)');
  console.log(`Configuration: max=${MAX_HACKATHONS || 'unlimited'}, batch=${BATCH_SIZE}, dryRun=${DRY_RUN}, featureVersion=${FEATURE_VERSION}`);

  const extractionMap = loadExtractionData();

  const { data, error } = await supabase
    .from('hackathons')
    .select('id, title, description, is_virtual, max_team_size, prize_pool, prize_description, tags, recommendation_features, feature_version')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load hackathons. Ensure migration has been applied first.', error);
    process.exit(1);
  }

  const rows = (data || []) as HackathonRow[];
  const scoped = MAX_HACKATHONS > 0 ? rows.slice(0, MAX_HACKATHONS) : rows;

  if (scoped.length === 0) {
    console.log('No hackathons found to process.');
    return;
  }

  let scanned = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;
  let enriched = 0;

  for (let i = 0; i < scoped.length; i += BATCH_SIZE) {
    const batch = scoped.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      scanned += 1;

      // Try to find rich extraction data for this hackathon
      const extracted = findExtractedMatch(row.title, extractionMap);
      const tracks = extracted?.tracks?.map(t => t.value).filter(Boolean) || [];
      const sponsors = extracted?.sponsors?.map(s => s.value).filter(Boolean) || [];
      const requirements = extracted?.requirements?.map(r => r.value).filter(Boolean) || [];
      const prizeCategories = extracted?.prizes?.map(p => p.value).filter(Boolean) || [];

      if (extracted) enriched++;

      const extractedSignals = extracted
        ? extractFeatureSignalsFromPayload(extracted as unknown as Record<string, unknown>)
        : null;

      const tags = mergeStoredAndExtractedTags(
        row.tags || [],
        row.title,
        row.description,
        extractedSignals?.sourceTags || extracted?.tags || []
      );
      const recommendationFeatures = buildRecommendationFeatures({
        title: row.title,
        description: row.description,
        isVirtual: row.is_virtual,
        tags,
        minTeamSize: extractedSignals?.minTeamSize || null,
        maxTeamSize: row.max_team_size,
        soloAllowed: extractedSignals?.soloAllowed || null,
        prizePool: row.prize_pool || row.prize_description,
        expectedParticipants: extractedSignals?.expectedParticipants || null,
        durationHours: extractedSignals?.durationHours || null,
        eligibilityText: extractedSignals?.eligibilityText || null,
        tracks: extractedSignals?.tracks.length ? extractedSignals.tracks : tracks,
        sponsors: extractedSignals?.sponsors.length ? extractedSignals.sponsors : sponsors,
        requirements: extractedSignals?.requirements.length ? extractedSignals.requirements : requirements,
        prizeCategories: extractedSignals?.prizeCategories.length ? extractedSignals.prizeCategories : prizeCategories,
        providedApis: extractedSignals?.providedApis || [],
      });

      const needsUpdate =
        row.feature_version !== FEATURE_VERSION ||
        !hasSameTags(row.tags, tags) ||
        !hasSameFeatures(row.recommendation_features, recommendationFeatures as unknown as Record<string, unknown>);

      if (!needsUpdate) {
        unchanged += 1;
        continue;
      }

      if (DRY_RUN) {
        updated += 1;
        const signals = [
          `tags=${tags.length}`,
          tracks.length > 0 ? `tracks=${tracks.length}` : null,
          sponsors.length > 0 ? `sponsors=${sponsors.length}` : null,
          recommendationFeatures.difficulty !== 'unknown' ? `difficulty=${recommendationFeatures.difficulty}` : null,
          recommendationFeatures.themes.length > 0 ? `themes=${recommendationFeatures.themes.join(',')}` : null,
          recommendationFeatures.requiredTech.length > 0 ? `tech=${recommendationFeatures.requiredTech.slice(0, 3).join(',')}` : null,
        ].filter(Boolean).join(', ');
        console.log(`[dry-run] would update "${row.title}": ${signals}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('hackathons')
        .update({
          tags,
          recommendation_features: recommendationFeatures,
          feature_version: FEATURE_VERSION,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (updateError) {
        failed += 1;
        console.error(`Failed updating ${row.id}:`, updateError.message);
        continue;
      }

      updated += 1;
    }

    console.log(`Progress: ${Math.min(i + BATCH_SIZE, scoped.length)}/${scoped.length}`);
  }

  console.log('\nBackfill complete');
  console.log(`Scanned: ${scanned}`);
  console.log(`Updated: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Failed: ${failed}`);
  console.log(`Enriched with extraction data: ${enriched}/${scanned}`);
}

runBackfill().catch((error) => {
  console.error('Unhandled backfill error:', error);
  process.exit(1);
});
