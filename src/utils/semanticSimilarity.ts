// Basic semantic similarity matching for events
// This is a lightweight implementation that can be enhanced later with ML

import { Event } from '@/types';
import { capScore } from './commonUtils';

export interface SemanticMatch {
  similarity: number;
  matchedTerms: string[];
  reason: string;
}

export class SemanticSimilarityService {
  // Tech skill synonyms and related terms
  private static readonly SKILL_SYNONYMS: Record<string, string[]> = {
    'javascript': ['js', 'node', 'nodejs', 'react', 'vue', 'angular', 'frontend'],
    'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy', 'data science'],
    'react': ['jsx', 'frontend', 'javascript', 'next.js', 'nextjs'],
    'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural networks'],
    'blockchain': ['crypto', 'cryptocurrency', 'web3', 'ethereum', 'bitcoin', 'defi'],
    'cloud': ['aws', 'azure', 'gcp', 'google cloud', 'devops', 'kubernetes', 'docker'],
    'mobile': ['ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
    'backend': ['api', 'server', 'database', 'microservices', 'node.js'],
    'data': ['analytics', 'sql', 'database', 'big data', 'data science', 'visualization'],
    'security': ['cybersecurity', 'infosec', 'penetration testing', 'encryption']
  };

  // Event type relationships
  private static readonly EVENT_TYPE_RELATIONSHIPS: Record<string, string[]> = {
    'conference': ['summit', 'convention', 'symposium'],
    'workshop': ['training', 'bootcamp', 'masterclass', 'hands-on'],
    'networking': ['meetup', 'social', 'community', 'connect'],
    'webinar': ['online', 'virtual', 'livestream', 'presentation']
  };

  /**
   * Calculate semantic similarity between user interests and event
   */
  static calculateEventSimilarity(
    event: Event,
    userSkills: string[],
    userInterests: string[]
  ): SemanticMatch {
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    const allUserTerms = [...userSkills, ...userInterests].map(term => term.toLowerCase());
    
    let totalSimilarity = 0;
    const matchedTerms: string[] = [];
    const reasons: string[] = [];

    // Direct term matching (cap at 3 matches to prevent score inflation)
    let directMatches = 0;
    for (const term of allUserTerms) {
      if (eventText.includes(term) && directMatches < 3) {
        totalSimilarity += 0.3;
        matchedTerms.push(term);
        reasons.push(`matches ${term}`);
        directMatches++;
      }
    }

    // Synonym and related term matching (cap at 2 synonym matches)
    let synonymMatches = 0;
    for (const userTerm of allUserTerms) {
      const synonyms = this.SKILL_SYNONYMS[userTerm] || [];
      for (const synonym of synonyms) {
        if (eventText.includes(synonym) && !matchedTerms.includes(synonym) && synonymMatches < 2) {
          totalSimilarity += 0.2;
          matchedTerms.push(synonym);
          reasons.push(`related to ${userTerm} (${synonym})`);
          synonymMatches++;
        }
      }
    }

    // Event type relationship matching
    const eventTypeName = event.category?.name?.toLowerCase() || '';
    for (const userTerm of allUserTerms) {
      const relatedTypes = this.EVENT_TYPE_RELATIONSHIPS[userTerm] || [];
      for (const relatedType of relatedTypes) {
        if (eventTypeName.includes(relatedType) && !matchedTerms.includes(relatedType)) {
          totalSimilarity += 0.15;
          matchedTerms.push(relatedType);
          reasons.push(`${relatedType} event type`);
        }
      }
    }

    // Industry context matching
    const industryTerms = this.extractIndustryContext(eventText);
    const userIndustryTerms = this.extractIndustryContext(allUserTerms.join(' '));
    const industryOverlap = industryTerms.filter(term => userIndustryTerms.includes(term));
    
    if (industryOverlap.length > 0) {
      totalSimilarity += industryOverlap.length * 0.1;
      matchedTerms.push(...industryOverlap);
      reasons.push(`industry relevance (${industryOverlap.join(', ')})`);
    }

    // Cap similarity at 1.0
    const finalSimilarity = capScore(totalSimilarity);
    
    return {
      similarity: finalSimilarity,
      matchedTerms: [...new Set(matchedTerms)], // Remove duplicates
      reason: reasons.length > 0 ? reasons[0] : 'general relevance'
    };
  }

  /**
   * Find similar events based on content
   */
  static findSimilarEvents(
    targetEvent: Event,
    allEvents: Event[],
    limit: number = 5
  ): Array<Event & { similarity: number }> {
    const targetText = `${targetEvent.title} ${targetEvent.description || ''}`.toLowerCase();
    const targetWords = this.extractKeywords(targetText);

    const similarEvents = allEvents
      .filter(event => event.id !== targetEvent.id)
      .map(event => {
        const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
        const eventWords = this.extractKeywords(eventText);
        
        // Calculate Jaccard similarity
        const intersection = targetWords.filter(word => eventWords.includes(word));
        const union = [...new Set([...targetWords, ...eventWords])];
        const similarity = intersection.length / union.length;

        return {
          ...event,
          similarity
        };
      })
      .filter(event => event.similarity > 0.1) // Minimum similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarEvents;
  }

  /**
   * Extract industry context terms
   */
  private static extractIndustryContext(text: string): string[] {
    const industryTerms = [
      'fintech', 'healthtech', 'edtech', 'proptech', 'cleantech',
      'enterprise', 'startup', 'saas', 'b2b', 'b2c',
      'ecommerce', 'marketplace', 'platform', 'infrastructure'
    ];

    return industryTerms.filter(term => text.includes(term));
  }

  /**
   * Extract meaningful keywords from text
   */
  private static extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);

    return text
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, '').toLowerCase())
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 20); // Limit to top 20 keywords
  }
}
