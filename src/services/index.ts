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

export type { ApiResponse };


/**
 *
 * The following section defines a generic type for what a "Service" is.
 * This isn't strictly necessary for the app to run, but it's a good
 * practice for ensuring all your services follow a consistent pattern.
 */

// A generic type for the result of any service method call
// This now works because ApiResponse was imported above.
type ServiceMethodResult<T = void> = Promise<ApiResponse<T>>;

// A generic type for any method within a service class
type ServiceMethod<T = void> = (...args: any[]) => ServiceMethodResult<T>;

// A generic type representing the structure of any of our service classes
export type ServiceClass = {
    [key: string]: ServiceMethod<any>;
};