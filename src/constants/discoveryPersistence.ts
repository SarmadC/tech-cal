export const DISCOVERY_PERSISTENCE_VERSION = 'v2';

// Bump persisted Discover UI state when ranking behavior changes so stale client-side
// sort/ranking choices do not mask backend recommendation improvements.
export const DISCOVERY_RESUME_STATE_KEY = `discover-resume-state-${DISCOVERY_PERSISTENCE_VERSION}`;

export const DESKTOP_DISCOVERY_RANKING_MODE_KEY = `discovery-ranking-mode-${DISCOVERY_PERSISTENCE_VERSION}`;
export const MOBILE_DISCOVERY_RANKING_MODE_KEY = `mobile-discovery-ranking-mode-${DISCOVERY_PERSISTENCE_VERSION}`;
