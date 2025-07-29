export { AuthService } from './authService';
export { ProfileService } from './profileService';
export { EventService } from './eventServices';
export { EventTypeService } from './eventTypeService';
export { UserEventService } from './userEventService';

// Re-export service types that components might need
export type {
    ServiceResponse,
    BulkOperationResult,
} from './types';

// Optional: Create service types if you want to be more explicit
export type ServiceClass = {
    [key: string]: (...args: any[]) => Promise<any>;
};