/**
 * Utility functions for generating consistent team names
 * Follows DRY principle by centralizing team name logic
 */

interface UserInfo {
  email?: string;
  fullName?: string;
}

/**
 * Generate a default team name based on user information
 * Priority: fullName -> email prefix -> fallback to "User"
 */
export function generateDefaultTeamName(user: UserInfo): string {
  // Try to use first name from full name
  if (user.fullName?.trim()) {
    const firstName = user.fullName.split(' ')[0];
    if (firstName && firstName.length > 0) {
      return `${firstName}'s Team`;
    }
  }

  // Fall back to email prefix
  if (user.email?.trim()) {
    const emailPrefix = user.email.split('@')[0];
    if (emailPrefix && emailPrefix.length > 0) {
      return `${emailPrefix}'s Team`;
    }
  }

  // Final fallback
  return 'New Team';
}

/**
 * Sanitize team name to ensure it meets requirements
 */
export function sanitizeTeamName(name: string): string {
  return name.trim().slice(0, 100); // Max 100 characters as per validation
}