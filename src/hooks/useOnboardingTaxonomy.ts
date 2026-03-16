'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import {
  fetchOnboardingTaxonomy,
  getCurrentSkillSuggestionsForRole,
  getFallbackOnboardingTaxonomy,
  getLearningSkillSuggestionsForRole,
  type OnboardingTaxonomyData,
} from '@/services/onboardingTaxonomyService';

const FALLBACK_TAXONOMY = getFallbackOnboardingTaxonomy();

export function useOnboardingTaxonomy() {
  const { supabase, isReady } = useSupabaseSafe();
  const [taxonomy, setTaxonomy] = useState<OnboardingTaxonomyData>(FALLBACK_TAXONOMY);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !supabase) {
      return;
    }

    let isCancelled = false;

    const loadTaxonomy = async () => {
      setIsLoading(true);

      try {
        const nextTaxonomy = await fetchOnboardingTaxonomy(supabase);

        if (!isCancelled) {
          setTaxonomy(nextTaxonomy);
        }
      } catch (error) {
        if (!isCancelled) {
          setTaxonomy(FALLBACK_TAXONOMY);
        }

        console.warn('[useOnboardingTaxonomy] Falling back to bundled taxonomy', error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadTaxonomy();

    return () => {
      isCancelled = true;
    };
  }, [isReady, supabase]);

  const getCurrentSkillSuggestions = useCallback(
    (role?: string) => getCurrentSkillSuggestionsForRole(taxonomy, role),
    [taxonomy]
  );

  const getLearningSkillSuggestions = useCallback(
    (currentSkills: string[], role?: string) =>
      getLearningSkillSuggestionsForRole(taxonomy, currentSkills, role),
    [taxonomy]
  );

  return {
    skillOptions: taxonomy.skillOptions,
    interestOptions: taxonomy.interestOptions,
    source: taxonomy.source,
    isLoading,
    getCurrentSkillSuggestions,
    getLearningSkillSuggestions,
  };
}
