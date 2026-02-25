// src/services/hackathonService.ts

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type {
  HackathonEvent,
  HackathonTeam,
  HackathonParticipant,
  HackathonRecommendationFeatures,
  TeamMessage,
  TeamFormData,
  HackathonRegistrationData,
  HackathonStatus,
  HackathonParticipantStatus
} from '@/types/hackathon';
import type { SkillTag, TeamRole, CollaborationStyle, TeamSizePreference, CommunicationPreference, MentorshipPreference, AvailabilityPattern } from '@/types/career';
import { validateTeamCapacity as validateCapacity } from '@/utils/teamUtils';
import {
  validateRegistrationDeadline,
  validateTeamForm,
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
        organizers(id, name, website_url, logo_url, description)
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

      // Get user participation and team data with error handling
      const hackathonIds = hackathonData.map(h => h.id);
      
      // Use Promise.allSettled to handle individual failures gracefully
      const [userParticipationResult, participantCountResult, teamsResult] = await Promise.allSettled([
        this.getUserParticipationMap(supabase, userId, hackathonIds),
        this.getParticipantCountMap(supabase, hackathonIds),
        this.getTeamsMap(supabase, hackathonIds)
      ]);

      // Extract results with fallbacks
      const userParticipationMap = userParticipationResult.status === 'fulfilled' 
        ? userParticipationResult.value 
        : new Map<string, HackathonParticipant>();
      
      const participantCountMap = participantCountResult.status === 'fulfilled' 
        ? participantCountResult.value 
        : new Map<string, number>();
      
      const teamsMap = teamsResult.status === 'fulfilled' 
        ? teamsResult.value 
        : new Map<string, HackathonTeam[]>();

      // Transform to HackathonEvent objects
      return hackathonData.map(hackathonData => this.transformHackathon(
        hackathonData, 
        userParticipationMap, 
        participantCountMap,
        teamsMap
      ));
    } catch (error) {
      console.error('Critical error in getHackathonEvents:', error);
      // Return empty array instead of throwing to prevent page crashes
      return [];
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
      // First get basic team data
      const { data: teamsData, error: teamsError } = await supabase
        .from('hackathon_teams')
        .select('*')
        .eq('hackathon_id', hackathonId)
        .order('created_at', { ascending: false });

      if (teamsError) {
        this.handleDbError(teamsError, 'fetching hackathon teams');
      }

      if (!teamsData || teamsData.length === 0) {
        return [];
      }

      // Get member counts for each team
      const teamIds = teamsData.map(team => team.id);
      const { data: memberCounts, error: countError } = await supabase
        .from('hackathon_participants')
        .select('team_id')
        .in('team_id', teamIds);

      if (countError) {
        console.warn('Error fetching team member counts:', countError);
      }

      // Count members per team
      const memberCountMap = new Map<string, number>();
      if (memberCounts) {
        memberCounts.forEach(participant => {
          if (participant.team_id) {
            const currentCount = memberCountMap.get(participant.team_id) || 0;
            memberCountMap.set(participant.team_id, currentCount + 1);
          }
        });
      }

      // Transform teams with member counts
      return teamsData.map(teamData => {
        const team = this.transformTeam(teamData);
        team.memberCount = memberCountMap.get(team.id) || 0;
        return team;
      });
    } catch (error) {
      this.handleMethodError(error, 'getHackathonTeams');
    }
  }

  /**
   * Register user for a hackathon with enhanced team building features
   */
  static async registerForHackathon(
    supabase: SupabaseClient,
    hackathonId: string,
    userId: string,
    registrationData: HackathonRegistrationData
  ): Promise<HackathonParticipant> {
    try {
      // Validate registration data
      const skillValidation = this.validateSkillProficiencies(registrationData.skillProficiencies || []);
      if (!skillValidation.isValid) {
        throw new Error(skillValidation.message);
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
          skill_proficiencies: registrationData.skillProficiencies || [],
          preferred_team_role: registrationData.preferredTeamRole || null,
          collaboration_style: registrationData.collaborationStyle || null,
          team_size_preference: registrationData.teamSizePreference || null,
          communication_preferences: registrationData.communicationPreferences || null,
          team_goals: registrationData.teamGoals || null,
          mentorship_preference: registrationData.mentorshipPreference || null,
          availability_pattern: registrationData.availabilityPattern || null,
          project_type_preferences: registrationData.projectTypePreferences || null
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

      // Check if hackathon exists (foreign key constraint)
      const { data: hackathon, error: hackathonError } = await supabase
        .from('hackathons')
        .select('id, title')
        .eq('id', hackathonId)
        .single();

      if (hackathonError || !hackathon) {
        throw new Error('Hackathon not found');
      }

      // Check if user already has a team for this hackathon
      const { data: userTeam, error: userTeamError } = await supabase
        .from('hackathon_teams')
        .select('id, name')
        .eq('hackathon_id', hackathonId)
        .eq('created_by', userId)
        .single();

      if (userTeamError && userTeamError.code !== 'PGRST116') {
        console.error('Error checking existing user team:', userTeamError);
        throw new Error('Failed to validate user team status');
      }

      if (userTeam) {
        throw new Error(`You already have a team "${userTeam.name}" for this hackathon. You can only create one team per hackathon.`);
      }

      // Check if team name already exists for this hackathon (unique constraint)
      const trimmedName = teamData.name.trim();
      const { data: existingTeam, error: checkError } = await supabase
        .from('hackathon_teams')
        .select('id')
        .eq('hackathon_id', hackathonId)
        .eq('name', trimmedName)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing team name:', checkError);
        throw new Error('Failed to validate team name');
      }

      if (existingTeam) {
        throw new Error(`Team name "${trimmedName}" already exists for this hackathon`);
      }

      const teamInsertData = {
        hackathon_id: hackathonId,
        name: trimmedName,
        description: teamData.description?.trim() || null,
        looking_for_members: teamData.lookingForMembers ?? true,
        created_by: userId
      };

      console.log('Attempting to create team with data:', teamInsertData);

      const { data: teamResult, error: teamError } = await supabase
        .from('hackathon_teams')
        .insert(teamInsertData)
        .select()
        .single();

      if (teamError) {
        console.error('Team creation failed with error:', {
          error: teamError,
          code: teamError.code,
          message: teamError.message,
          details: teamError.details,
          hint: teamError.hint
        });
        
        // Handle specific error cases
        if (teamError.code === '23505') { // Unique constraint violation
          throw new Error(`Team name "${trimmedName}" already exists for this hackathon`);
        } else if (teamError.code === '23503') { // Foreign key violation
          throw new Error('Invalid hackathon or user reference');
        } else if (teamError.code === '23514') { // Check constraint violation
          throw new Error('Team name cannot be empty');
        }
        
        this.handleDbError(teamError, 'creating team');
      }

      if (!teamResult) {
        throw new Error('Team creation succeeded but no data returned');
      }

      // Add creator to the team
      await this.addUserToTeam(supabase, hackathonId, userId, teamResult.id);

      return this.transformTeam(teamResult);
    } catch (error) {
      this.handleMethodError(error, 'createTeam');
    }
  }

  /**
   * Create a simple team (MVP version) - consolidated with main createTeam
   */
  static async createSimpleTeam(
    supabase: SupabaseClient,
    hackathonId: string,
    userId: string,
    teamName: string
  ): Promise<HackathonTeam> {
    return this.createTeam(supabase, hackathonId, userId, {
      name: teamName,
      description: '',
      lookingForMembers: true
    });
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
          skill_proficiencies: []
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
   * Join team by team ID (simplified version)
   */
  static async joinTeamById(
    supabase: SupabaseClient,
    teamId: string,
    userId: string
  ): Promise<HackathonParticipant> {
    try {
      // Get team info first
      const { data: team, error: teamError } = await supabase
        .from('hackathon_teams')
        .select('hackathon_id, hackathons!inner(max_team_size)')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        throw new Error('Team not found');
      }

      // Validate team capacity
      const { data: currentMembers, error: membersError } = await supabase
        .from('hackathon_participants')
        .select('id')
        .eq('team_id', teamId);

      if (membersError) {
        this.handleDbError(membersError, 'checking team capacity');
      }

      const currentSize = currentMembers?.length || 0;
      const maxSize = team.hackathons?.[0]?.max_team_size || 10;

      const capacityCheck = validateCapacity(currentSize, maxSize);
      if (!capacityCheck.isValid) {
        throw new Error(capacityCheck.message);
      }

      // Check if user is already in a team for this hackathon
      const { data: existingParticipation, error: participationError } = await supabase
        .from('hackathon_participants')
        .select('team_id')
        .eq('hackathon_id', team.hackathon_id)
        .eq('user_id', userId)
        .single();

      if (participationError && participationError.code !== 'PGRST116') {
        this.handleDbError(participationError, 'checking existing participation');
      }

      if (existingParticipation?.team_id) {
        throw new Error('You are already part of a team for this hackathon');
      }

      // Join the team
      const { data, error } = await supabase
        .from('hackathon_participants')
        .upsert({
          hackathon_id: team.hackathon_id,
          user_id: userId,
          team_id: teamId,
          status: 'team_formed',
          skill_proficiencies: []
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
      this.handleMethodError(error, 'joinTeamById');
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

  /**
   * Delete a team (only if user is the creator)
   */
  static async deleteTeam(
    supabase: SupabaseClient,
    teamId: string,
    userId: string
  ): Promise<void> {
    try {
      // First, verify the user is the creator of the team
      const { data: team, error: teamError } = await supabase
        .from('hackathon_teams')
        .select('id, hackathon_id, name, created_by')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        throw new Error('Team not found');
      }

      if (team.created_by !== userId) {
        throw new Error('You can only delete teams you created');
      }

      // Remove all participants from the team first
      const { error: participantsError } = await supabase
        .from('hackathon_participants')
        .update({ team_id: null, status: 'registered' })
        .eq('team_id', teamId);

      if (participantsError) {
        console.error('Error removing participants from team:', participantsError);
        throw new Error('Failed to remove team members');
      }

      // Delete the team
      const { error: deleteError } = await supabase
        .from('hackathon_teams')
        .delete()
        .eq('id', teamId);

      if (deleteError) {
        this.handleDbError(deleteError, 'deleting team');
      }

      console.log(`Successfully deleted team "${team.name}"`);
    } catch (error) {
      this.handleMethodError(error, 'deleteTeam');
    }
  }

  /**
   * Get chat messages for a team.
   */
  static async getTeamMessages(
    supabase: SupabaseClient,
    teamId: string,
    limit: number = 100
  ): Promise<TeamMessage[]> {
    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select('id, team_id, user_id, content, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        if (this.isUndefinedTableError(error)) return [];
        this.handleDbError(error, 'fetching team messages');
      }

      if (!data || data.length === 0) return [];

      const profileMap = await this.getProfileMapByIds(
        supabase,
        [...new Set(data.map(message => message.user_id).filter(Boolean))]
      );

      return data.map(message => ({
        id: message.id,
        teamId: message.team_id,
        userId: message.user_id,
        content: message.content,
        createdAt: message.created_at,
        user: profileMap.get(message.user_id) || undefined,
      }));
    } catch (error) {
      if (this.isUndefinedTableError(error)) return [];
      this.handleMethodError(error, 'getTeamMessages');
    }
  }

  /**
   * Send a chat message to a team.
   */
  static async sendTeamMessage(
    supabase: SupabaseClient,
    teamId: string,
    userId: string,
    content: string
  ): Promise<TeamMessage> {
    try {
      const trimmed = content.trim();
      if (!trimmed) {
        throw new Error('Message cannot be empty');
      }

      const { data, error } = await supabase
        .from('team_messages')
        .insert({
          team_id: teamId,
          user_id: userId,
          content: trimmed,
        })
        .select('id, team_id, user_id, content, created_at')
        .single();

      if (error || !data) {
        this.handleDbError(error || new Error('Failed to send message'), 'sending team message');
      }

      const profileMap = await this.getProfileMapByIds(supabase, [userId]);
      return {
        id: data.id,
        teamId: data.team_id,
        userId: data.user_id,
        content: data.content,
        createdAt: data.created_at,
        user: profileMap.get(data.user_id) || undefined,
      };
    } catch (error) {
      this.handleMethodError(error, 'sendTeamMessage');
    }
  }

  /**
   * Subscribe to team chat messages via realtime.
   */
  static subscribeToTeamMessages(
    supabase: SupabaseClient,
    teamId: string,
    onMessage: (message: TeamMessage) => void
  ): RealtimeChannel {
    const channel = supabase.channel(`team_messages:${teamId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          const inserted = payload.new as {
            id?: string;
            team_id?: string;
            user_id?: string;
            content?: string;
            created_at?: string;
          };

          if (!inserted.id || !inserted.team_id || !inserted.user_id || !inserted.created_at) {
            return;
          }

          const profileMap = await this.getProfileMapByIds(supabase, [inserted.user_id]);
          onMessage({
            id: inserted.id,
            teamId: inserted.team_id,
            userId: inserted.user_id,
            content: inserted.content || '',
            createdAt: inserted.created_at,
            user: profileMap.get(inserted.user_id) || undefined,
          });
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Find compatible participants for team formation (simplified)
   */
  static async findCompatibleParticipants(
    supabase: SupabaseClient,
    hackathonId: string,
    userId: string,
    limit: number = 10
  ): Promise<HackathonParticipant[]> {
    try {
      const { data: participants, error } = await supabase
        .from('hackathon_participants')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            location
          )
        `)
        .eq('hackathon_id', hackathonId)
        .neq('user_id', userId)
        .is('team_id', null)
        .limit(limit);

      if (error) {
        this.handleDbError(error, 'fetching compatible participants');
      }

      return participants?.map(p => this.transformParticipant(p)) || [];
    } catch (error) {
      this.handleMethodError(error, 'findCompatibleParticipants');
    }
  }

  // ==========================================
  // HELPER METHODS (DRY Principle Applied)
  // ==========================================

  /**
   * Validate skill proficiencies
   */
  private static validateSkillProficiencies(skills: SkillTag[]): { isValid: boolean; message: string } {
    if (!Array.isArray(skills)) {
      return { isValid: false, message: 'Skills must be an array' };
    }

    for (const skill of skills) {
      if (!skill.skill || typeof skill.skill !== 'string') {
        return { isValid: false, message: 'Each skill must have a valid name' };
      }
      if (!skill.proficiency || !['beginner', 'intermediate', 'advanced', 'expert'].includes(skill.proficiency)) {
        return { isValid: false, message: 'Each skill must have a valid proficiency level' };
      }
    }

    return { isValid: true, message: 'Valid' };
  }

  private static async getProfileMapByIds(
    supabase: SupabaseClient,
    userIds: string[]
  ): Promise<Map<string, { fullName: string | null; avatarUrl: string | null }>> {
    const profileMap = new Map<string, { fullName: string | null; avatarUrl: string | null }>();
    if (userIds.length === 0) return profileMap;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    if (error || !data) return profileMap;

    for (const profile of data) {
      profileMap.set(profile.id, {
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
      });
    }

    return profileMap;
  }

  private static isUndefinedTableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const maybeCode = (error as { code?: string }).code;
    return maybeCode === '42P01';
  }


  /**
   * Handle database operation errors consistently
   */
  private static handleDbError(error: unknown, operation: string): never {
    console.error('Database Error', operation + ':', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }

  /**
   * Handle method-level errors consistently
   */
  private static handleMethodError(error: unknown, methodName: string): never {
    console.error('Method Error in', methodName + ':', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
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
   * Get participant count map for multiple hackathons (actual participants, not teams)
   */
  private static async getParticipantCountMap(
    supabase: SupabaseClient,
    hackathonIds: string[]
  ): Promise<Map<string, number>> {
    const participantCountMap = new Map<string, number>();
    
    if (hackathonIds.length === 0) {
      return participantCountMap;
    }

    const { data: participantCounts, error } = await supabase
      .from('hackathon_participants')
      .select('hackathon_id')
      .in('hackathon_id', hackathonIds);

    if (error) {
      this.handleDbError(error, 'fetching participant counts');
    }

    if (participantCounts) {
      participantCounts.forEach(pc => {
        participantCountMap.set(pc.hackathon_id, (participantCountMap.get(pc.hackathon_id) || 0) + 1);
      });
    }

    return participantCountMap;
  }

  /**
   * Get teams map for multiple hackathons
   */
  private static async getTeamsMap(
    supabase: SupabaseClient,
    hackathonIds: string[]
  ): Promise<Map<string, HackathonTeam[]>> {
    const teamsMap = new Map<string, HackathonTeam[]>();
    
    if (hackathonIds.length === 0) {
      return teamsMap;
    }

    try {
      // First, get basic team data
      const { data: teamsData, error: teamsError } = await supabase
        .from('hackathon_teams')
        .select('*')
        .in('hackathon_id', hackathonIds);

      if (teamsError) {
        console.warn('Error fetching teams:', teamsError);
        return teamsMap; // Return empty map instead of throwing
      }

      if (!teamsData || teamsData.length === 0) {
        return teamsMap;
      }

      // Get participant counts for each team
      const teamIds = teamsData.map(t => t.id);
      const { data: participantCounts, error: countError } = await supabase
        .from('hackathon_participants')
        .select('team_id')
        .in('team_id', teamIds);

      if (countError) {
        console.warn('Error fetching participant counts:', countError);
      }

      // Create count map
      const countMap = new Map<string, number>();
      if (participantCounts) {
        participantCounts.forEach(p => {
          if (p.team_id) {
            countMap.set(p.team_id, (countMap.get(p.team_id) || 0) + 1);
          }
        });
      }

      // Transform teams with member counts
      teamsData.forEach(teamData => {
        const hackathonId = teamData.hackathon_id;
        const teams = teamsMap.get(hackathonId) || [];
        const team = this.transformTeam(teamData);
        team.memberCount = countMap.get(team.id) || 0;
        teams.push(team);
        teamsMap.set(hackathonId, teams);
      });

    } catch (error) {
      console.warn('Error in getTeamsMap:', error);
      // Return empty map instead of throwing to prevent page crashes
    }

    return teamsMap;
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
    const capacityValidation = validateCapacity(currentSize, hackathonResult.data?.max_team_size);
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
    const participantData = {
      hackathon_id: hackathonId,
      user_id: userId,
      team_id: teamId,
      status: 'team_formed' as HackathonParticipantStatus,
      skill_proficiencies: []
    };

    console.log('Adding user to team with data:', participantData);

    const { error: participantError } = await supabase
      .from('hackathon_participants')
      .upsert(participantData, {
        onConflict: 'hackathon_id,user_id'
      });

    if (participantError) {
      console.error('Error adding user to team:', {
        error: participantError,
        code: participantError.code,
        message: participantError.message,
        details: participantError.details,
        hint: participantError.hint
      });
      
      // Handle specific error cases
      if (participantError.code === '23503') { // Foreign key violation
        throw new Error('Invalid hackathon, user, or team reference');
      }
      
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
    participantCountMap: Map<string, number>,
    teamsMap: Map<string, HackathonTeam[]>
  ): HackathonEvent {
    const organizerName = dbHackathon.organizers?.name || null;
    const organizerLogoUrl = dbHackathon.organizers?.logo_url || null;

    return {
      id: dbHackathon.id,
      title: dbHackathon.title,
      description: dbHackathon.description || '',
      startDate: dbHackathon.start_date,
      endDate: dbHackathon.end_date,
      location: dbHackathon.location || '',
      organizerId: dbHackathon.organizer_id,
      organizerName: organizerName || undefined,
      organizerLogoUrl,
      headerImageUrl: dbHackathon.header_image_url ?? null,
      registrationDeadline: dbHackathon.registration_deadline,
      submissionDeadline: dbHackathon.submission_deadline,
      maxTeamSize: dbHackathon.max_team_size,
      minTeamSize: dbHackathon.min_team_size,
      platformUrl: dbHackathon.platform_url,
      registrationUrl: dbHackathon.registration_url,
      websiteUrl: dbHackathon.website_url,
      sourceUrl: dbHackathon.source_url,
      status: dbHackathon.status as HackathonStatus,
      isVirtual: dbHackathon.is_virtual,
      eventId: dbHackathon.event_id,
      locationCity: dbHackathon.location_city,
      locationCountry: dbHackathon.location_country,
      locationLatitude: dbHackathon.location_latitude,
      locationLongitude: dbHackathon.location_longitude,
      prizePool: dbHackathon.prize_pool || dbHackathon.prize_description,
      prizeDescription: dbHackathon.prize_description,
      tags: Array.isArray(dbHackathon.tags) ? dbHackathon.tags : [],
      recommendationFeatures: (dbHackathon.recommendation_features as HackathonRecommendationFeatures | null) || null,
      featureVersion: dbHackathon.feature_version,
      userParticipation: userParticipationMap.get(dbHackathon.id),
      teams: teamsMap.get(dbHackathon.id) || [],
      totalParticipants: participantCountMap.get(dbHackathon.id) || 0,
      createdAt: dbHackathon.created_at,
      updatedAt: dbHackathon.updated_at
    };
  }

  /**
   * Transform database team to application type
   */
  private static transformTeam(dbTeam: DatabaseTeam): HackathonTeam {
    return {
      id: dbTeam.id,
      hackathonId: dbTeam.hackathon_id,
      name: dbTeam.name,
      description: dbTeam.description,
      lookingForMembers: dbTeam.looking_for_members,
      createdBy: dbTeam.created_by,
      createdAt: dbTeam.created_at,
      updatedAt: dbTeam.updated_at,
      memberCount: 0, // Will be set by getTeamsMap
      members: [] // Simplified - no member details for now
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
      skills: [], // Will be populated from skillProficiencies if needed
      skillProficiencies: dbParticipant.skill_proficiencies || [],
      preferredTeamRole: dbParticipant.preferred_team_role as TeamRole || undefined,
      collaborationStyle: dbParticipant.collaboration_style as CollaborationStyle[] || undefined,
      teamSizePreference: dbParticipant.team_size_preference as TeamSizePreference || undefined,
      communicationPreferences: dbParticipant.communication_preferences as CommunicationPreference[] || undefined,
      teamGoals: dbParticipant.team_goals || undefined,
      mentorshipPreference: dbParticipant.mentorship_preference as MentorshipPreference || undefined,
      availabilityPattern: dbParticipant.availability_pattern as unknown as Record<string, unknown> || undefined,
      projectTypePreferences: dbParticipant.project_type_preferences || undefined,
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

  /**
   * Simple compatibility scoring based on skill overlap
   */
  static calculateSimpleCompatibility(
    userSkills: string[],
    teamSkills: string[]
  ): number {
    if (teamSkills.length === 0) return 50; // Neutral score for teams with no skills
    
    const overlap = userSkills.filter(skill => teamSkills.includes(skill)).length;
    const totalSkills = Math.max(userSkills.length, teamSkills.length);
    
    return Math.round((overlap / totalSkills) * 100);
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
  header_image_url?: string | null;
  registration_deadline?: string | null;
  submission_deadline?: string | null;
  max_team_size: number;
  min_team_size: number;
  platform_url?: string | null;
  registration_url?: string | null;
  website_url?: string | null;
  source_url?: string | null;
  status: string;
  is_virtual: boolean;
  event_id?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  prize_pool?: string | null;
  prize_description?: string | null;
  tags?: string[] | null;
  recommendation_features?: Record<string, unknown> | null;
  feature_version?: number | null;
  created_at: string;
  updated_at: string;
  organizers?: {
    id: string;
    name: string;
    website_url?: string | null;
    logo_url?: string | null;
    description?: string | null;
  };
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
}

interface DatabaseParticipant {
  id: string;
  hackathon_id: string;
  user_id: string;
  team_id?: string | null;
  status: string;
  skill_proficiencies: SkillTag[];
  preferred_team_role?: string | null;
  collaboration_style?: string[] | null;
  team_size_preference?: string | null;
  communication_preferences?: string[] | null;
  team_goals?: string[] | null;
  mentorship_preference?: string | null;
  availability_pattern?: AvailabilityPattern | null;
  project_type_preferences?: string[] | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    location?: string | null;
  };
  hackathon_teams?: {
    id: string;
    name: string;
    description?: string | null;
    looking_for_members: boolean;
  };
}
