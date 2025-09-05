// src/contexts/index.ts

// Auth Context exports
export {
    AuthProvider,
    useAuth,
    useUser,
    useProfile,
    useIsAuthenticated,
    useUserId,
    useAuthLoading,
} from './AuthContext';

// Calendar Context exports
export {
    CalendarProvider,
    useCalendar,
    useCalendarData,
    useCalendarActions,
    useCalendarState,
} from './CalendarContext';

// Export types that components might need
export type { AuthContextType } from './AuthContext';
