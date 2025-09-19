// Skill progression understanding for better recommendations
import { Event, AppProfile } from '@/types';
import { extractCareerProfile } from './profileTypeGuards';

export interface SkillLevel {
  skill: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  targetLevel: 'intermediate' | 'advanced' | 'expert';
  progressScore: number; // 0-1 indicating how close to target level
}

export interface SkillProgression {
  primarySkills: SkillLevel[];
  learningPath: string[];
  recommendedNextSteps: string[];
  estimatedTimeToGoals: number; // weeks
}

export class SkillProgressionService {
  // Skill progression pathways
  private static readonly SKILL_PATHWAYS: Record<string, string[]> = {
    'javascript': ['html/css', 'javascript', 'react', 'node.js', 'typescript', 'next.js'],
    'python': ['python basics', 'data structures', 'pandas', 'machine learning', 'deep learning'],
    'data-science': ['sql', 'python', 'pandas', 'visualization', 'statistics', 'machine learning'],
    'frontend': ['html/css', 'javascript', 'react', 'typescript', 'testing', 'performance'],
    'backend': ['programming basics', 'databases', 'apis', 'cloud', 'microservices', 'architecture'],
    'ai-ml': ['python', 'statistics', 'machine learning', 'deep learning', 'nlp', 'computer vision'],
    'devops': ['linux', 'docker', 'kubernetes', 'ci/cd', 'monitoring', 'infrastructure as code']
  };

  // Event difficulty indicators
  private static readonly DIFFICULTY_KEYWORDS = {
    beginner: ['intro', 'introduction', 'basics', 'fundamentals', '101', 'getting started', 'beginner'],
    intermediate: ['practical', 'hands-on', 'intermediate', 'building', 'developing', 'implementing'],
    advanced: ['advanced', 'expert', 'deep dive', 'architecture', 'optimization', 'scaling', 'enterprise'],
    expert: ['research', 'cutting-edge', 'state-of-the-art', 'novel', 'breakthrough', 'innovation']
  };

  /**
   * Analyze user's skill progression based on profile and interactions
   */
  static analyzeSkillProgression(
    userProfile: AppProfile,
    trackedEvents: Event[] = []
  ): SkillProgression {
    const careerProfile = extractCareerProfile(userProfile);
    
    if (!careerProfile) {
      return {
        primarySkills: [],
        learningPath: [],
        recommendedNextSteps: [],
        estimatedTimeToGoals: 0
      };
    }

    const primarySkills = careerProfile.primarySkills || [];
    const skillsToLearn = careerProfile.skillsToLearn || [];
    const interests = careerProfile.interests || [];

    // Analyze current skill levels based on tracked events
    const skillLevels = this.assessCurrentSkillLevels(
      primarySkills,
      skillsToLearn,
      trackedEvents
    );

    // Generate learning path
    const learningPath = this.generateLearningPath(skillsToLearn, interests);

    // Recommend next steps
    const recommendedNextSteps = this.getRecommendedNextSteps(skillLevels, learningPath);

    return {
      primarySkills: skillLevels,
      learningPath,
      recommendedNextSteps,
      estimatedTimeToGoals: this.estimateTimeToGoals(skillLevels, recommendedNextSteps)
    };
  }

  /**
   * Get events that match user's skill progression needs
   */
  static getSkillProgressionEvents(
    events: Event[],
    skillProgression: SkillProgression,
    limit: number = 5
  ): Array<Event & { progressionScore: number; progressionReason: string }> {
    return events
      .map(event => {
        const score = this.calculateProgressionScore(event, skillProgression);
        const reason = this.getProgressionReason(event, skillProgression);
        
        return {
          ...event,
          progressionScore: score,
          progressionReason: reason
        };
      })
      .filter(event => event.progressionScore > 0.3)
      .sort((a, b) => b.progressionScore - a.progressionScore)
      .slice(0, limit);
  }

  /**
   * Assess current skill levels based on event attendance
   */
  private static assessCurrentSkillLevels(
    primarySkills: string[],
    skillsToLearn: string[],
    trackedEvents: Event[]
  ): SkillLevel[] {
    const allSkills = [...primarySkills, ...skillsToLearn];
    
    return allSkills.map(skill => {
      const skillEvents = trackedEvents.filter(event => 
        this.eventMatchesSkill(event, skill)
      );

      // Assess level based on event difficulty
      const difficulties = skillEvents.map(event => this.getEventDifficulty(event));
      const avgDifficulty = this.calculateAverageDifficulty(difficulties);
      
      const currentLevel = this.mapDifficultyToLevel(avgDifficulty);
      const targetLevel = primarySkills.includes(skill) ? 'advanced' : 'intermediate';
      const progressScore = this.calculateProgressScore(currentLevel, targetLevel, skillEvents.length);

      return {
        skill,
        currentLevel,
        targetLevel,
        progressScore
      } as SkillLevel;
    });
  }

  /**
   * Generate personalized learning path
   */
  private static generateLearningPath(
    skillsToLearn: string[],
    interests: string[]
  ): string[] {
    const allDesiredSkills = [...skillsToLearn, ...interests];
    const learningPath: string[] = [];

    for (const skill of allDesiredSkills) {
      const pathway = this.SKILL_PATHWAYS[skill.toLowerCase()];
      if (pathway) {
        learningPath.push(...pathway);
      } else {
        learningPath.push(skill);
      }
    }

    // Remove duplicates and return ordered path
    return [...new Set(learningPath)];
  }

