// Enhanced category relationships for better recommendations
import { Event, EventType, AppProfile } from '@/types';
import { extractCareerProfile } from './profileTypeGuards';
import { TIME_CONSTANTS } from '@/config/analyticsConfig';

export interface CategoryRelationship {
  category: string;
  relatedCategories: string[];
  similarity: number;
  reason: string;
}

export interface CategoryInsight {
  category: string;
  popularity: number;
  trendingScore: number;
  userAffinityScore: number;
}

export class CategoryRelationshipService {
  // Category hierarchy and relationships
  private static readonly CATEGORY_HIERARCHY: Record<string, {
    parent?: string;
    children?: string[];
    related: string[];
    skills: string[];
  }> = {
    'frontend': {
      related: ['javascript', 'react', 'ui/ux', 'web development'],
      skills: ['html', 'css', 'javascript', 'react', 'vue', 'angular'],
      children: ['react', 'vue', 'angular']
    },
    'backend': {
      related: ['api', 'database', 'server', 'cloud'],
      skills: ['node.js', 'python', 'java', 'go', 'rust'],
      children: ['api development', 'database design', 'microservices']
    },
    'ai/ml': {
      related: ['data science', 'machine learning', 'deep learning', 'nlp'],
      skills: ['python', 'tensorflow', 'pytorch', 'scikit-learn'],
      children: ['machine learning', 'deep learning', 'computer vision', 'nlp']
    },
    'data science': {
      related: ['ai/ml', 'analytics', 'visualization', 'statistics'],
      skills: ['python', 'r', 'sql', 'pandas', 'numpy'],
      children: ['data analysis', 'data visualization', 'business intelligence']
    },
    'devops': {
      related: ['cloud', 'infrastructure', 'automation', 'monitoring'],
      skills: ['docker', 'kubernetes', 'aws', 'terraform', 'jenkins'],
      children: ['containerization', 'orchestration', 'ci/cd']
    },
    'mobile': {
      related: ['ios', 'android', 'cross-platform', 'app development'],
      skills: ['swift', 'kotlin', 'react native', 'flutter'],
      children: ['ios development', 'android development', 'hybrid apps']
    },
    'blockchain': {
      related: ['web3', 'cryptocurrency', 'defi', 'smart contracts'],
      skills: ['solidity', 'ethereum', 'bitcoin', 'cryptography'],
      children: ['smart contracts', 'defi', 'nft']
    },
    'cybersecurity': {
      related: ['security', 'penetration testing', 'encryption', 'compliance'],
      skills: ['ethical hacking', 'cryptography', 'network security'],
      children: ['penetration testing', 'security analysis', 'compliance']
    }
  };

  // Event type to category mapping
  private static readonly EVENT_TYPE_CATEGORIES: Record<string, string[]> = {
    'conference': ['all categories'],
    'workshop': ['hands-on skills'],
    'summit': ['strategic', 'leadership'],
    'meetup': ['networking', 'community'],
    'webinar': ['educational', 'informational'],
    'hackathon': ['practical', 'competitive'],
    'bootcamp': ['intensive learning'],
    'networking': ['community building']
  };

  /**
   * Find related categories for better recommendations
   */
  static getRelatedCategories(
    userCategories: string[],
    allCategories: EventType[]
  ): CategoryRelationship[] {
    const relationships: CategoryRelationship[] = [];

    for (const userCategory of userCategories) {
      const categoryData = this.CATEGORY_HIERARCHY[userCategory.toLowerCase()];
      if (!categoryData) continue;

      // Find matching categories in the database
      const relatedCategoryObjects = allCategories.filter(cat => 
        categoryData.related.some(related => 
          cat.name.toLowerCase().includes(related.toLowerCase()) ||
          related.toLowerCase().includes(cat.name.toLowerCase())
        )
      );

      for (const relatedCat of relatedCategoryObjects) {
        const similarity = this.calculateCategorySimilarity(userCategory, relatedCat.name);
        const reason = this.getCategoryRelationshipReason(userCategory, relatedCat.name);

        relationships.push({
          category: relatedCat.name,
          relatedCategories: categoryData.related,
          similarity,
          reason
        });
      }
    }

    return relationships
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5 related categories
  }

