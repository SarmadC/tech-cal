// src/services/hackathonService.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  HackathonEvent,
  HackathonTeam,
  HackathonParticipant,
  TeamFormData,
  HackathonRegistrationData,
  HackathonStatus,
  HackathonParticipantStatus
} from '@/types/hackathon';
import {
  validateRegistrationDeadline,
  validateTeamCapacity,
  validateTeamForm,
  validateSkills,
  validateParticipantStatus
} from '@/utils/hackathonValidation';

export class HackathonService {
  /**
   * Base query for hackathons table with organizer info
   */
  private static getHackathonsQuery(supabase: SupabaseClient) {
    return supabase
      .from('hackathons')
      .select(`
        *,
        organizers(*)
      `);
  }

  /**
   * Get all hackathons with participant data for a user
   */
  static async getHackathonEvents(
    supabase: SupabaseClient,
    userId?: string
  ): Promise<HackathonEvent[]> {
    try {
      // Get hackathons from new table
      const { data: hackathonData, error: hackathonError } = await this.getHackathonsQuery(supabase)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true })
        .limit(50);

      if (hackathonError) {
        this.handleDbError(hackathonError, 'fetching hackathons');
      }

      if (!hackathonData || hackathonData.length === 0) {
        return [];
      }

      const hackathonIds = hackathonData.map(h => h.id);

      // Get user participation and team data in parallel
      const [userParticipationMap, teamCountMap] = await Promise.all([
        this.getUserParticipationMap(supabase, userId, hackathonIds),
        this.getTeamCountMap(supabase, hackathonIds)
      ]);

