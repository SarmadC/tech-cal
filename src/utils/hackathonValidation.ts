/**
 * Centralized hackathon validation utilities
 * Follows DRY principle by consolidating all validation logic
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// ==========================================
// VALIDATION CONSTANTS
// ==========================================

const VALIDATION_LIMITS = {
  HACKATHON_TITLE_MAX_LENGTH: 200,
  HACKATHON_DESCRIPTION_MAX_LENGTH: 2000,
  HACKATHON_LOCATION_MAX_LENGTH: 200,
  TEAM_NAME_MAX_LENGTH: 100,
  TEAM_DESCRIPTION_MAX_LENGTH: 500,
  SKILL_MAX_LENGTH: 50,
  MAX_SKILLS: 20,
  MIN_TEAM_SIZE: 1,
  MAX_TEAM_SIZE: 20,
  URL_MAX_LENGTH: 500
} as const;

const VALID_PARTICIPANT_STATUSES = ['interested', 'registered', 'team_formed'] as const;
const VALID_HACKATHON_STATUSES = ['active', 'cancelled', 'completed'] as const;

export type HackathonParticipantStatus = typeof VALID_PARTICIPANT_STATUSES[number];
export type HackathonStatus = typeof VALID_HACKATHON_STATUSES[number];

// ==========================================
// HELPER FUNCTIONS (DRY Principle Applied)
// ==========================================

/**
 * Parse date safely with error handling
 */
function parseDateSafely(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Validate date string format and return parsed date
 */
function validateDateString(dateString: string | null | undefined, fieldName: string): { isValid: boolean; date?: Date; message?: string } {
  if (!dateString) {
    return { isValid: true }; // No date means always valid
  }

  const date = parseDateSafely(dateString);
  if (!date) {
    return {
      isValid: false,
      message: `Invalid ${fieldName} format`
    };
  }

  return { isValid: true, date };
}

/**
 * Check if date has passed
 */
function isDateInPast(date: Date): boolean {
  return new Date() > date;
}

/**
 * Validate string length with custom messages
 */
function validateStringLength(
  value: string | undefined, 
  maxLength: number, 
  fieldName: string, 
  required: boolean = false
): ValidationResult {
  if (!value?.trim()) {
    return required 
      ? { isValid: false, message: `${fieldName} is required` }
      : { isValid: true };
  }

  if (value.length > maxLength) {
    return {
      isValid: false,
      message: `${fieldName} must be ${maxLength} characters or less`
    };
  }

  return { isValid: true };
}

/**
 * Helper to run validation and return early if invalid
 */
function runValidation(validation: ValidationResult): ValidationResult | null {
  return validation.isValid ? null : validation;
}

/**
 * Validate URL format
 */
function validateUrl(url: string | null | undefined, fieldName: string): ValidationResult {
  if (!url) {
    return { isValid: true }; // Optional field
  }

  if (url.length > VALIDATION_LIMITS.URL_MAX_LENGTH) {
    return {
      isValid: false,
      message: `${fieldName} URL must be ${VALIDATION_LIMITS.URL_MAX_LENGTH} characters or less`
    };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      message: `${fieldName} must be a valid URL`
    };
  }
}

/**
 * Check if registration deadline has passed
 */
export function validateRegistrationDeadline(deadline: string | null | undefined): ValidationResult {
  const validation = validateDateString(deadline, 'registration deadline');
  
  if (!validation.isValid) {
    return validation;
  }

  if (validation.date && isDateInPast(validation.date)) {
    return {
      isValid: false,
      message: 'Registration deadline has passed'
    };
  }

  return { isValid: true };
}

/**
 * Check if team has space for new members
 */
export function validateTeamCapacity(
  currentSize: number,
  maxSize: number | null | undefined
): ValidationResult {
  if (!maxSize) {
    return { isValid: true }; // No limit means always valid
  }

  // Validate current size is not negative
  if (currentSize < 0) {
    return {
      isValid: false,
      message: 'Current team size cannot be negative'
    };
  }

  // Validate max size is within limits
  if (maxSize < VALIDATION_LIMITS.MIN_TEAM_SIZE || maxSize > VALIDATION_LIMITS.MAX_TEAM_SIZE) {
    return {
      isValid: false,
      message: `Team size must be between ${VALIDATION_LIMITS.MIN_TEAM_SIZE} and ${VALIDATION_LIMITS.MAX_TEAM_SIZE}`
    };
  }

  if (currentSize >= maxSize) {
    return {
      isValid: false,
      message: `Team is full (${currentSize}/${maxSize} members)`
    };
  }

  return { isValid: true };
}

