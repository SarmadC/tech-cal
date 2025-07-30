// src/contexts/index.ts

// We only export things from AuthContext for now.
export {
    AuthProvider,
    useAuth,
    useUser,
    useProfile,
    useIsAuthenticated,
    useUserId,
    useAuthLoading,
} from './AuthContext';


// Export types that components might need
export type { AuthContextType } from './AuthContext';