      // Transform to HackathonEvent objects
      return hackathonData.map(hackathonData => this.transformHackathon(hackathonData, userParticipationMap, teamCountMap));
    } catch (error) {
      this.handleMethodError(error, 'getHackathonEvents');
    }
  }

  /**
   * Get teams for a specific hackathon
   */
  static async getHackathonTeams(
    supabase: SupabaseClient,
    hackathonId: string
  ): Promise<HackathonTeam[]> {
    try {
      const { data, error } = await supabase
        .from('hackathon_teams')
        .select(`
          *,
          hackathon_participants!inner(
            *,
            profiles(id, full_name, avatar_url)
          )
        `)
        .eq('hackathon_id', hackathonId)
        .order('created_at', { ascending: false });

      if (error) {
        this.handleDbError(error, 'fetching hackathon teams');
      }

      return data ? data.map(teamData => this.transformTeam(teamData)) : [];
    } catch (error) {
      this.handleMethodError(error, 'getHackathonTeams');
    }
  }

  /**
   * Register user for a hackathon with deadline validation
   */
  static async registerForHackathon(
    supabase: SupabaseClient,
    hackathonId: string,
    userId: string,
    registrationData: HackathonRegistrationData
  ): Promise<HackathonParticipant> {
    try {
      // Validate registration data
      const registrationValidation = validateSkills(registrationData.skills || []);
      if (!registrationValidation.isValid) {
        throw new Error(registrationValidation.message);
      }

      const statusValidation = validateParticipantStatus(registrationData.status);
      if (!statusValidation.isValid) {
        throw new Error(statusValidation.message);
      }

      // Validate hackathon exists and deadline
      await this.validateHackathonDeadline(supabase, hackathonId);

      const { data, error } = await supabase
        .from('hackathon_participants')
        .upsert({
          hackathon_id: hackathonId,
          user_id: userId,
          status: registrationData.status,
          skills: registrationData.skills || []
        }, {
          onConflict: 'hackathon_id,user_id'
        })
        .select()
        .single();

      if (error) {
        this.handleDbError(error, 'registering for hackathon');
      }

      return this.transformParticipant(data);
    } catch (error) {
      this.handleMethodError(error, 'registerForHackathon');
    }
  }

  /**
   * Create a new team for a hackathon with validation
   */
  static async createTeam(
    supabase: SupabaseClient,
    hackathonId: string,
    userId: string,
    teamData: TeamFormData
  ): Promise<HackathonTeam> {
    try {
      // Validate input
      this.validateTeamInput(teamData);

      // Validate registration deadline
      await this.validateHackathonDeadline(supabase, hackathonId);

      const { data: teamResult, error: teamError } = await supabase
        .from('hackathon_teams')
        .insert({
          hackathon_id: hackathonId,
          name: teamData.name.trim(),
          description: teamData.description?.trim() || null,
          looking_for_members: teamData.lookingForMembers,
          created_by: userId
        })
        .select()
        .single();

      if (teamError) {
        this.handleDbError(teamError, 'creating team');
      }

      // Add creator to the team
      await this.addUserToTeam(supabase, hackathonId, userId, teamResult.id);

      return this.transformTeam(teamResult);
    } catch (error) {
      this.handleMethodError(error, 'createTeam');
    }
  }

  /**
   * Join an existing team with validation
   */
  static async joinTeam(
    supabase: SupabaseClient,
    hackathonId: string,
    teamId: string,
    userId: string
  ): Promise<HackathonParticipant> {
    try {
      // Validate team capacity and hackathon deadline
      await this.validateTeamJoin(supabase, hackathonId, teamId);

      const { data, error } = await supabase
        .from('hackathon_participants')
        .upsert({
          hackathon_id: hackathonId,
          user_id: userId,
          team_id: teamId,
          status: 'team_formed',
          skills: []
        }, {
          onConflict: 'hackathon_id,user_id'
        })
        .select()
        .single();

      if (error) {
        this.handleDbError(error, 'joining team');
      }

      return this.transformParticipant(data);
    } catch (error) {
      this.handleMethodError(error, 'joinTeam');
    }
  }

  /**
   * Leave a team
   */
  static async leaveTeam(
    supabase: SupabaseClient,
    hackathonId: string,
    userId: string
  ): Promise<HackathonParticipant> {
    try {
      const { data, error } = await supabase
        .from('hackathon_participants')
        .update({
          team_id: null,
          status: 'registered'
        })
        .eq('hackathon_id', hackathonId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        this.handleDbError(error, 'leaving team');
      }

      return this.transformParticipant(data);
    } catch (error) {
      this.handleMethodError(error, 'leaveTeam');
    }
  }

  // ==========================================
  // HELPER METHODS (DRY Principle Applied)
  // ==========================================

  /**
   * Handle database operation errors consistently
   */
  private static handleDbError(error: unknown, operation: string): never {
    console.error(`Error ${operation}:`, error);
    throw error;
  }

  /**
   * Handle method-level errors consistently
   */
  private static handleMethodError(error: unknown, methodName: string): never {
    console.error(`Error in ${methodName}:`, error);
    throw error;
  }

  /**
   * Get user participation map for multiple hackathons
   */
  private static async getUserParticipationMap(
    supabase: SupabaseClient,
    userId: string | undefined,
    hackathonIds: string[]
  ): Promise<Map<string, HackathonParticipant>> {
    const participationMap = new Map<string, HackathonParticipant>();
    
    if (!userId || hackathonIds.length === 0) {
      return participationMap;
    }

    const { data: participationData, error } = await supabase
      .from('hackathon_participants')
      .select(`
        *,
        hackathon_teams(id, name, description, looking_for_members)
      `)
      .eq('user_id', userId)
      .in('hackathon_id', hackathonIds);

    if (error) {
      this.handleDbError(error, 'fetching user participation');
    }

    if (participationData) {
      participationData.forEach(p => {
        participationMap.set(p.hackathon_id, this.transformParticipant(p));
      });
    }

    return participationMap;
  }

  /**
   * Get team count map for multiple hackathons
   */
  private static async getTeamCountMap(
    supabase: SupabaseClient,
    hackathonIds: string[]
  ): Promise<Map<string, number>> {
    const teamCountMap = new Map<string, number>();
    
    if (hackathonIds.length === 0) {
      return teamCountMap;
    }

    const { data: teamCounts, error } = await supabase
      .from('hackathon_teams')
      .select('hackathon_id')
      .in('hackathon_id', hackathonIds);

    if (error) {
      this.handleDbError(error, 'fetching team counts');
    }

    if (teamCounts) {
      teamCounts.forEach(tc => {
        teamCountMap.set(tc.hackathon_id, (teamCountMap.get(tc.hackathon_id) || 0) + 1);
      });
    }

    return teamCountMap;
  }

  /**
   * Validate team input data
   */
  private static validateTeamInput(teamData: TeamFormData): void {
    const validation = validateTeamForm({
      name: teamData.name,
      description: teamData.description
    });
    
    if (!validation.isValid) {
      throw new Error(validation.message);
    }
  }

  /**
   * Validate hackathon exists and registration deadline
   */
  private static async validateHackathonDeadline(
    supabase: SupabaseClient,
    hackathonId: string
  ): Promise<void> {
    const { data: hackathon, error } = await supabase
      .from('hackathons')
      .select('registration_deadline, status')
      .eq('id', hackathonId)
      .single();

    if (error || !hackathon) {
      throw new Error('Hackathon not found');
    }

    if (hackathon.status !== 'active') {
      throw new Error('Hackathon is not active');
    }

    const deadlineValidation = validateRegistrationDeadline(hackathon.registration_deadline);
    if (!deadlineValidation.isValid) {
      throw new Error(deadlineValidation.message);
    }
  }

  /**
   * Validate team join operation
   */
  private static async validateTeamJoin(
    supabase: SupabaseClient,
    hackathonId: string,
    teamId: string
  ): Promise<void> {
    // First validate hackathon deadline (reuses existing method)
    await this.validateHackathonDeadline(supabase, hackathonId);

    // Then validate team capacity
    const [hackathonResult, teamResult] = await Promise.all([
      supabase
        .from('hackathons')
        .select('max_team_size')
        .eq('id', hackathonId)
        .single(),
      supabase
        .from('hackathon_teams')
        .select(`
          id,
          hackathon_participants(id)
        `)
        .eq('id', teamId)
        .single()
    ]);

    // Validate team size
    const currentSize = teamResult.data?.hackathon_participants?.length || 0;
    const capacityValidation = validateTeamCapacity(currentSize, hackathonResult.data?.max_team_size);
    if (!capacityValidation.isValid) {
      throw new Error(capacityValidation.message);
    }
  }

  /**
   * Add user to team
   */
  private static async addUserToTeam(
    supabase: SupabaseClient,
    hackathonId: string,
    userId: string,
    teamId: string
  ): Promise<void> {
    const { error: participantError } = await supabase
      .from('hackathon_participants')
      .upsert({
        hackathon_id: hackathonId,
        user_id: userId,
        team_id: teamId,
        status: 'team_formed',
        skills: []
      }, {
        onConflict: 'hackathon_id,user_id'
      });

    if (participantError) {
      this.handleDbError(participantError, 'adding user to team');
    }
  }

  // ==========================================
  // TRANSFORM METHODS
  // ==========================================

  /**
   * Transform database hackathon to application type
   */
  private static transformHackathon(
    dbHackathon: DatabaseHackathon,
    userParticipationMap: Map<string, HackathonParticipant>,
    teamCountMap: Map<string, number>
  ): HackathonEvent {
    return {
      id: dbHackathon.id,
      title: dbHackathon.title,
      description: dbHackathon.description || '',
      startDate: dbHackathon.start_date,
      endDate: dbHackathon.end_date,
      location: dbHackathon.location || '',
      organizerId: dbHackathon.organizer_id,
      registrationDeadline: dbHackathon.registration_deadline,
      submissionDeadline: dbHackathon.submission_deadline,
      maxTeamSize: dbHackathon.max_team_size,
      platformUrl: dbHackathon.platform_url,
      registrationUrl: dbHackathon.registration_url,
      websiteUrl: dbHackathon.website_url,
      status: dbHackathon.status as HackathonStatus,
      isVirtual: dbHackathon.is_virtual,
      userParticipation: userParticipationMap.get(dbHackathon.id),
      totalParticipants: teamCountMap.get(dbHackathon.id) || 0,
      createdAt: dbHackathon.created_at,
      updatedAt: dbHackathon.updated_at
    };
  }

  /**
   * Transform database team to application type
   */
  private static transformTeam(dbTeam: DatabaseTeam): HackathonTeam {
    const members = dbTeam.hackathon_participants?.map(p =>
      this.transformParticipant(p)
    ) || [];

    return {
      id: dbTeam.id,
      hackathonId: dbTeam.hackathon_id,
      name: dbTeam.name,
      description: dbTeam.description,
      lookingForMembers: dbTeam.looking_for_members,
      createdBy: dbTeam.created_by,
      createdAt: dbTeam.created_at,
      updatedAt: dbTeam.updated_at,
      memberCount: members.length,
      members
    };
  }

  /**
   * Transform database participant to application type
   */
  private static transformParticipant(dbParticipant: DatabaseParticipant): HackathonParticipant {
    return {
      id: dbParticipant.id,
      hackathonId: dbParticipant.hackathon_id,
      userId: dbParticipant.user_id,
      teamId: dbParticipant.team_id,
      status: dbParticipant.status as HackathonParticipantStatus,
      skills: dbParticipant.skills || [],
      createdAt: dbParticipant.created_at,
      updatedAt: dbParticipant.updated_at,
      user: dbParticipant.profiles ? {
        id: dbParticipant.profiles.id,
        fullName: dbParticipant.profiles.full_name,
        avatarUrl: dbParticipant.profiles.avatar_url
      } : undefined,
      team: dbParticipant.hackathon_teams ? {
        id: dbParticipant.hackathon_teams.id,
        hackathonId: dbParticipant.hackathon_id,
        name: dbParticipant.hackathon_teams.name,
        description: dbParticipant.hackathon_teams.description,
        lookingForMembers: dbParticipant.hackathon_teams.looking_for_members,
        createdBy: '',
        createdAt: '',
        updatedAt: ''
      } : undefined
    };
  }
}

// ==========================================
// DATABASE TYPE DEFINITIONS
// ==========================================

interface DatabaseHackathon {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  location?: string | null;
  organizer_id: string;
  registration_deadline?: string | null;
  submission_deadline?: string | null;
  max_team_size: number;
  platform_url?: string | null;
  registration_url?: string | null;
  website_url?: string | null;
  status: string;
  is_virtual: boolean;
  created_at: string;
  updated_at: string;
}

interface DatabaseTeam {
  id: string;
  hackathon_id: string;
  name: string;
  description?: string | null;
  looking_for_members: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  hackathon_participants?: DatabaseParticipant[];
}

interface DatabaseParticipant {
  id: string;
  hackathon_id: string;
  user_id: string;
  team_id?: string | null;
  status: string;
  skills: string[];
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  hackathon_teams?: {
    id: string;
    name: string;
    description?: string | null;
    looking_for_members: boolean;
  };
}