/**
 * Validate team name input
 */
export function validateTeamName(name: string | undefined): ValidationResult {
  return validateStringLength(name, VALIDATION_LIMITS.TEAM_NAME_MAX_LENGTH, 'Team name', true);
}

/**
 * Validate team description input
 */
export function validateTeamDescription(description: string | undefined): ValidationResult {
  return validateStringLength(description, VALIDATION_LIMITS.TEAM_DESCRIPTION_MAX_LENGTH, 'Team description', false);
}

/**
 * Check if hackathon is still active (hasn't ended)
 */
export function validateHackathonActive(endTime: string | null | undefined): ValidationResult {
  const validation = validateDateString(endTime, 'hackathon end time');
  
  if (!validation.isValid) {
    return validation;
  }

  if (validation.date && isDateInPast(validation.date)) {
    return {
      isValid: false,
      message: 'Hackathon has ended'
    };
  }

  return { isValid: true };
}

/**
 * Check if submission deadline has passed
 */
export function validateSubmissionDeadline(deadline: string | null | undefined): ValidationResult {
  const validation = validateDateString(deadline, 'submission deadline');
  
  if (!validation.isValid) {
    return validation;
  }

  if (validation.date && isDateInPast(validation.date)) {
    return {
      isValid: false,
      message: 'Submission deadline has passed'
    };
  }

  return { isValid: true };
}

/**
 * Validate hackathon date range (start date must be before end date)
 */
export function validateHackathonDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): ValidationResult {
  const startValidation = validateDateString(startDate, 'hackathon start date');
  const endValidation = validateDateString(endDate, 'hackathon end date');

  if (!startValidation.isValid) {
    return startValidation;
  }

  if (!endValidation.isValid) {
    return endValidation;
  }

  if (startValidation.date && endValidation.date && startValidation.date >= endValidation.date) {
    return {
      isValid: false,
      message: 'Hackathon start date must be before end date'
    };
  }

  return { isValid: true };
}

/**
 * Validate participant status
 */
export function validateParticipantStatus(status: string): ValidationResult {
  if (!VALID_PARTICIPANT_STATUSES.includes(status as HackathonParticipantStatus)) {
    return {
      isValid: false,
      message: `Invalid participant status. Must be one of: ${VALID_PARTICIPANT_STATUSES.join(', ')}`
    };
  }

  return { isValid: true };
}

/**
 * Validate skills array
 */
