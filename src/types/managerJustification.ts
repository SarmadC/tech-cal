export interface ManagerJustificationData {
  event: {
    title: string;
    startTime: string;
    endTime: string | null;
    timezone?: string | null;
    location: string;
    eventFormat?: 'Online' | 'In-person' | 'Hybrid' | null;
    organizer: string;
    priceRange?: string | null;
    priceMin?: number | null;
    registrationUrl?: string | null;
    description: string;
    tags: string[];
    speakers: Array<{
      name: string;
      title?: string | null;
      company?: string | null;
    }>;
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
    targetAudience?: string | null;
  };
  profile: {
    currentRole: string;
    seniority: string;
    industry: string;
    primarySkills: string[];
    skillsToLearn: string[];
    careerGoals: string[];
  };
  impact: {
    overall: number;
    confidence: number;
    components: {
      skillRelevance: number;
      careerStageMatch: number;
      networkingValue: number;
      industryRelevance: number;
      timingBonus: number;
    };
    topReasons: string[];
    matchedSkills: string[];
    matchedGoals: string[];
  };
}

export interface ManagerJustificationResponse {
  success: boolean;
  data?: ManagerJustificationData;
  error?: string;
}