  /**
   * Get recommended next steps based on current progression
   */
  private static getRecommendedNextSteps(
    skillLevels: SkillLevel[],
    learningPath: string[]
  ): string[] {
    const nextSteps: string[] = [];

    // Find skills that need progression
    const skillsNeedingWork = skillLevels
      .filter(skill => skill.progressScore < 0.7)
      .sort((a, b) => a.progressScore - b.progressScore);

    // Add next steps for skills needing work
    for (const skill of skillsNeedingWork.slice(0, 3)) {
      const pathwayIndex = learningPath.indexOf(skill.skill);
      if (pathwayIndex >= 0 && pathwayIndex < learningPath.length - 1) {
        nextSteps.push(learningPath[pathwayIndex + 1]);
      }
    }

    return [...new Set(nextSteps)];
  }

  /**
   * Calculate how well an event matches skill progression needs
   */
  private static calculateProgressionScore(
    event: Event,
    progression: SkillProgression
  ): number {
    let score = 0;

    // Check if event helps with recommended next steps
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    
    for (const nextStep of progression.recommendedNextSteps) {
      if (eventText.includes(nextStep.toLowerCase())) {
        score += 0.4;
      }
    }

    // Check if event is at appropriate difficulty level
    const eventDifficulty = this.getEventDifficulty(event);
    const userSkillLevels = progression.primarySkills.map(s => s.currentLevel);
    
    if (this.isDifficultyAppropriate(eventDifficulty, userSkillLevels)) {
      score += 0.3;
    }

    // Check learning path alignment
    for (const pathStep of progression.learningPath) {
      if (eventText.includes(pathStep.toLowerCase())) {
        score += 0.2;
        break;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Generate reason for skill progression recommendation
   */
  private static getProgressionReason(
    event: Event,
    progression: SkillProgression
  ): string {
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    
    // Check for next steps match
    for (const nextStep of progression.recommendedNextSteps) {
      if (eventText.includes(nextStep.toLowerCase())) {
        return `Next step in your ${nextStep} learning path`;
      }
    }

    // Check for skill development
    const eventDifficulty = this.getEventDifficulty(event);
    return `${eventDifficulty} level content for skill development`;
  }

  // Helper methods
  private static eventMatchesSkill(event: Event, skill: string): boolean {
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    const skillLower = skill.toLowerCase();
    
    if (eventText.includes(skillLower)) return true;
    
    // Simplified skill matching for now
    return false;
  }

  private static getEventDifficulty(event: Event): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    
    for (const [level, keywords] of Object.entries(this.DIFFICULTY_KEYWORDS)) {
      if (keywords.some(keyword => eventText.includes(keyword))) {
        return level as 'beginner' | 'intermediate' | 'advanced' | 'expert';
      }
    }
    
    return 'intermediate'; // Default
  }

  private static calculateAverageDifficulty(difficulties: string[]): number {
    const difficultyScores = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const totalScore = difficulties.reduce((sum, diff) => sum + (difficultyScores[diff as keyof typeof difficultyScores] || 2), 0);
    return difficulties.length > 0 ? totalScore / difficulties.length : 2;
  }

  private static mapDifficultyToLevel(avgDifficulty: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (avgDifficulty <= 1.5) return 'beginner';
    if (avgDifficulty <= 2.5) return 'intermediate';
    if (avgDifficulty <= 3.5) return 'advanced';
    return 'expert';
  }

  private static calculateProgressScore(
    currentLevel: string,
    targetLevel: string,
    eventCount: number
  ): number {
    const levelScores = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const current = levelScores[currentLevel as keyof typeof levelScores] || 1;
    const target = levelScores[targetLevel as keyof typeof levelScores] || 3;
    
    const levelProgress = Math.min(current / target, 1);
    const activityBonus = Math.min(eventCount / 10, 0.3); // Bonus for attending events
    
    return Math.min(levelProgress + activityBonus, 1);
  }

  private static isDifficultyAppropriate(
    eventDifficulty: string,
    userSkillLevels: string[]
  ): boolean {
    const eventLevel = this.DIFFICULTY_KEYWORDS[eventDifficulty as keyof typeof this.DIFFICULTY_KEYWORDS] ? eventDifficulty : 'intermediate';
    const avgUserLevel = this.calculateAverageUserLevel(userSkillLevels);
    
    // Event should be at or slightly above user's current level
    const levelScores = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const eventScore = levelScores[eventLevel as keyof typeof levelScores] || 2;
    const userScore = levelScores[avgUserLevel as keyof typeof levelScores] || 2;
    
    return eventScore >= userScore && eventScore <= userScore + 1;
  }

  private static calculateAverageUserLevel(skillLevels: string[]): string {
    const levelScores = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const avgScore = skillLevels.reduce((sum, level) => sum + (levelScores[level as keyof typeof levelScores] || 2), 0) / skillLevels.length;
    
    if (avgScore <= 1.5) return 'beginner';
    if (avgScore <= 2.5) return 'intermediate';
    if (avgScore <= 3.5) return 'advanced';
    return 'expert';
  }

  private static estimateTimeToGoals(
    skillLevels: SkillLevel[],
    _nextSteps: string[]
  ): number {
    // Simple estimation: 4-8 weeks per skill level progression
    const skillsNeedingWork = skillLevels.filter(s => s.progressScore < 0.8);
    const avgTimePerSkill = 6; // weeks
    
    return skillsNeedingWork.length * avgTimePerSkill;
  }
}