export function validateSkills(skills: string[]): ValidationResult {
  if (!Array.isArray(skills)) {
    return {
      isValid: false,
      message: 'Skills must be an array'
    };
  }

  if (skills.length > VALIDATION_LIMITS.MAX_SKILLS) {
    return {
      isValid: false,
      message: `Maximum ${VALIDATION_LIMITS.MAX_SKILLS} skills allowed`
    };
  }

  for (const skill of skills) {
    if (typeof skill !== 'string' || !skill.trim()) {
      return {
        isValid: false,
        message: 'All skills must be non-empty strings'
      };
    }
    
    if (skill.length > VALIDATION_LIMITS.SKILL_MAX_LENGTH) {
      return {
        isValid: false,
        message: `Each skill must be ${VALIDATION_LIMITS.SKILL_MAX_LENGTH} characters or less`
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate team size limits
 */
export function validateTeamSizeLimit(maxTeamSize: number | null | undefined): ValidationResult {
  if (!maxTeamSize) {
    return { isValid: true }; // No limit means always valid
  }

  if (maxTeamSize < VALIDATION_LIMITS.MIN_TEAM_SIZE) {
    return {
      isValid: false,
      message: `Team size must be at least ${VALIDATION_LIMITS.MIN_TEAM_SIZE}`
    };
  }

  if (maxTeamSize > VALIDATION_LIMITS.MAX_TEAM_SIZE) {
    return {
      isValid: false,
      message: `Team size cannot exceed ${VALIDATION_LIMITS.MAX_TEAM_SIZE}`
    };
  }

  return { isValid: true };
}

/**
 * Validate hackathon title
 */
export function validateHackathonTitle(title: string | undefined): ValidationResult {
  return validateStringLength(title, VALIDATION_LIMITS.HACKATHON_TITLE_MAX_LENGTH, 'Hackathon title', true);
}

/**
 * Validate hackathon description
 */
export function validateHackathonDescription(description: string | undefined): ValidationResult {
  return validateStringLength(description, VALIDATION_LIMITS.HACKATHON_DESCRIPTION_MAX_LENGTH, 'Hackathon description', true);
}

/**
 * Validate hackathon status
 */
export function validateHackathonStatus(status: string): ValidationResult {
  if (!VALID_HACKATHON_STATUSES.includes(status as HackathonStatus)) {
    return {
      isValid: false,
      message: `Invalid hackathon status. Must be one of: ${VALID_HACKATHON_STATUSES.join(', ')}`
    };
  }

  return { isValid: true };
}

/**
 * Validate platform URL
 */
export function validatePlatformUrl(url: string | null | undefined): ValidationResult {
  return validateUrl(url, 'Platform');
}

/**
 * Validate registration URL
 */
export function validateRegistrationUrl(url: string | null | undefined): ValidationResult {
  return validateUrl(url, 'Registration');
}

/**
 * Validate website URL
 */
export function validateWebsiteUrl(url: string | null | undefined): ValidationResult {
  return validateUrl(url, 'Website');
}

/**
 * Validate hackathon location
 */
export function validateHackathonLocation(location: string | undefined): ValidationResult {
  return validateStringLength(location, VALIDATION_LIMITS.HACKATHON_LOCATION_MAX_LENGTH, 'Hackathon location', true);
}

// ==========================================
// COMPOSITE VALIDATION FUNCTIONS
// ==========================================

/**
 * Validate team form data comprehensively
 */
export function validateTeamForm(data: {
  name?: string;
  description?: string;
  maxTeamSize?: number;
}): ValidationResult {
  return runValidation(validateTeamName(data.name)) ||
         runValidation(validateTeamDescription(data.description)) ||
         runValidation(validateTeamSizeLimit(data.maxTeamSize)) ||
         { isValid: true };
}

/**
 * Validate hackathon registration data comprehensively
 */
export function validateHackathonRegistration(data: {
  skills?: string[];
  status?: string;
}): ValidationResult {
  return (data.skills ? runValidation(validateSkills(data.skills)) : null) ||
         (data.status ? runValidation(validateParticipantStatus(data.status)) : null) ||
         { isValid: true };
}

/**
 * Validate hackathon event data comprehensively
 */
export function validateHackathonEvent(data: {
  title?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  submissionDeadline?: string;
  maxTeamSize?: number;
  platformUrl?: string | null;
  registrationUrl?: string | null;
  websiteUrl?: string | null;
  status?: string;
}): ValidationResult {
  return runValidation(validateHackathonTitle(data.title)) ||
         runValidation(validateHackathonDescription(data.description)) ||
         runValidation(validateHackathonLocation(data.location)) ||
         ((data.startDate || data.endDate) ? runValidation(validateHackathonDateRange(data.startDate, data.endDate)) : null) ||
         (data.registrationDeadline ? runValidation(validateRegistrationDeadline(data.registrationDeadline)) : null) ||
         (data.submissionDeadline ? runValidation(validateSubmissionDeadline(data.submissionDeadline)) : null) ||
         (data.maxTeamSize !== undefined ? runValidation(validateTeamSizeLimit(data.maxTeamSize)) : null) ||
         runValidation(validatePlatformUrl(data.platformUrl)) ||
         runValidation(validateRegistrationUrl(data.registrationUrl)) ||
         runValidation(validateWebsiteUrl(data.websiteUrl)) ||
         (data.status ? runValidation(validateHackathonStatus(data.status)) : null) ||
         { isValid: true };
}