  /**
   * Analyze category popularity and trends
   */
  static analyzeCategoryInsights(
    events: Event[],
    userInteractions?: Array<{ eventId: string; categoryId: string }>
  ): CategoryInsight[] {
    const categoryStats: Record<string, {
      eventCount: number;
      recentEvents: number;
      userInteractions: number;
    }> = {};

    // Count events per category
    for (const event of events) {
      const categoryId = event.eventTypeId;
      if (!categoryStats[categoryId]) {
        categoryStats[categoryId] = { eventCount: 0, recentEvents: 0, userInteractions: 0 };
      }
      
      categoryStats[categoryId].eventCount++;
      
      // Count recent events (last 30 days)
      const eventDate = new Date(event.startTime);
      const thirtyDaysAgo = new Date(Date.now() - TIME_CONSTANTS.MONTH);
      if (eventDate > thirtyDaysAgo) {
        categoryStats[categoryId].recentEvents++;
      }
    }

    // Count user interactions per category
    if (userInteractions) {
      for (const interaction of userInteractions) {
        if (categoryStats[interaction.categoryId]) {
          categoryStats[interaction.categoryId].userInteractions++;
        }
      }
    }

    // Calculate insights
    const totalEvents = events.length;
    const maxRecentEvents = Math.max(...Object.values(categoryStats).map(s => s.recentEvents));

    return Object.entries(categoryStats).map(([categoryId, stats]) => ({
      category: categoryId,
      popularity: stats.eventCount / totalEvents,
      trendingScore: maxRecentEvents > 0 ? stats.recentEvents / maxRecentEvents : 0,
      userAffinityScore: stats.userInteractions / Math.max(stats.eventCount, 1)
    }));
  }

  /**
   * Get category recommendations based on user behavior
   */
  static getCategoryRecommendations(
    userProfile: unknown,
    categoryInsights: CategoryInsight[],
    limit: number = 3
  ): string[] {
    const careerProfile = extractCareerProfile(userProfile as AppProfile | null);
    if (!careerProfile) return [];

    const userInterests = careerProfile.interests || [];
    const skillsToLearn = careerProfile.skillsToLearn || [];

    // Score categories based on user profile and insights
    const scoredCategories = categoryInsights.map(insight => {
      let score = insight.popularity * 0.3 + insight.trendingScore * 0.4;

      // Boost categories related to user interests
      const isRelated = [...userInterests, ...skillsToLearn].some(interest =>
        this.isCategoryRelatedToInterest(insight.category, interest)
      );

      if (isRelated) score += 0.3;

      return {
        category: insight.category,
        score
      };
    });

    return scoredCategories
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.category);
  }

  // Helper methods
  private static calculateCategorySimilarity(category1: string, category2: string): number {
    const cat1Lower = category1.toLowerCase();
    const cat2Lower = category2.toLowerCase();
    
    // Direct match
    if (cat1Lower === cat2Lower) return 1.0;
    
    // Check if one contains the other
    if (cat1Lower.includes(cat2Lower) || cat2Lower.includes(cat1Lower)) return 0.8;
    
    // Check hierarchy relationships
    const cat1Data = this.CATEGORY_HIERARCHY[cat1Lower];
    if (cat1Data?.related.some(related => cat2Lower.includes(related.toLowerCase()))) {
      return 0.6;
    }
    
    return 0.2; // Default low similarity
  }

  private static getCategoryRelationshipReason(category1: string, category2: string): string {
    const cat1Data = this.CATEGORY_HIERARCHY[category1.toLowerCase()];
    if (!cat1Data) return 'Related field';

    const relatedMatch = cat1Data.related.find(related => 
      category2.toLowerCase().includes(related.toLowerCase())
    );

    if (relatedMatch) {
      return `Both involve ${relatedMatch}`;
    }

    return 'Complementary skills';
  }

  private static isCategoryRelatedToInterest(category: string, interest: string): boolean {
    const categoryLower = category.toLowerCase();
    const interestLower = interest.toLowerCase();
    
    // Direct match
    if (categoryLower.includes(interestLower) || interestLower.includes(categoryLower)) {
      return true;
    }
    
    // Check through hierarchy
    const interestData = this.CATEGORY_HIERARCHY[interestLower];
    if (interestData?.related.some(related => categoryLower.includes(related.toLowerCase()))) {
      return true;
    }
    
    return false;
  }
}
