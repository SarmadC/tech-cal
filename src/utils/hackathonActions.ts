// Consolidated hackathon action handlers following DRY principle
import { SupabaseClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';
import { HackathonService } from '@/services/hackathonService';
import type { SnackbarContextType } from '@/contexts/SnackbarContext';
import type { HackathonEvent, HackathonTeam, HackathonParticipantStatus } from '@/types/hackathon';
import {
  validateRegistrationDeadline,
  validateTeamCapacity,
  validateTeamForm,
  validateHackathonActive,
  validateHackathonRegistration
} from './hackathonValidation';

interface HackathonActionParams {
  supabase: SupabaseClient;
  userId: string;
  queryClient: QueryClient;
  snackbar: SnackbarContextType;
}

interface TeamDialogActions {
  setSelectedHackathon: (hackathon: HackathonEvent | null) => void;
  setTeams: (teams: HackathonTeam[]) => void;
  setTeamDialogOpen: (open: boolean) => void;
}

interface TeamFilterOptions {
  lookingForMembers?: boolean;
  withCapacityCheck?: boolean;
  maxTeamSize?: number | null;
}

interface ConfirmationOptions {
  confirmText?: string;
  cancelText?: string;
}

// ==========================================
// CONSTANTS
// ==========================================

const NO_TEAMS_MESSAGE = 'No teams are currently looking for members. Try creating your own team!';
const HACKATHON_NOT_FOUND_MESSAGE = 'Hackathon not found. Please refresh and try again.';

const CONFIRMATION_OPTIONS = {
  JOIN_TEAM: { confirmText: 'Join Team', cancelText: 'Cancel' },
  LEAVE_TEAM: { confirmText: 'Leave Team', cancelText: 'Cancel' }
} as const;

const ERROR_MESSAGES = {
  REGISTRATION_FAILED: 'Failed to register for hackathon. Please try again.',
  TEAM_CREATION_FAILED: 'Failed to create team. Please try again.',
  TEAM_JOIN_FAILED: 'Failed to join team. Please try again.',
  TEAM_LEAVE_FAILED: 'Failed to leave team. Please try again.',
  TEAMS_LOAD_FAILED: 'Failed to load available teams. Please try again.'
} as const;

const SUCCESS_MESSAGES = {
  REGISTRATION_SUCCESS: 'Successfully registered for hackathon!',
  TEAM_CREATION_SUCCESS: 'Team "{name}" created successfully!',
  TEAM_JOIN_SUCCESS: 'Successfully joined "{name}"!',
  TEAM_LEAVE_SUCCESS: 'Successfully left team!'
} as const;

export class HackathonActions {
  private supabase: SupabaseClient;
  private userId: string;
  private queryClient: QueryClient;
  private snackbar: SnackbarContextType;

  constructor({ supabase, userId, queryClient, snackbar }: HackathonActionParams) {
    this.supabase = supabase;
    this.userId = userId;
    this.queryClient = queryClient;
    this.snackbar = snackbar;
  }

  // ==========================================
  // HELPER METHODS (DRY Principle Applied)
  // ==========================================

  /**
   * Handle errors consistently across all actions
   */
  private handleError(error: unknown, action: string, fallbackMessage: string): void {
    console.error('Error', action + ':', error);
    const errorMessage = error instanceof Error ? error.message : fallbackMessage;
    this.snackbar.showError(errorMessage);
  }

  /**
   * Invalidate hackathon queries and show success message
   */
  private handleSuccess(message: string): void {
    this.queryClient.invalidateQueries({ queryKey: ['hackathonEvents', this.userId] });
    this.snackbar.showSuccess(message);
  }

  /**
   * Validate hackathon preconditions (deadline and active status)
   */
  private validateHackathonPreconditions(hackathon: HackathonEvent): boolean {
    const validations = [
      validateRegistrationDeadline(hackathon.registrationDeadline),
      validateHackathonActive(hackathon.endDate)
    ];

    for (const validation of validations) {
      if (!this.validateAndShowError(validation, 'Hackathon validation failed')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get teams for a hackathon with optional filtering
   */
  private async getTeams(
    hackathonId: string, 
    options: TeamFilterOptions = {}
  ): Promise<HackathonTeam[]> {
    try {
      const teams = await HackathonService.getHackathonTeams(this.supabase, hackathonId);
      
      return teams.filter(team => {
        // Filter by looking for members if specified
        if (options.lookingForMembers !== undefined && team.lookingForMembers !== options.lookingForMembers) {
          return false;
        }
        
        // Filter by capacity if specified
        if (options.withCapacityCheck && options.maxTeamSize !== undefined) {
          const capacityValidation = validateTeamCapacity(team.memberCount || 0, options.maxTeamSize);
          if (!capacityValidation.isValid) {
            return false;
          }
        }
        
        return true;
      });
    } catch (error) {
      console.error('Error fetching teams:', error);
      return []; // Return empty array on error to prevent crashes
    }
  }

  /**
   * Get available teams for a hackathon with capacity validation
   */
  private async getAvailableTeams(hackathonId: string, hackathon: HackathonEvent): Promise<HackathonTeam[]> {
    return this.getTeams(hackathonId, {
      lookingForMembers: true,
      withCapacityCheck: true,
      maxTeamSize: hackathon.maxTeamSize
    });
  }

  /**
   * Get teams that are looking for members (without capacity validation)
   */
  private async getTeamsLookingForMembers(hackathonId: string): Promise<HackathonTeam[]> {
    return this.getTeams(hackathonId, { lookingForMembers: true });
  }

  /**
   * Find hackathon by ID with proper error handling
   */
  private findHackathon(hackathons: HackathonEvent[], hackathonId: string): HackathonEvent | null {
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (!hackathon) {
      this.snackbar.showError(HACKATHON_NOT_FOUND_MESSAGE);
    }
    return hackathon || null;
  }

  /**
   * Show confirmation dialog with consistent styling
   */
  private showConfirmation(
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
    options?: ConfirmationOptions
  ): void {
    this.snackbar.showConfirmation(
      title,
      message,
      onConfirm,
      {
        confirmText: options?.confirmText || 'Confirm',
        cancelText: options?.cancelText || 'Cancel'
      }
    );
  }

  /**
   * Handle empty teams scenario consistently
   */
  private handleNoTeamsAvailable(): void {
    this.snackbar.showError(NO_TEAMS_MESSAGE);
  }

  /**
   * Validate and show error if validation fails
   */
  private validateAndShowError(
    validation: { isValid: boolean; message?: string },
    fallbackMessage: string
  ): boolean {
    if (!validation.isValid) {
      this.snackbar.showError(validation.message || fallbackMessage);
      return false;
    }
    return true;
  }

  /**
   * Format team description for display
   */
  private formatTeamDescription(team: HackathonTeam): string {
    return team.description || 'No description available';
  }

  /**
   * Format success message with name placeholder
   */
  private formatSuccessMessage(template: string, name: string): string {
    return template.replace('{name}', name);
  }

  /**
   * Execute action with consistent error handling pattern
   */
  private async executeWithErrorHandling<T>(
    action: () => Promise<T>,
    actionName: string,
    errorMessage: string
  ): Promise<T | null> {
    try {
      return await action();
    } catch (error) {
      this.handleError(error, actionName, errorMessage);
      return null;
    }
  }

  async registerForHackathon(hackathonId: string, hackathon?: HackathonEvent): Promise<void> {
    try {
      // Validate hackathon preconditions if data is provided
      if (hackathon && !this.validateHackathonPreconditions(hackathon)) {
        return;
      }

      // Validate registration data
      const registrationData = { status: 'registered' as HackathonParticipantStatus, skills: [] };
      const validation = validateHackathonRegistration(registrationData);
      if (!this.validateAndShowError(validation, 'Invalid registration data')) {
        return;
      }

      await HackathonService.registerForHackathon(
        this.supabase,
        hackathonId,
        this.userId,
        registrationData
      );

      this.handleSuccess(SUCCESS_MESSAGES.REGISTRATION_SUCCESS);
    } catch (error) {
      this.handleError(error, 'registering for hackathon', ERROR_MESSAGES.REGISTRATION_FAILED);
    }
  }

  async createTeam(
    hackathonId: string, 
    teamName: string, 
    teamDescription: string = '', 
    lookingForMembers: boolean = true
  ): Promise<void> {
    try {
      const teamData = {
        name: teamName,
        description: teamDescription,
        lookingForMembers
      };

      // Validate team form data
      const validation = validateTeamForm(teamData);
      if (!this.validateAndShowError(validation, 'Invalid team data')) {
        return;
      }

      await HackathonService.createTeam(
        this.supabase,
        hackathonId,
        this.userId,
        teamData
      );

      this.handleSuccess(this.formatSuccessMessage(SUCCESS_MESSAGES.TEAM_CREATION_SUCCESS, teamData.name));
    } catch (error) {
      this.handleError(error, 'creating team', ERROR_MESSAGES.TEAM_CREATION_FAILED);
    }
  }

  async loadTeamsForSelection(
    hackathonId: string,
    hackathons: HackathonEvent[],
    teamDialogActions: TeamDialogActions
  ): Promise<void> {
    try {
      const hackathon = this.findHackathon(hackathons, hackathonId);
      if (!hackathon) return;

      // Validate hackathon preconditions
      if (!this.validateHackathonPreconditions(hackathon)) {
        return;
      }

      const availableTeams = await this.getAvailableTeams(hackathonId, hackathon);

      if (availableTeams.length === 0) {
        this.handleNoTeamsAvailable();
        return;
      }

      teamDialogActions.setSelectedHackathon(hackathon);
      teamDialogActions.setTeams(availableTeams);
      teamDialogActions.setTeamDialogOpen(true);
    } catch (error) {
      this.handleError(error, 'loading teams', ERROR_MESSAGES.TEAMS_LOAD_FAILED);
    }
  }

  async joinTeam(hackathonId: string, teamId: string, teamName: string): Promise<void> {
    try {
      await HackathonService.joinTeam(this.supabase, hackathonId, teamId, this.userId);
      this.handleSuccess(this.formatSuccessMessage(SUCCESS_MESSAGES.TEAM_JOIN_SUCCESS, teamName));
    } catch (error) {
      this.handleError(error, 'joining team', ERROR_MESSAGES.TEAM_JOIN_FAILED);
    }
  }

  async joinTeamById(teamId: string): Promise<void> {
    try {
      await HackathonService.joinTeamById(this.supabase, teamId, this.userId);
      this.handleSuccess('Successfully joined the team!');
    } catch (error) {
      this.handleError(error, 'joining team', ERROR_MESSAGES.TEAM_JOIN_FAILED);
    }
  }

  async leaveTeam(hackathonId: string, teamName: string): Promise<void> {
    this.showConfirmation(
      'Leave Team',
      `Are you sure you want to leave "${teamName}"?`,
      async () => {
        try {
          await HackathonService.leaveTeam(this.supabase, hackathonId, this.userId);
          this.handleSuccess(SUCCESS_MESSAGES.TEAM_LEAVE_SUCCESS);
        } catch (error) {
          this.handleError(error, 'leaving team', ERROR_MESSAGES.TEAM_LEAVE_FAILED);
        }
      },
      CONFIRMATION_OPTIONS.LEAVE_TEAM
    );
  }

  async deleteTeam(teamId: string, teamName: string): Promise<void> {
    this.showConfirmation(
      'Delete Team',
      `Are you sure you want to delete "${teamName}"? This will remove all team members and cannot be undone.`,
      async () => {
        try {
          await HackathonService.deleteTeam(this.supabase, teamId, this.userId);
          this.handleSuccess(`Successfully deleted team "${teamName}"`);
        } catch (error) {
          this.handleError(error, 'deleting team', 'Failed to delete team. Please try again.');
        }
      },
      { confirmText: 'Delete Team', cancelText: 'Cancel' }
    );
  }

  // Legacy support for simple team joining (first available team)
  async joinFirstAvailableTeam(hackathonId: string): Promise<void> {
    try {
      const availableTeams = await this.getTeamsLookingForMembers(hackathonId);

      if (availableTeams.length === 0) {
        this.handleNoTeamsAvailable();
        return;
      }

      const selectedTeam = availableTeams[0];

      this.showConfirmation(
        'Join Team',
        `Join "${selectedTeam.name}"?\n\n${this.formatTeamDescription(selectedTeam)}`,
        async () => {
          await this.joinTeam(hackathonId, selectedTeam.id, selectedTeam.name);
        },
        CONFIRMATION_OPTIONS.JOIN_TEAM
      );
    } catch (error) {
      this.handleError(error, 'loading teams', ERROR_MESSAGES.TEAMS_LOAD_FAILED);
    }
  }
}

// Utility function to create action handlers for components
export function createHackathonActions(params: HackathonActionParams): HackathonActions {
  return new HackathonActions(params);
}