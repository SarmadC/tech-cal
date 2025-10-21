// Defines the sections of the career profile with type safety
export const QUICK_EDIT_SECTIONS = [
  'role', 
  'skills', 
  'goals', 
  'learning', 
  'networking', 
  'team'
] as const;

// Strict type for career profile sections
export type QuickEditSection = typeof QUICK_EDIT_SECTIONS[number];