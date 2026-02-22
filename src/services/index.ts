// src/services/index.ts

/**
 * This barrel file exports all of the application's service classes
 * from a single, convenient module.
 */

import type { ApiResponse } from '@/types';

// Export the service classes
export { AuthService } from './authService';
export { ProfileService } from './profileService';
export { EventService } from './eventServices';
export { EventTypeService } from './eventTypeService';
export { UserEventService } from './userEventService';
export { AnalyticsService } from './analyticsService';
export { BehavioralAnalyticsService } from './behavioralAnalyticsService';
export { SocialProfileService } from './socialProfileService';
export { BlockService } from './blockService';
export { TrustLevelService } from './trustLevelService';
export { WhosGoingService } from './whosGoingService';
export { FollowService } from './followService';
export { PublicProfileService } from './publicProfileService';
export { UserSearchService } from './userSearchService';
export { NetworkEventCountsService } from './networkEventCountsService';
export { DiscoveryService } from './discoveryService';
export { CareerImpactService } from './careerImpactService';
export { HackathonService } from './hackathonService';

// Cache services
// export { getCareerImpactCache, CacheServiceHelper } from './cache'; // Temporarily disabled

export type { ApiResponse };

type ServiceMethodResult<T> = Promise<ApiResponse<T>>;

type AnyFunction = (...args: unknown[]) => ServiceMethodResult<unknown>;

export type ServiceClass = {
    [key: string]: AnyFunction;
};
