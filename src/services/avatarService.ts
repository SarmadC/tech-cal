/**
 * Avatar Service - Generate avatars for speakers using UI Avatars API
 * Free service that creates professional-looking avatars from initials
 */

export interface AvatarOptions {
  size?: number;
  backgroundColor?: string;
  color?: string;
  bold?: boolean;
  rounded?: boolean;
}

/**
 * Generate avatar URL using UI Avatars service
 */
export function generateAvatarUrl(
  name: string, 
  options: AvatarOptions = {}
): string {
  const {
    size = 200,
    backgroundColor = '4f46e5', // Indigo background
    color = 'ffffff', // White text
    bold = true,
    rounded = true
  } = options;

  // Extract initials from name (for fallback if needed)
  const _initials = getInitials(name);
  
  // Clean the name for URL encoding
  const trimmedName = name.trim();

  // Build UI Avatars URL
  const baseUrl = 'https://ui-avatars.com/api/';
  const params = new URLSearchParams({
    name: trimmedName,
    size: size.toString(),
    background: backgroundColor,
    color: color,
    bold: bold.toString(),
    rounded: rounded.toString(),
    format: 'png'
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Extract initials from a full name
 */
export function getInitials(name: string): string {
  if (!name || typeof name !== 'string') {
    return '?';
  }

  const words = name.trim().split(/\s+/);
  
  if (words.length === 0) {
    return '?';
  }
  
  if (words.length === 1) {
    // Single word - take first two characters
    return words[0].substring(0, 2).toUpperCase();
  }
  
  // Multiple words - take first character of first two words
  const firstInitial = words[0][0];
  const secondInitial = words[1][0];
  
  return (firstInitial + secondInitial).toUpperCase();
}

/**
 * Generate a consistent color based on name hash
 * This ensures the same speaker always gets the same color
 */
export function getConsistentColor(name: string): string {
  const colors = [
    '4f46e5', // Indigo
    'dc2626', // Red
    '059669', // Emerald
    'd97706', // Amber
    '7c3aed', // Violet
    'ea580c', // Orange
    '0891b2', // Cyan
    'be185d', // Pink
    '65a30d', // Lime
    '9333ea'  // Purple
  ];
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) & 0xffffffff;
  }
  
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

/**
 * Generate avatar with consistent color based on name
 */
export function generateConsistentAvatarUrl(
  name: string, 
  options: AvatarOptions = {}
): string {
  const backgroundColor = getConsistentColor(name);
  
  return generateAvatarUrl(name, {
    ...options,
    backgroundColor
  });
}

/**
 * Get avatar URL for a speaker, with fallback logic
 */
export function getSpeakerAvatarUrl(
  speaker: { 
    name: string; 
    photoUrl?: string | null;
    email?: string | null;
  },
  size: number = 200
): string {
  // 1. Use manual photo if available
  if (speaker.photoUrl) {
    return speaker.photoUrl;
  }
  
  // 2. Use consistent color avatar
  return generateConsistentAvatarUrl(speaker.name, { size });
}
