#!/usr/bin/env tsx
/**
 * Filter Count Verification Script
 * 
 * Verifies the landing page claim of "120+ filters" by counting all filterable values:
 * - Event categories (from event_type table)
 * - Unique tags (from event_tags table)
 * - Unique locations (from events)
 * - Static filter options (format, budget, cost, difficulty, etc.)
 * 
 * Usage: npx tsx scripts/verify-filter-count.ts
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin access
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Static filter options (hardcoded in the application)
const STATIC_FILTERS = {
  format: ['all', 'virtual', 'in-person', 'hybrid'],
  budget: ['all', 'free-only', 'low', 'moderate', 'high', 'unlimited'],
  cost: ['all', 'free', 'paid'],
  difficulty: ['all', 'beginner', 'intermediate', 'advanced'],
  availability: ['all', 'available', 'no-conflicts'],
  popularity: ['all', 'trending', 'high-attendance', 'niche'],
  duration: ['all', 'short', 'medium', 'long', 'multi-day'],
  sortBy: ['default', 'date', 'popularity', 'career-impact', 'title', 'location'],
  sortDirection: ['asc', 'desc'],
  personalFilters: ['myTracked', 'myNetwork', 'recommended'],
  dateRange: ['start', 'end'], // Date range filter (2 inputs)
  searchTerm: ['searchTerm'], // Full-text search (1 input)
};

interface FilterCounts {
  categories: number;
  tags: number;
  locations: number;
  staticFilters: Record<string, number>;
  total: number;
}

async function countCategories(): Promise<number> {
  const { data, error, count } = await supabase
    .from('event_type')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting categories:', error);
    return 0;
  }

  return count || 0;
}

async function countTags(): Promise<number> {
  const { data, error, count } = await supabase
    .from('event_tags')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting tags:', error);
    return 0;
  }

  return count || 0;
}

async function countUniqueLocations(): Promise<number> {
  // Get distinct locations from events
  const { data, error } = await supabase
    .from('events')
    .select('location')
    .not('location', 'is', null)
    .limit(10000);

  if (error) {
    console.error('Error fetching locations:', error);
    return 0;
  }

  // Extract unique locations (city-level)
  const uniqueLocations = new Set<string>();
  (data || []).forEach((event: { location: string | null }) => {
    if (event.location) {
      // Extract city from location string
      const parts = event.location.split(',').map(p => p.trim());
      if (parts[0]) {
        uniqueLocations.add(parts[0].toLowerCase());
      }
    }
  });

  return uniqueLocations.size;
}

function countStaticFilters(): Record<string, number> {
  const counts: Record<string, number> = {};
  let total = 0;

  for (const [key, values] of Object.entries(STATIC_FILTERS)) {
    // Count only non-'all' options as actual filter values
    const filterableValues = values.filter(v => v !== 'all');
    counts[key] = filterableValues.length;
    total += filterableValues.length;
  }

  counts._total = total;
  return counts;
}

async function getTopTags(limit: number = 20): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_tags')
    .select('event_tag')
    .limit(limit);

  if (error) {
    console.error('Error fetching top tags:', error);
    return [];
  }

  return (data || []).map((t: { event_tag: string }) => t.event_tag);
}

async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_type')
    .select('name')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return (data || []).filter((c: { name: string | null }) => c.name).map((c: { name: string }) => c.name);
}

async function getTopLocations(limit: number = 20): Promise<string[]> {
  const { data, error } = await supabase
    .from('events')
    .select('location')
    .not('location', 'is', null)
    .limit(1000);

  if (error) {
    console.error('Error fetching locations:', error);
    return [];
  }

  // Count location occurrences
  const locationCounts = new Map<string, number>();
  (data || []).forEach((event: { location: string | null }) => {
    if (event.location) {
      const parts = event.location.split(',').map(p => p.trim());
      if (parts[0]) {
        const city = parts[0];
        locationCounts.set(city, (locationCounts.get(city) || 0) + 1);
      }
    }
  });

  // Sort by count and return top locations
  return Array.from(locationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([location]) => location);
}

async function main() {
  console.log('🔍 Verifying Filter Count for Landing Page Claim\n');
  console.log('=' .repeat(60));

  // Count dynamic filterable values
  console.log('\n📊 Counting Dynamic Filter Values...\n');

  const categoriesCount = await countCategories();
  console.log(`  📁 Categories (event_type): ${categoriesCount}`);

  const tagsCount = await countTags();
  console.log(`  🏷️  Tags (event_tags): ${tagsCount}`);

  const locationsCount = await countUniqueLocations();
  console.log(`  📍 Unique Locations: ${locationsCount}`);

  // Count static filter options
  console.log('\n📋 Static Filter Options:\n');
  const staticCounts = countStaticFilters();
  
  for (const [key, count] of Object.entries(staticCounts)) {
    if (key !== '_total') {
      const values = STATIC_FILTERS[key as keyof typeof STATIC_FILTERS];
      const filterableValues = values?.filter(v => v !== 'all') || [];
      console.log(`  • ${key}: ${count} (${filterableValues.join(', ')})`);
    }
  }

  // Calculate total
  const dynamicTotal = categoriesCount + tagsCount + locationsCount;
  const staticTotal = staticCounts._total;
  const grandTotal = dynamicTotal + staticTotal;

  console.log('\n' + '=' .repeat(60));
  console.log('\n📈 FILTER COUNT SUMMARY\n');
  console.log(`  Dynamic Filters:`);
  console.log(`    - Categories: ${categoriesCount}`);
  console.log(`    - Tags: ${tagsCount}`);
  console.log(`    - Locations: ${locationsCount}`);
  console.log(`    - Subtotal: ${dynamicTotal}`);
  console.log(`\n  Static Filters: ${staticTotal}`);
  console.log(`\n  ═══════════════════════════════`);
  console.log(`  GRAND TOTAL: ${grandTotal} filterable values`);
  console.log(`  ═══════════════════════════════`);

  // Verify claim
  const claimedCount = 120;
  if (grandTotal >= claimedCount) {
    console.log(`\n  ✅ VERIFIED: Landing page claim of "${claimedCount}+ filters" is ACCURATE`);
    console.log(`     Actual count: ${grandTotal} (${grandTotal - claimedCount} above claim)`);
  } else {
    console.log(`\n  ⚠️  WARNING: Landing page claims "${claimedCount}+ filters"`);
    console.log(`     Actual count: ${grandTotal} (${claimedCount - grandTotal} below claim)`);
    console.log(`\n  📝 Recommended actions:`);
    console.log(`     1. Update landing page to reflect actual count: "${grandTotal}+ filters"`);
    console.log(`     2. OR add more filterable values to reach ${claimedCount}+`);
  }

  // Show sample values
  console.log('\n' + '=' .repeat(60));
  console.log('\n📝 Sample Filter Values\n');

  const categories = await getCategories();
  console.log(`  Categories (${categories.length}):`);
  console.log(`    ${categories.slice(0, 10).join(', ')}${categories.length > 10 ? '...' : ''}`);

  const topTags = await getTopTags(20);
  console.log(`\n  Sample Tags (showing 20 of ${tagsCount}):`);
  console.log(`    ${topTags.join(', ')}`);

  const topLocations = await getTopLocations(15);
  console.log(`\n  Top Locations (showing 15 of ${locationsCount}):`);
  console.log(`    ${topLocations.join(', ')}`);

  console.log('\n' + '=' .repeat(60));
  console.log('\n✨ Verification complete!\n');

  // Return counts for programmatic use
  return {
    categories: categoriesCount,
    tags: tagsCount,
    locations: locationsCount,
    staticFilters: staticCounts,
    total: grandTotal,
  };
}

main().catch(console.error);
