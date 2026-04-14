import type {
  MobileNetworkingContactReference,
  MobileNetworkingContactKind,
  MobileNetworkingState,
  MobileNetworkingStateStatus,
} from '@kurecal/domain';

import type { Database } from '@/types/supabase';
import type { SupabaseClientType } from '@/types/database';

type UserNetworkingContactRow =
  Database['public']['Tables']['user_networking_contacts']['Row'];

interface ProfileReferenceRow {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  headline: string | null;
}

interface SpeakerReferenceRow {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
}

interface EventReferenceRow {
  id: string;
  slug: string | null;
  title: string | null;
  start_time: string;
  location: string | null;
  event_format: string | null;
}

export interface UserNetworkingContact {
  id: string;
  viewerUserId: string;
  targetKind: MobileNetworkingContactKind;
  targetUserId: string | null;
  targetSpeakerId: string | null;
  sourceEventId: string | null;
  linkedinRequestedAt: string | null;
  confirmedConnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HydratedUserNetworkingContact {
  row: UserNetworkingContact;
  contact: MobileNetworkingContactReference;
  networkingState: MobileNetworkingState;
}

function mapRow(row: UserNetworkingContactRow): UserNetworkingContact {
  return {
    id: row.id,
    viewerUserId: row.viewer_user_id,
    targetKind: row.target_kind as MobileNetworkingContactKind,
    targetUserId: row.target_user_id,
    targetSpeakerId: row.target_speaker_id,
    sourceEventId: row.source_event_id,
    linkedinRequestedAt: row.linkedin_requested_at,
    confirmedConnectedAt: row.confirmed_connected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getNetworkingStateStatus(
  contact: Pick<UserNetworkingContact, 'confirmedConnectedAt' | 'linkedinRequestedAt'> | null
): MobileNetworkingStateStatus {
  if (contact?.confirmedConnectedAt) {
    return 'connected';
  }

  if (contact?.linkedinRequestedAt) {
    return 'requested';
  }

  return 'none';
}

function buildSpeakerHeadline(row: SpeakerReferenceRow): string | null {
  const parts = [row.title?.trim() || null, row.company?.trim() || null].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export class UserNetworkingContactService {
  static toNetworkingState(
    contact: Pick<UserNetworkingContact, 'confirmedConnectedAt' | 'linkedinRequestedAt'> | null
  ): MobileNetworkingState {
    return {
      status: getNetworkingStateStatus(contact),
      linkedinRequestedAt: contact?.linkedinRequestedAt ?? null,
      confirmedConnectedAt: contact?.confirmedConnectedAt ?? null,
    };
  }

  static async getContactForTarget(
    params: {
      viewerUserId: string;
      targetKind: MobileNetworkingContactKind;
      targetId: string;
    },
    supabase: SupabaseClientType
  ): Promise<UserNetworkingContact | null> {
    const query = supabase
      .from('user_networking_contacts')
      .select('*')
      .eq('viewer_user_id', params.viewerUserId)
      .eq(
        params.targetKind === 'profile' ? 'target_user_id' : 'target_speaker_id',
        params.targetId
      )
      .maybeSingle();

    const { data, error } = await query;

    if (error) {
      console.error(
        '[UserNetworkingContactService] Error fetching target contact:',
        error
      );
      throw error;
    }

    return data ? mapRow(data) : null;
  }

  static async getAllContactsForViewer(
    viewerUserId: string,
    supabase: SupabaseClientType
  ): Promise<UserNetworkingContact[]> {
    const { data, error } = await supabase
      .from('user_networking_contacts')
      .select('*')
      .eq('viewer_user_id', viewerUserId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error(
        '[UserNetworkingContactService] Error fetching user networking contacts:',
        error
      );
      throw error;
    }

    return (data ?? []).map(mapRow);
  }

  static async applyAction(
    params: {
      viewerUserId: string;
      targetKind: MobileNetworkingContactKind;
      targetId: string;
      action:
        | 'mark_request_sent'
        | 'confirm_connection'
        | 'clear_request'
        | 'clear_connection';
      sourceEventId?: string | null;
    },
    supabase: SupabaseClientType
  ): Promise<UserNetworkingContact | null> {
    const existing = await this.getContactForTarget(
      {
        viewerUserId: params.viewerUserId,
        targetKind: params.targetKind,
        targetId: params.targetId,
      },
      supabase
    );
    const now = new Date().toISOString();
    const nextSourceEventId =
      params.sourceEventId !== undefined
        ? params.sourceEventId
        : existing?.sourceEventId ?? null;

    if (params.action === 'clear_connection') {
      if (!existing) {
        return null;
      }

      const { data, error } = await supabase
        .from('user_networking_contacts')
        .update({
          confirmed_connected_at: null,
          source_event_id: nextSourceEventId,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) {
        console.error(
          '[UserNetworkingContactService] Error clearing confirmed connection:',
          error
        );
        throw error;
      }

      return mapRow(data);
    }

    if (params.action === 'clear_request') {
      if (!existing) {
        return null;
      }

      if (existing.confirmedConnectedAt) {
        const { data, error } = await supabase
          .from('user_networking_contacts')
          .update({
            linkedin_requested_at: null,
            source_event_id: nextSourceEventId,
            updated_at: now,
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) {
          console.error(
            '[UserNetworkingContactService] Error clearing request timestamp:',
            error
          );
          throw error;
        }

        return mapRow(data);
      }

      const { error } = await supabase
        .from('user_networking_contacts')
        .delete()
        .eq('id', existing.id);

      if (error) {
        console.error(
          '[UserNetworkingContactService] Error deleting user networking contact:',
          error
        );
        throw error;
      }

      return null;
    }

    const payload = {
      viewer_user_id: params.viewerUserId,
      target_kind: params.targetKind,
      target_user_id: params.targetKind === 'profile' ? params.targetId : null,
      target_speaker_id: params.targetKind === 'speaker' ? params.targetId : null,
      source_event_id: nextSourceEventId,
      linkedin_requested_at:
        params.action === 'mark_request_sent'
          ? now
          : existing?.linkedinRequestedAt ?? null,
      confirmed_connected_at:
        params.action === 'confirm_connection'
          ? now
          : existing?.confirmedConnectedAt ?? null,
      updated_at: now,
    };

    const query = existing
      ? supabase
          .from('user_networking_contacts')
          .update(payload)
          .eq('id', existing.id)
          .select('*')
          .single()
      : supabase
          .from('user_networking_contacts')
          .insert(payload)
          .select('*')
          .single();

    const { data, error } = await query;

    if (error) {
      console.error(
        '[UserNetworkingContactService] Error upserting user networking contact:',
        error
      );
      throw error;
    }

    return mapRow(data);
  }

  static async hydrateContact(
    contact: UserNetworkingContact,
    readClient: SupabaseClientType
  ): Promise<HydratedUserNetworkingContact | null> {
    const [result] = await this.hydrateContacts([contact], readClient);
    return result ?? null;
  }

  static async hydrateTarget(
    params: {
      targetKind: MobileNetworkingContactKind;
      targetId: string;
      sourceEventId?: string | null;
    },
    readClient: SupabaseClientType
  ): Promise<MobileNetworkingContactReference | null> {
    const hydrated = await this.hydrateContact(
      {
        id: `preview:${params.targetKind}:${params.targetId}`,
        viewerUserId: '',
        targetKind: params.targetKind,
        targetUserId: params.targetKind === 'profile' ? params.targetId : null,
        targetSpeakerId: params.targetKind === 'speaker' ? params.targetId : null,
        sourceEventId: params.sourceEventId ?? null,
        linkedinRequestedAt: null,
        confirmedConnectedAt: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
      readClient
    );

    return hydrated?.contact ?? null;
  }

  static async hydrateContacts(
    contacts: UserNetworkingContact[],
    readClient: SupabaseClientType
  ): Promise<HydratedUserNetworkingContact[]> {
    if (contacts.length === 0) {
      return [];
    }

    const profileIds = Array.from(
      new Set(
        contacts
          .map((contact) => contact.targetUserId)
          .filter((value): value is string => Boolean(value))
      )
    );
    const speakerIds = Array.from(
      new Set(
        contacts
          .map((contact) => contact.targetSpeakerId)
          .filter((value): value is string => Boolean(value))
      )
    );
    const eventIds = Array.from(
      new Set(
        contacts
          .map((contact) => contact.sourceEventId)
          .filter((value): value is string => Boolean(value))
      )
    );

    const [profilesResult, speakersResult, eventsResult] = await Promise.all([
      profileIds.length > 0
        ? readClient
            .from('profiles')
            .select('id, full_name, username, avatar_url, headline')
            .in('id', profileIds)
        : Promise.resolve({ data: [], error: null }),
      speakerIds.length > 0
        ? readClient
            .from('speakers')
            .select('id, name, title, company, photo_url, linkedin_url')
            .in('id', speakerIds)
        : Promise.resolve({ data: [], error: null }),
      eventIds.length > 0
        ? readClient
            .from('events')
            .select('id, slug, title, start_time, location, event_format')
            .in('id', eventIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profilesResult.error) {
      throw new Error('Failed to hydrate networking profile contacts.');
    }

    if (speakersResult.error) {
      throw new Error('Failed to hydrate networking speaker contacts.');
    }

    if (eventsResult.error) {
      throw new Error('Failed to hydrate networking source events.');
    }

    const profilesById = new Map(
      ((profilesResult.data ?? []) as ProfileReferenceRow[]).map((row) => [
        row.id,
        row,
      ])
    );
    const speakersById = new Map(
      ((speakersResult.data ?? []) as SpeakerReferenceRow[]).map((row) => [
        row.id,
        row,
      ])
    );
    const eventsById = new Map(
      ((eventsResult.data ?? []) as EventReferenceRow[]).map((row) => [
        row.id,
        row,
      ])
    );

    return contacts.flatMap<HydratedUserNetworkingContact>((contact) => {
      const sourceEvent = contact.sourceEventId
        ? eventsById.get(contact.sourceEventId)
        : null;
      const sourceEventPayload = sourceEvent
        ? {
            id: sourceEvent.id,
            slug: sourceEvent.slug ?? sourceEvent.id,
            title: sourceEvent.title?.trim() || 'Untitled event',
            startTime: sourceEvent.start_time,
            location: sourceEvent.location,
            format: sourceEvent.event_format,
          }
        : null;

      if (contact.targetKind === 'profile' && contact.targetUserId) {
        const profile = profilesById.get(contact.targetUserId);
        if (!profile) {
          return [];
        }

        return [
          {
            row: contact,
            contact: {
              kind: 'profile',
              id: profile.id,
              username: profile.username,
              name:
                profile.full_name?.trim() ||
                (profile.username ? `@${profile.username}` : 'Unknown profile'),
              avatarUrl: profile.avatar_url,
              headline: profile.headline,
              linkedinUrl: null,
              sourceEvent: sourceEventPayload,
            },
            networkingState: this.toNetworkingState(contact),
          },
        ];
      }

      if (contact.targetKind === 'speaker' && contact.targetSpeakerId) {
        const speaker = speakersById.get(contact.targetSpeakerId);
        if (!speaker) {
          return [];
        }

        return [
          {
            row: contact,
            contact: {
              kind: 'speaker',
              id: speaker.id,
              username: null,
              name: speaker.name,
              avatarUrl: speaker.photo_url,
              headline: buildSpeakerHeadline(speaker),
              linkedinUrl: speaker.linkedin_url,
              sourceEvent: sourceEventPayload,
            },
            networkingState: this.toNetworkingState(contact),
          },
        ];
      }

      return [];
    });
  }
}
