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
export { DiscoveryService } from './discoveryService';
export { PersonalizedDiscoveryService } from './personalizedDiscoveryService';
export { CareerImpactService } from './careerImpactService';

// Cache services
// export { getCareerImpactCache, CacheServiceHelper } from './cache'; // Temporarily disabled

export type { ApiResponse };

type ServiceMethodResult<T> = Promise<ApiResponse<T>>;

type AnyFunction = (...args: unknown[]) => ServiceMethodResult<unknown>;

export type ServiceClass = {
    [key: string]: AnyFunction;
};