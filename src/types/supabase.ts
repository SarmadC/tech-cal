export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agenda_speakers: {
        Row: {
          agenda_id: string
          created_at: string | null
          speaker_id: string
        }
        Insert: {
          agenda_id: string
          created_at?: string | null
          speaker_id: string
        }
        Update: {
          agenda_id?: string
          created_at?: string | null
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_speakers_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "event_agenda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_speakers_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          access_token_secret_id: string | null
          calendar_id: string
          created_at: string
          has_refresh_token: boolean
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          provider: string
          refresh_token: string | null
          refresh_token_secret_id: string | null
          token_expiry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          access_token_secret_id?: string | null
          calendar_id: string
          created_at?: string
          has_refresh_token?: boolean
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          provider?: string
          refresh_token?: string | null
          refresh_token_secret_id?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          access_token_secret_id?: string | null
          calendar_id?: string
          created_at?: string
          has_refresh_token?: boolean
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          provider?: string
          refresh_token?: string | null
          refresh_token_secret_id?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      career_impact_analytics: {
        Row: {
          algorithm_version: string
          event_id: string | null
          experiment_variant: string | null
          id: string
          measured_at: string | null
          metric_type: string
          metric_value: number
          user_id: string
        }
        Insert: {
          algorithm_version: string
          event_id?: string | null
          experiment_variant?: string | null
          id?: string
          measured_at?: string | null
          metric_type: string
          metric_value: number
          user_id: string
        }
        Update: {
          algorithm_version?: string
          event_id?: string | null
          experiment_variant?: string | null
          id?: string
          measured_at?: string | null
          metric_type?: string
          metric_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_impact_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_impact_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_impact_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_impact_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "career_impact_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      career_impact_cache: {
        Row: {
          cache_key: string
          cache_value: Json
          created_at: string | null
          expires_at: string
          id: string
          updated_at: string | null
        }
        Insert: {
          cache_key: string
          cache_value: Json
          created_at?: string | null
          expires_at: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          cache_key?: string
          cache_value?: Json
          created_at?: string | null
          expires_at?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      career_impact_scores: {
        Row: {
          algorithm_version: string
          calculated_at: string | null
          career_impact_category: string | null
          career_profile_hash: string
          career_stage_score: number | null
          confidence: number
          event_data_hash: string
          event_id: string
          id: string
          industry_relevance_score: number | null
          matched_skills: string[] | null
          networking_score: number | null
          overall_score: number
          reasons: string[]
          skill_relevance_score: number | null
          speaker_highlights: string[] | null
          timing_bonus: number | null
          user_id: string
        }
        Insert: {
          algorithm_version?: string
          calculated_at?: string | null
          career_impact_category?: string | null
          career_profile_hash: string
          career_stage_score?: number | null
          confidence: number
          event_data_hash: string
          event_id: string
          id?: string
          industry_relevance_score?: number | null
          matched_skills?: string[] | null
          networking_score?: number | null
          overall_score: number
          reasons?: string[]
          skill_relevance_score?: number | null
          speaker_highlights?: string[] | null
          timing_bonus?: number | null
          user_id: string
        }
        Update: {
          algorithm_version?: string
          calculated_at?: string | null
          career_impact_category?: string | null
          career_profile_hash?: string
          career_stage_score?: number | null
          confidence?: number
          event_data_hash?: string
          event_id?: string
          id?: string
          industry_relevance_score?: number | null
          matched_skills?: string[] | null
          networking_score?: number | null
          overall_score?: number
          reasons?: string[]
          skill_relevance_score?: number | null
          speaker_highlights?: string[] | null
          timing_bonus?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_impact_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_impact_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_impact_scores_profile_snapshot_fkey"
            columns: ["user_id", "career_profile_hash"]
            isOneToOne: false
            referencedRelation: "career_profile_snapshots"
            referencedColumns: ["user_id", "profile_hash"]
          },
          {
            foreignKeyName: "career_impact_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_impact_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "career_impact_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      career_profile_snapshots: {
        Row: {
          created_at: string | null
          id: string
          profile_data: Json
          profile_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_data: Json
          profile_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_data?: Json
          profile_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_profile_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_profile_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "career_profile_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      career_profiles: {
        Row: {
          available_time:
            | Database["public"]["Enums"]["available_time_enum"]
            | null
          budget: Database["public"]["Enums"]["budget_range_enum"] | null
          career_goals: Database["public"]["Enums"]["career_goal_enum"][]
          company_size: Database["public"]["Enums"]["company_size_enum"] | null
          created_at: string
          current_role: string
          industry: string
          interests: string[]
          learning_style: Database["public"]["Enums"]["learning_style_enum"][]
          networking_goals: Database["public"]["Enums"]["networking_goal_enum"][]
          preferred_event_types: Database["public"]["Enums"]["career_event_type_enum"][]
          primary_skills: string[]
          seniority: Database["public"]["Enums"]["seniority_level"]
          skill_tags: Json
          skills_to_learn: string[]
          timeframe: Database["public"]["Enums"]["career_timeframe_enum"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_time?:
            | Database["public"]["Enums"]["available_time_enum"]
            | null
          budget?: Database["public"]["Enums"]["budget_range_enum"] | null
          career_goals?: Database["public"]["Enums"]["career_goal_enum"][]
          company_size?: Database["public"]["Enums"]["company_size_enum"] | null
          created_at?: string
          current_role: string
          industry: string
          interests?: string[]
          learning_style?: Database["public"]["Enums"]["learning_style_enum"][]
          networking_goals?: Database["public"]["Enums"]["networking_goal_enum"][]
          preferred_event_types?: Database["public"]["Enums"]["career_event_type_enum"][]
          primary_skills?: string[]
          seniority: Database["public"]["Enums"]["seniority_level"]
          skill_tags?: Json
          skills_to_learn?: string[]
          timeframe?:
            | Database["public"]["Enums"]["career_timeframe_enum"]
            | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_time?:
            | Database["public"]["Enums"]["available_time_enum"]
            | null
          budget?: Database["public"]["Enums"]["budget_range_enum"] | null
          career_goals?: Database["public"]["Enums"]["career_goal_enum"][]
          company_size?: Database["public"]["Enums"]["company_size_enum"] | null
          created_at?: string
          current_role?: string
          industry?: string
          interests?: string[]
          learning_style?: Database["public"]["Enums"]["learning_style_enum"][]
          networking_goals?: Database["public"]["Enums"]["networking_goal_enum"][]
          preferred_event_types?: Database["public"]["Enums"]["career_event_type_enum"][]
          primary_skills?: string[]
          seniority?: Database["public"]["Enums"]["seniority_level"]
          skill_tags?: Json
          skills_to_learn?: string[]
          timeframe?:
            | Database["public"]["Enums"]["career_timeframe_enum"]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "career_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      event_dedupe_candidates: {
        Row: {
          candidate_event_id: string | null
          confidence: number | null
          created_at: string
          id: string
          ingestion_id: string
          resolution: Database["public"]["Enums"]["event_dedupe_resolution_enum"]
          resolution_notes: string | null
          resolved_at: string | null
        }
        Insert: {
          candidate_event_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          ingestion_id: string
          resolution?: Database["public"]["Enums"]["event_dedupe_resolution_enum"]
          resolution_notes?: string | null
          resolved_at?: string | null
        }
        Update: {
          candidate_event_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          ingestion_id?: string
          resolution?: Database["public"]["Enums"]["event_dedupe_resolution_enum"]
          resolution_notes?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_dedupe_candidates_ingestion_id_fkey"
            columns: ["ingestion_id"]
            isOneToOne: false
            referencedRelation: "event_ingestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dedupe_candidates_candidate_event_id_fkey"
            columns: ["candidate_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dedupe_candidates_candidate_event_id_fkey"
            columns: ["candidate_event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ingestions: {
        Row: {
          created_at: string
          dedupe_notes: string | null
          dedupe_resolution:
            | Database["public"]["Enums"]["event_dedupe_resolution_enum"]
            | null
          external_id: string | null
          id: string
          ingested_at: string
          ingestion_details: Json
          ingestion_method: Database["public"]["Enums"]["event_ingestion_method_enum"]
          ingestion_state: Database["public"]["Enums"]["event_ingestion_state_enum"]
          normalized_hash: string
          processed_at: string | null
          quality_score_snapshot: number | null
          raw_payload_id: string | null
          raw_start_time: string | null
          raw_title: string | null
          source_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dedupe_notes?: string | null
          dedupe_resolution?:
            | Database["public"]["Enums"]["event_dedupe_resolution_enum"]
            | null
          external_id?: string | null
          id?: string
          ingested_at?: string
          ingestion_details?: Json
          ingestion_method?: Database["public"]["Enums"]["event_ingestion_method_enum"]
          ingestion_state?: Database["public"]["Enums"]["event_ingestion_state_enum"]
          normalized_hash: string
          processed_at?: string | null
          quality_score_snapshot?: number | null
          raw_payload_id?: string | null
          raw_start_time?: string | null
          raw_title?: string | null
          source_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dedupe_notes?: string | null
          dedupe_resolution?:
            | Database["public"]["Enums"]["event_dedupe_resolution_enum"]
            | null
          external_id?: string | null
          id?: string
          ingested_at?: string
          ingestion_details?: Json
          ingestion_method?: Database["public"]["Enums"]["event_ingestion_method_enum"]
          ingestion_state?: Database["public"]["Enums"]["event_ingestion_state_enum"]
          normalized_hash?: string
          processed_at?: string | null
          quality_score_snapshot?: number | null
          raw_payload_id?: string | null
          raw_start_time?: string | null
          raw_title?: string | null
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ingestions_raw_payload_id_fkey"
            columns: ["raw_payload_id"]
            isOneToOne: false
            referencedRelation: "event_raw_payloads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ingestions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "event_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      event_raw_payloads: {
        Row: {
          external_id: string | null
          id: string
          payload: Json
          payload_hash: string
          received_at: string
          source_id: string
        }
        Insert: {
          external_id?: string | null
          id?: string
          payload: Json
          payload_hash: string
          received_at?: string
          source_id: string
        }
        Update: {
          external_id?: string | null
          id?: string
          payload?: Json
          payload_hash?: string
          received_at?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_raw_payloads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "event_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      event_source_metrics: {
        Row: {
          average_quality_score: number | null
          created_at: string
          events_ingested: number
          events_published: number
          id: string
          last_active_at: string | null
          metadata: Json
          rejection_rate: number
          source_id: string
          timeframe: string
        }
        Insert: {
          average_quality_score?: number | null
          created_at?: string
          events_ingested?: number
          events_published?: number
          id?: string
          last_active_at?: string | null
          metadata?: Json
          rejection_rate?: number
          source_id: string
          timeframe: string
        }
        Update: {
          average_quality_score?: number | null
          created_at?: string
          events_ingested?: number
          events_published?: number
          id?: string
          last_active_at?: string | null
          metadata?: Json
          rejection_rate?: number
          source_id?: string
          timeframe?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_source_metrics_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "event_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sources: {
        Row: {
          channel: string | null
          contact_email: string | null
          contact_notes: string | null
          created_at: string
          default_quality_score: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          region: string | null
          slug: string
          source_type: Database["public"]["Enums"]["event_source_type_enum"]
          tags: string[] | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          channel?: string | null
          contact_email?: string | null
          contact_notes?: string | null
          created_at?: string
          default_quality_score?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          region?: string | null
          slug: string
          source_type?: Database["public"]["Enums"]["event_source_type_enum"]
          tags?: string[] | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          channel?: string | null
          contact_email?: string | null
          contact_notes?: string | null
          created_at?: string
          default_quality_score?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          region?: string | null
          slug?: string
          source_type?: Database["public"]["Enums"]["event_source_type_enum"]
          tags?: string[] | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      event_agenda: {
        Row: {
          agenda_type: string | null
          capacity: number | null
          created_at: string | null
          day_number: number
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          end_time: string | null
          event_id: string
          id: string
          is_required: boolean | null
          location: string | null
          prerequisites: string | null
          sort_order: number | null
          start_time: string
          title: string
          track: string | null
          updated_at: string | null
        }
        Insert: {
          agenda_type?: string | null
          capacity?: number | null
          created_at?: string | null
          day_number: number
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          event_id: string
          id?: string
          is_required?: boolean | null
          location?: string | null
          prerequisites?: string | null
          sort_order?: number | null
          start_time: string
          title: string
          track?: string | null
          updated_at?: string | null
        }
        Update: {
          agenda_type?: string | null
          capacity?: number | null
          created_at?: string | null
          day_number?: number
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          event_id?: string
          id?: string
          is_required?: boolean | null
          location?: string | null
          prerequisites?: string | null
          sort_order?: number | null
          start_time?: string
          title?: string
          track?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_agenda_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_agenda_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          actual_value_rating: number | null
          career_benefit: string | null
          connections_made: number | null
          event_attended: boolean
          event_id: string
          feedback_date: string | null
          feedback_text: string | null
          id: string
          predicted_score: number
          skills_gained: string[] | null
          user_id: string
          would_recommend: boolean | null
        }
        Insert: {
          actual_value_rating?: number | null
          career_benefit?: string | null
          connections_made?: number | null
          event_attended?: boolean
          event_id: string
          feedback_date?: string | null
          feedback_text?: string | null
          id?: string
          predicted_score: number
          skills_gained?: string[] | null
          user_id: string
          would_recommend?: boolean | null
        }
        Update: {
          actual_value_rating?: number | null
          career_benefit?: string | null
          connections_made?: number | null
          event_attended?: boolean
          event_id?: string
          feedback_date?: string | null
          feedback_text?: string | null
          id?: string
          predicted_score?: number
          skills_gained?: string[] | null
          user_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      event_moderation_queue: {
        Row: {
          created_at: string
          event_id: string | null
          feedback: Json | null
          id: string
          ingestion_quality_score: number
          reason_codes: string[] | null
          recommended_tags: string[] | null
          reviewed_at: string | null
          reviewer_id: string | null
          source_event_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          feedback?: Json | null
          id?: string
          ingestion_quality_score: number
          reason_codes?: string[] | null
          recommended_tags?: string[] | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          source_event_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          feedback?: Json | null
          id?: string
          ingestion_quality_score?: number
          reason_codes?: string[] | null
          recommended_tags?: string[] | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          source_event_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_moderation_queue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_moderation_queue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_moderation_queue_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "source_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_prerequisites: {
        Row: {
          event_id: string
          prerequisite_id: string
        }
        Insert: {
          event_id: string
          prerequisite_id: string
        }
        Update: {
          event_id?: string
          prerequisite_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_prerequisites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_prerequisites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_prerequisites_prerequisite_id_fkey"
            columns: ["prerequisite_id"]
            isOneToOne: false
            referencedRelation: "prerequisites"
            referencedColumns: ["id"]
          },
        ]
      }
      event_series: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          organizer_id: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organizer_id?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organizer_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_series_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sync_log: {
        Row: {
          changes_detected: Json | null
          error_message: string | null
          event_id: string
          ingestion_id: string | null
          id: string
          processing_time_ms: number | null
          source_id: string | null
          sync_result: string
          sync_type: string
          synced_at: string | null
        }
        Insert: {
          changes_detected?: Json | null
          error_message?: string | null
          event_id: string
          ingestion_id?: string | null
          id?: string
          processing_time_ms?: number | null
          source_id?: string | null
          sync_result: string
          sync_type: string
          synced_at?: string | null
        }
        Update: {
          changes_detected?: Json | null
          error_message?: string | null
          event_id?: string
          ingestion_id?: string | null
          id?: string
          processing_time_ms?: number | null
          source_id?: string | null
          sync_result?: string
          sync_type?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sync_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sync_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sync_log_ingestion_id_fkey"
            columns: ["ingestion_id"]
            isOneToOne: false
            referencedRelation: "event_ingestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sync_log_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "event_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tag_relations: {
        Row: {
          created_at: string | null
          event_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tag_relations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tag_relations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "event_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tags: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          event_tag: string
          id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          event_tag: string
          id?: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          event_tag?: string
          id?: string
        }
        Relationships: []
      }
      event_target_audiences: {
        Row: {
          audience_id: string
          event_id: string
        }
        Insert: {
          audience_id: string
          event_id: string
        }
        Update: {
          audience_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_target_audiences_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "target_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_target_audiences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_target_audiences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      event_type: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string | null
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          accessibility_features: Json | null
          agenda_url: string | null
          attendee_count: number | null
          capacity: number | null
          certificate_offered: boolean | null
          created_at: string
          currency: string | null
          daily_schedule: Json | null
          description: string | null
          difficulty_level: string | null
          end_time: string | null
          event_format: Database["public"]["Enums"]["event_format_enum"] | null
          event_image_url: string | null
          event_pattern: string | null
          enrichment_metadata: Json | null
          enrichment_status: string | null
          event_type_id: string | null
          external_id: string | null
          external_status: string | null
          fts: unknown
          id: string
          ingestion_confidence: number | null
          ingestion_provenance: Json | null
          ingestion_quality_score: number | null
          ingestion_source_id: string | null
          is_multi_day: boolean | null
          language: string | null
          last_synced_at: string | null
          livestream_url: string | null
          location: string | null
          organizer_id: string | null
          prerequisites: string | null
          price_max: number | null
          price_min: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type_enum"] | null
          recording_available: boolean | null
          registration_deadline: string | null
          registration_url: string | null
          series_id: string | null
          social_media_hashtag: string | null
          source_url: string | null
          source_id: string | null
          source_quality_score: number | null
          source_last_verified: string | null
          ingested_at: string | null
          ingestion_method:
            | Database["public"]["Enums"]["event_ingestion_method_enum"]
            | null
          ingestion_id: string | null
          raw_data_hash: string | null
          speaker_lineup: Json | null
          start_time: string
          status: string | null
          status_enum: Database["public"]["Enums"]["event_status_enum"] | null
          sync_error_count: number | null
          target_audience: string | null
          timezone: string | null
          title: string
          updated_at: string | null
          venue_id: string | null
          virtual_platform: string | null
        }
        Insert: {
          accessibility_features?: Json | null
          agenda_url?: string | null
          attendee_count?: number | null
          capacity?: number | null
          certificate_offered?: boolean | null
          created_at?: string
          currency?: string | null
          daily_schedule?: Json | null
          description?: string | null
          difficulty_level?: string | null
          end_time?: string | null
          event_format?: Database["public"]["Enums"]["event_format_enum"] | null
          event_image_url?: string | null
          event_pattern?: string | null
          enrichment_metadata?: Json | null
          enrichment_status?: string | null
          event_type_id?: string | null
          external_id?: string | null
          external_status?: string | null
          fts?: unknown
          id?: string
          ingestion_confidence?: number | null
          ingestion_provenance?: Json | null
          ingestion_quality_score?: number | null
          ingestion_source_id?: string | null
          is_multi_day?: boolean | null
          language?: string | null
          last_synced_at?: string | null
          livestream_url?: string | null
          location?: string | null
          organizer_id?: string | null
          prerequisites?: string | null
          price_max?: number | null
          price_min?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type_enum"] | null
          recording_available?: boolean | null
          registration_deadline?: string | null
          registration_url?: string | null
          series_id?: string | null
          social_media_hashtag?: string | null
          source_url?: string | null
          source_id?: string | null
          source_quality_score?: number | null
          source_last_verified?: string | null
          ingested_at?: string | null
          ingestion_method?:
            | Database["public"]["Enums"]["event_ingestion_method_enum"]
            | null
          ingestion_id?: string | null
          raw_data_hash?: string | null
          speaker_lineup?: Json | null
          start_time: string
          status?: string | null
          status_enum?: Database["public"]["Enums"]["event_status_enum"] | null
          sync_error_count?: number | null
          target_audience?: string | null
          timezone?: string | null
          title: string
          updated_at?: string | null
          venue_id?: string | null
          virtual_platform?: string | null
        }
        Update: {
          accessibility_features?: Json | null
          agenda_url?: string | null
          attendee_count?: number | null
          capacity?: number | null
          certificate_offered?: boolean | null
          created_at?: string
          currency?: string | null
          daily_schedule?: Json | null
          description?: string | null
          difficulty_level?: string | null
          end_time?: string | null
          event_format?: Database["public"]["Enums"]["event_format_enum"] | null
          event_image_url?: string | null
          event_pattern?: string | null
          enrichment_metadata?: Json | null
          enrichment_status?: string | null
          event_type_id?: string | null
          external_id?: string | null
          external_status?: string | null
          fts?: unknown
          id?: string
          ingestion_confidence?: number | null
          ingestion_provenance?: Json | null
          ingestion_quality_score?: number | null
          ingestion_source_id?: string | null
          is_multi_day?: boolean | null
          language?: string | null
          last_synced_at?: string | null
          livestream_url?: string | null
          location?: string | null
          organizer_id?: string | null
          prerequisites?: string | null
          price_max?: number | null
          price_min?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type_enum"] | null
          recording_available?: boolean | null
          registration_deadline?: string | null
          registration_url?: string | null
          series_id?: string | null
          social_media_hashtag?: string | null
          source_url?: string | null
          source_id?: string | null
          source_quality_score?: number | null
          source_last_verified?: string | null
          ingested_at?: string | null
          ingestion_method?:
            | Database["public"]["Enums"]["event_ingestion_method_enum"]
            | null
          ingestion_id?: string | null
          raw_data_hash?: string | null
          speaker_lineup?: Json | null
          start_time?: string
          status?: string | null
          status_enum?: Database["public"]["Enums"]["event_status_enum"] | null
          sync_error_count?: number | null
          target_audience?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
          venue_id?: string | null
          virtual_platform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_type_analytics"
            referencedColumns: ["event_type_id"]
          },
          {
            foreignKeyName: "events_ingestion_source_id_fkey"
            columns: ["ingestion_source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_organizer"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_series"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_ingestion_id_fkey"
            columns: ["ingestion_id"]
            isOneToOne: false
            referencedRelation: "event_ingestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "event_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_job_log: {
        Row: {
          adapter: string | null
          cache_hit: boolean | null
          completed_at: string | null
          confidence: number | null
          decision: string
          duration_ms: number | null
          error: Json | null
          event_id: string | null
          firecrawl_credits_spent: number | null
          firecrawl_used: boolean
          id: string
          metadata: Json | null
          normalized_url: string
          parser_version: string | null
          source_domain: string | null
          source_url: string
          started_at: string
          status: string
        }
        Insert: {
          adapter?: string | null
          cache_hit?: boolean | null
          completed_at?: string | null
          confidence?: number | null
          decision: string
          duration_ms?: number | null
          error?: Json | null
          event_id?: string | null
          firecrawl_credits_spent?: number | null
          firecrawl_used: boolean
          id?: string
          metadata?: Json | null
          normalized_url: string
          parser_version?: string | null
          source_domain?: string | null
          source_url: string
          started_at?: string
          status: string
        }
        Update: {
          adapter?: string | null
          cache_hit?: boolean | null
          completed_at?: string | null
          confidence?: number | null
          decision?: string
          duration_ms?: number | null
          error?: Json | null
          event_id?: string | null
          firecrawl_credits_spent?: number | null
          firecrawl_used?: boolean
          id?: string
          metadata?: Json | null
          normalized_url?: string
          parser_version?: string | null
          source_domain?: string | null
          source_url?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_job_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      page_cache: {
        Row: {
          content_hash: string
          etag: string | null
          expires_at: string | null
          extracted: Json | null
          fetch_metadata: Json | null
          fetched_at: string
          id: string
          last_modified: string | null
          last_seen_at: string
          normalized_url: string
          raw_html: string | null
          source_domain: string | null
          status_code: number | null
        }
        Insert: {
          content_hash: string
          etag?: string | null
          expires_at?: string | null
          extracted?: Json | null
          fetch_metadata?: Json | null
          fetched_at?: string
          id?: string
          last_modified?: string | null
          last_seen_at?: string
          normalized_url: string
          raw_html?: string | null
          source_domain?: string | null
          status_code?: number | null
        }
        Update: {
          content_hash?: string
          etag?: string | null
          expires_at?: string | null
          extracted?: Json | null
          fetch_metadata?: Json | null
          fetched_at?: string
          id?: string
          last_modified?: string | null
          last_seen_at?: string
          normalized_url?: string
          raw_html?: string | null
          source_domain?: string | null
          status_code?: number | null
        }
        Relationships: []
      }
      hackathon_participants: {
        Row: {
          availability_pattern: Json | null
          collaboration_style: string[] | null
          communication_preferences: string[] | null
          created_at: string | null
          hackathon_id: string
          id: string
          mentorship_preference: string | null
          preferred_team_role: string | null
          project_type_preferences: string[] | null
          skill_proficiencies: Json | null
          status: string | null
          team_goals: string[] | null
          team_id: string | null
          team_size_preference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          availability_pattern?: Json | null
          collaboration_style?: string[] | null
          communication_preferences?: string[] | null
          created_at?: string | null
          hackathon_id: string
          id?: string
          mentorship_preference?: string | null
          preferred_team_role?: string | null
          project_type_preferences?: string[] | null
          skill_proficiencies?: Json | null
          status?: string | null
          team_goals?: string[] | null
          team_id?: string | null
          team_size_preference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          availability_pattern?: Json | null
          collaboration_style?: string[] | null
          communication_preferences?: string[] | null
          created_at?: string | null
          hackathon_id?: string
          id?: string
          mentorship_preference?: string | null
          preferred_team_role?: string | null
          project_type_preferences?: string[] | null
          skill_proficiencies?: Json | null
          status?: string | null
          team_goals?: string[] | null
          team_id?: string | null
          team_size_preference?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_participants_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_teams: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          hackathon_id: string
          id: string
          looking_for_members: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          hackathon_id: string
          id?: string
          looking_for_members?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          hackathon_id?: string
          id?: string
          looking_for_members?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_teams_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathons: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_virtual: boolean | null
          location: string | null
          max_team_size: number | null
          organizer_id: string | null
          platform_url: string | null
          registration_deadline: string | null
          registration_url: string | null
          start_date: string
          status: string | null
          submission_deadline: string | null
          title: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_virtual?: boolean | null
          location?: string | null
          max_team_size?: number | null
          organizer_id?: string | null
          platform_url?: string | null
          registration_deadline?: string | null
          registration_url?: string | null
          start_date: string
          status?: string | null
          submission_deadline?: string | null
          title: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_virtual?: boolean | null
          location?: string | null
          max_team_size?: number | null
          organizer_id?: string | null
          platform_url?: string | null
          registration_deadline?: string | null
          registration_url?: string | null
          start_date?: string
          status?: string | null
          submission_deadline?: string | null
          title?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathons_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_errors: {
        Row: {
          created_at: string
          error_details: Json | null
          error_message: string
          error_type: string
          id: string
          job_id: string | null
          source_event_id: string | null
          source_id: string | null
          stack_trace: string | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          error_message: string
          error_type: string
          id?: string
          job_id?: string | null
          source_event_id?: string | null
          source_id?: string | null
          stack_trace?: string | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          job_id?: string | null
          source_event_id?: string | null
          source_id?: string | null
          stack_trace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ingestion_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_errors_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "source_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_errors_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          errors_count: number | null
          events_fetched: number | null
          events_normalized: number | null
          id: string
          metadata: Json | null
          source_id: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          errors_count?: number | null
          events_fetched?: number | null
          events_normalized?: number | null
          id?: string
          metadata?: Json | null
          source_id: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          errors_count?: number | null
          events_fetched?: number | null
          events_normalized?: number | null
          id?: string
          metadata?: Json | null
          source_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_sources: {
        Row: {
          access_type: string
          created_at: string
          fetch_interval_minutes: number | null
          id: string
          is_active: boolean
          last_fetched_at: string | null
          metadata: Json | null
          name: string
          source_type: string
          source_url: string
          trust_score: number | null
          updated_at: string
        }
        Insert: {
          access_type: string
          created_at?: string
          fetch_interval_minutes?: number | null
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          metadata?: Json | null
          name: string
          source_type: string
          source_url: string
          trust_score?: number | null
          updated_at?: string
        }
        Update: {
          access_type?: string
          created_at?: string
          fetch_interval_minutes?: number | null
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          metadata?: Json | null
          name?: string
          source_type?: string
          source_url?: string
          trust_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      organizers: {
        Row: {
          auto_discovered: boolean
          created_at: string | null
          description: string | null
          domain: string | null
          id: string
          logo_url: string | null
          name: string
          social_media: Json | null
          trust_score: number | null
          website_url: string | null
        }
        Insert: {
          auto_discovered?: boolean
          created_at?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name: string
          social_media?: Json | null
          trust_score?: number | null
          website_url?: string | null
        }
        Update: {
          auto_discovered?: boolean
          created_at?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          social_media?: Json | null
          trust_score?: number | null
          website_url?: string | null
        }
        Relationships: []
      }
      post_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured: boolean
          featured_image_url: string | null
          fts: unknown
          id: string
          published_at: string | null
          read_time_minutes: number | null
          slug: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          featured_image_url?: string | null
          fts?: unknown
          id?: string
          published_at?: string | null
          read_time_minutes?: number | null
          slug: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          featured_image_url?: string | null
          fts?: unknown
          id?: string
          published_at?: string | null
          read_time_minutes?: number | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "post_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      prerequisites: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          analytics_consent: boolean | null
          analytics_consent_date: string | null
          avatar_url: string | null
          bookmark_count_today: number | null
          created_at: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          last_bookmark_at: string | null
          location: string | null
          preferences: Json | null
          recommendation_preferences: Json | null
          team_preferences: Json | null
          timezone: string | null
          tracked_events_count: number | null
          updated_at: string | null
        }
        Insert: {
          analytics_consent?: boolean | null
          analytics_consent_date?: string | null
          avatar_url?: string | null
          bookmark_count_today?: number | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          last_bookmark_at?: string | null
          location?: string | null
          preferences?: Json | null
          recommendation_preferences?: Json | null
          team_preferences?: Json | null
          timezone?: string | null
          tracked_events_count?: number | null
          updated_at?: string | null
        }
        Update: {
          analytics_consent?: boolean | null
          analytics_consent_date?: string | null
          avatar_url?: string | null
          bookmark_count_today?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          last_bookmark_at?: string | null
          location?: string | null
          preferences?: Json | null
          recommendation_preferences?: Json | null
          team_preferences?: Json | null
          timezone?: string | null
          tracked_events_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          status: Database["public"]["Enums"]["subscription_status"]
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          paddle_price_id: string | null
          trial_started_at: string | null
          trial_ends_at: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          seats_included: number
          seats_used: number
          entitlements: Json
          created_at: string
          updated_at: string
          current_period_start: string | null
          current_period_end: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          status?: Database["public"]["Enums"]["subscription_status"]
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          paddle_price_id?: string | null
          trial_started_at?: string | null
          trial_ends_at?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          seats_included?: number
          seats_used?: number
          entitlements?: Json
          created_at?: string
          updated_at?: string
          current_period_start?: string | null
          current_period_end?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          status?: Database["public"]["Enums"]["subscription_status"]
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          paddle_price_id?: string | null
          trial_started_at?: string | null
          trial_ends_at?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          seats_included?: number
          seats_used?: number
          entitlements?: Json
          created_at?: string
          updated_at?: string
          current_period_start?: string | null
          current_period_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          id: string
          paddle_event_id: string
          event_type: string
          payload: Json
          processed_at: string
          subscription_id: string | null
        }
        Insert: {
          id?: string
          paddle_event_id: string
          event_type: string
          payload: Json
          processed_at?: string
          subscription_id?: string | null
        }
        Update: {
          id?: string
          paddle_event_id?: string
          event_type?: string
          payload?: Json
          processed_at?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events_dlq: {
        Row: {
          id: string
          paddle_event_id: string
          event_type: string
          payload: Json
          error_message: string | null
          error_details: Json | null
          failed_at: string
          retry_count: number
          last_retry_at: string | null
        }
        Insert: {
          id?: string
          paddle_event_id: string
          event_type: string
          payload: Json
          error_message?: string | null
          error_details?: Json | null
          failed_at?: string
          retry_count?: number
          last_retry_at?: string | null
        }
        Update: {
          id?: string
          paddle_event_id?: string
          event_type?: string
          payload?: Json
          error_message?: string | null
          error_details?: Json | null
          failed_at?: string
          retry_count?: number
          last_retry_at?: string | null
        }
        Relationships: []
      }
      recommendation_batches: {
        Row: {
          algorithm_version: string
          event_ids: string[]
          id: string
          interactions_count: number | null
          scores: number[]
          section: string
          session_id: string
          shown_at: string | null
          user_id: string
        }
        Insert: {
          algorithm_version?: string
          event_ids: string[]
          id?: string
          interactions_count?: number | null
          scores: number[]
          section: string
          session_id: string
          shown_at?: string | null
          user_id: string
        }
        Update: {
          algorithm_version?: string
          event_ids?: string[]
          id?: string
          interactions_count?: number | null
          scores?: number[]
          section?: string
          session_id?: string
          shown_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recommendation_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      source_allowlist: {
        Row: {
          allowed_at: string
          allowed_by: string | null
          auto_approve_threshold: number | null
          id: string
          reason: string | null
          source_id: string
        }
        Insert: {
          allowed_at?: string
          allowed_by?: string | null
          auto_approve_threshold?: number | null
          id?: string
          reason?: string | null
          source_id: string
        }
        Update: {
          allowed_at?: string
          allowed_by?: string | null
          auto_approve_threshold?: number | null
          id?: string
          reason?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_allowlist_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: true
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_blocklist: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          id: string
          reason: string | null
          source_id: string | null
          source_url_pattern: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          id?: string
          reason?: string | null
          source_id?: string | null
          source_url_pattern?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          id?: string
          reason?: string | null
          source_id?: string | null
          source_url_pattern?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_blocklist_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: true
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_events: {
        Row: {
          checksum: string
          created_at: string
          error_message: string | null
          fetch_job_id: string | null
          fetch_status: string
          id: string
          normalized_event_id: string | null
          raw_payload: Json
          source_id: string
          updated_at: string
        }
        Insert: {
          checksum: string
          created_at?: string
          error_message?: string | null
          fetch_job_id?: string | null
          fetch_status?: string
          id?: string
          normalized_event_id?: string | null
          raw_payload: Json
          source_id: string
          updated_at?: string
        }
        Update: {
          checksum?: string
          created_at?: string
          error_message?: string | null
          fetch_job_id?: string | null
          fetch_status?: string
          id?: string
          normalized_event_id?: string | null
          raw_payload?: Json
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_events_normalized_event_id_fkey"
            columns: ["normalized_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_events_normalized_event_id_fkey"
            columns: ["normalized_event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_trust_scores: {
        Row: {
          avg_quality_score: number | null
          calculated_at: string
          duplicate_rate: number | null
          error_rate: number | null
          events_approved: number | null
          events_ingested: number | null
          events_rejected: number | null
          id: string
          metadata: Json | null
          source_id: string
        }
        Insert: {
          avg_quality_score?: number | null
          calculated_at?: string
          duplicate_rate?: number | null
          error_rate?: number | null
          events_approved?: number | null
          events_ingested?: number | null
          events_rejected?: number | null
          id?: string
          metadata?: Json | null
          source_id: string
        }
        Update: {
          avg_quality_score?: number | null
          calculated_at?: string
          duplicate_rate?: number | null
          error_rate?: number | null
          events_approved?: number | null
          events_ingested?: number | null
          events_rejected?: number | null
          id?: string
          metadata?: Json | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_trust_scores_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      speakers: {
        Row: {
          bio: string | null
          company: string | null
          created_at: string | null
          id: string
          linkedin_url: string | null
          name: string
          photo_url: string | null
          title: string | null
          twitter_url: string | null
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          photo_url?: string | null
          title?: string | null
          twitter_url?: string | null
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          photo_url?: string | null
          title?: string | null
          twitter_url?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      target_audiences: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      telemetry_events: {
        Row: {
          context: Json
          event_type: string
          event_version: number
          id: string
          metadata: Json
          occurred_at: string
          received_at: string
          request_id: string | null
          session_id: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          context?: Json
          event_type: string
          event_version?: number
          id?: string
          metadata?: Json
          occurred_at?: string
          received_at?: string
          request_id?: string | null
          session_id?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          context?: Json
          event_type?: string
          event_version?: number
          id?: string
          metadata?: Json
          occurred_at?: string
          received_at?: string
          request_id?: string | null
          session_id?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_events: {
        Row: {
          algorithm_version: string | null
          bookmarked_at: string | null
          calendar_sync_status: string | null
          calendar_synced_at: string | null
          created_at: string | null
          discovery_source: string | null
          event_id: string
          external_calendar_event_id: string | null
          external_provider: string | null
          id: string
          is_bookmarked: boolean
          notes: string | null
          recommendation_context: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          algorithm_version?: string | null
          bookmarked_at?: string | null
          calendar_sync_status?: string | null
          calendar_synced_at?: string | null
          created_at?: string | null
          discovery_source?: string | null
          event_id: string
          external_calendar_event_id?: string | null
          external_provider?: string | null
          id?: string
          is_bookmarked?: boolean
          notes?: string | null
          recommendation_context?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          algorithm_version?: string | null
          bookmarked_at?: string | null
          calendar_sync_status?: string | null
          calendar_synced_at?: string | null
          created_at?: string | null
          discovery_source?: string | null
          event_id?: string
          external_calendar_event_id?: string | null
          external_provider?: string | null
          id?: string
          is_bookmarked?: boolean
          notes?: string | null
          recommendation_context?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      user_experiments: {
        Row: {
          assigned_at: string | null
          experiment_name: string
          id: string
          user_id: string
          variant: string
        }
        Insert: {
          assigned_at?: string | null
          experiment_name: string
          id?: string
          user_id: string
          variant: string
        }
        Update: {
          assigned_at?: string | null
          experiment_name?: string
          id?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_experiments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_experiments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_experiments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_interactions_simple: {
        Row: {
          algorithm_version: string | null
          created_at: string | null
          duration_ms: number | null
          event_id: string | null
          id: string
          interaction_type: string
          position: number | null
          section: string
          user_id: string
        }
        Insert: {
          algorithm_version?: string | null
          created_at?: string | null
          duration_ms?: number | null
          event_id?: string | null
          id?: string
          interaction_type: string
          position?: number | null
          section: string
          user_id: string
        }
        Update: {
          algorithm_version?: string | null
          created_at?: string | null
          duration_ms?: number | null
          event_id?: string | null
          id?: string
          interaction_type?: string
          position?: number | null
          section?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_simple_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interactions_simple_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interactions_simple_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interactions_simple_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_interactions_simple_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          notification_type: string
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          notification_type: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          notification_type?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_engagement_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_event_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          state_province: string | null
          venue_type: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          state_province?: string | null
          venue_type?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          state_province?: string | null
          venue_type?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          action: string
          error_message: string | null
          event_external_id: string | null
          event_id: string | null
          ingestion_id: string | null
          id: string
          payload: Json | null
          processed_at: string | null
          processing_result: string | null
          signature_verified: boolean | null
          source: string
          source_id: string | null
          webhook_id: string | null
        }
        Insert: {
          action: string
          error_message?: string | null
          event_external_id?: string | null
          event_id?: string | null
          ingestion_id?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_result?: string | null
          signature_verified?: boolean | null
          source: string
          source_id?: string | null
          webhook_id?: string | null
        }
        Update: {
          action?: string
          error_message?: string | null
          event_external_id?: string | null
          event_id?: string | null
          ingestion_id?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_result?: string | null
          signature_verified?: boolean | null
          source?: string
          source_id?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_ingestion_id_fkey"
            columns: ["ingestion_id"]
            isOneToOne: false
            referencedRelation: "event_ingestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "event_sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_type_analytics: {
        Row: {
          attended: number | null
          avg_attendees: number | null
          bookmarked: number | null
          description: string | null
          event_count: number | null
          event_type_color: string | null
          event_type_id: string | null
          event_type_name: string | null
          popularity_score: number | null
          total_tracked: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      events_detailed: {
        Row: {
          accessibility_features: Json | null
          agenda_url: string | null
          attendee_count: number | null
          capacity: number | null
          certificate_offered: boolean | null
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          end_time: string | null
          event_image_url: string | null
          event_type_color: string | null
          event_type_id: string | null
          event_type_name: string | null
          id: string | null
          language: string | null
          livestream_url: string | null
          location: string | null
          organizer_id: string | null
          organizer_logo_url: string | null
          organizer_name: string | null
          organizer_website: string | null
          prerequisites: string | null
          price_range: string | null
          recording_available: boolean | null
          registration_deadline: string | null
          registration_url: string | null
          "Remote/In-person": string | null
          series_id: string | null
          series_name: string | null
          social_media_hashtag: string | null
          source_url: string | null
          speaker_lineup: Json | null
          start_time: string | null
          status: string | null
          tags: string[] | null
          target_audience: string | null
          timezone: string | null
          title: string | null
          updated_at: string | null
          venue_city: string | null
          venue_country: string | null
          venue_id: string | null
          venue_name: string | null
          virtual_platform: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_type_analytics"
            referencedColumns: ["event_type_id"]
          },
          {
            foreignKeyName: "fk_events_organizer"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_series"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_venue"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      events_with_sources: {
        Row: {
          dedupe_resolution:
            | Database["public"]["Enums"]["event_dedupe_resolution_enum"]
            | null
          end_time: string | null
          id: string
          ingested_at: string | null
          ingestion_external_id: string | null
          ingestion_id: string | null
          ingestion_method:
            | Database["public"]["Enums"]["event_ingestion_method_enum"]
            | null
          ingestion_normalized_hash: string | null
          ingestion_state:
            | Database["public"]["Enums"]["event_ingestion_state_enum"]
            | null
          location: string | null
          processed_at: string | null
          quality_score_snapshot: number | null
          raw_data_hash: string | null
          registration_url: string | null
          source_channel: string | null
          source_default_quality_score: number | null
          source_id: string | null
          source_is_active: boolean | null
          source_last_verified: string | null
          source_name: string | null
          source_quality_score: number | null
          source_region: string | null
          source_slug: string | null
          source_type:
            | Database["public"]["Enums"]["event_source_type_enum"]
            | null
          source_url: string | null
          start_time: string | null
          timezone: string | null
          title: string | null
        }
        Relationships: []
      }
      telemetry_recommendation_batches_last7d: {
        Row: {
          avg_returned_count: number | null
          total_batches: number | null
        }
        Relationships: []
      }
      telemetry_recommendation_interactions_last7d: {
        Row: {
          avg_position: number | null
          interaction_type: string | null
          total_events: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      telemetry_skill_ratings_last7d: {
        Row: {
          proficiency: string | null
          rating_count: number | null
          skill: string | null
        }
        Relationships: []
      }
      user_analytics_summary: {
        Row: {
          estimated_impact_score: number | null
          events_attended: number | null
          events_bookmarked: number | null
          events_interested: number | null
          first_activity: string | null
          high_value_events: number | null
          last_activity: string | null
          recent_activity_30d: number | null
          total_tracked_events: number | null
          unique_event_types: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_engagement_summary: {
        Row: {
          clicks_30d: number | null
          events_tracked_30d: number | null
          events_viewed_30d: number | null
          full_name: string | null
          last_interaction: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_event_stats: {
        Row: {
          full_name: string | null
          last_tracked_at: string | null
          tracked_events_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      batch_insert_interactions: {
        Args: { interactions: Json[] }
        Returns: undefined
      }
      claim_pending_source_events: {
        Args: { p_limit?: number; p_processing_status?: string }
        Returns: {
          checksum: string
          created_at: string
          error_message: string
          fetch_job_id: string
          fetch_status: string
          id: string
          normalized_event_id: string
          raw_payload: Json
          source_id: string
          updated_at: string
        }[]
      }
      cleanup_old_data: { Args: never; Returns: undefined }
      cleanup_old_interactions: { Args: never; Returns: number }
      filter_events:
        | {
            Args: {
              p_budget?: string
              p_categories?: string[]
              p_cost?: string
              p_duration?: string
              p_end_date?: string
              p_event_format?: string
              p_my_network?: boolean
              p_page_num?: number
              p_page_size?: number
              p_popularity?: string
              p_recommended?: boolean
              p_search_term?: string
              p_sort_by?: string
              p_start_date?: string
            }
            Returns: {
              accessibility_features: Json
              agenda_url: string
              attendee_count: number
              capacity: number
              certificate_offered: boolean
              created_at: string
              currency: string
              daily_schedule: Json
              description: string
              end_time: string
              event_format: string
              event_image_url: string
              event_type_id: string
              id: string
              is_multi_day: boolean
              language: string
              livestream_url: string
              location: string
              organizer_id: string
              prerequisites: string
              price_max: number
              price_min: number
              pricing_type: string
              recording_available: boolean
              registration_deadline: string
              registration_url: string
              series_id: string
              source_url: string
              speaker_lineup: Json
              start_time: string
              status: string
              status_enum: string
              target_audience: string
              timezone: string
              title: string
              total_count: number
              updated_at: string
              venue_id: string
            }[]
          }
        | {
            Args: {
              categories?: string[]
              cost_filter?: string
              difficulty_filter?: string
              duration_filter?: string
              end_date?: string
              event_format?: string
              my_network?: boolean
              page_num?: number
              page_size?: number
              popularity_filter?: string
              recommended?: boolean
              search_term?: string
              sort_by?: string
              start_date?: string
            }
            Returns: {
              attendee_count: number
              created_at: string
              description: string
              end_time: string
              event_type_id: string
              event_type_name: string
              id: string
              is_multi_day: boolean
              livestream_url: string
              location: string
              organizer_id: string
              organizer_name: string
              price_range: string
              registration_url: string
              start_time: string
              tags: string[]
              title: string
              total_count: number
              venue_city: string
              venue_country: string
              venue_name: string
            }[]
          }
        | {
            Args: {
              p_budget?: string
              p_categories?: string[]
              p_cost?: string
              p_currency?: string
              p_duration?: string
              p_end_date?: string
              p_event_format?: string
              p_my_network?: boolean
              p_page_num?: number
              p_page_size?: number
              p_popularity?: string
              p_recommended?: boolean
              p_search_term?: string
              p_sort_by?: string
              p_start_date?: string
            }
            Returns: {
              accessibility_features: Json
              agenda_url: string
              attendee_count: number
              capacity: number
              certificate_offered: boolean
              created_at: string
              currency: string
              daily_schedule: Json
              description: string
              end_time: string
              event_format: string
              event_image_url: string
              event_type_id: string
              id: string
              is_multi_day: boolean
              language: string
              livestream_url: string
              location: string
              organizer_id: string
              prerequisites: string
              price_max: number
              price_min: number
              pricing_type: string
              recording_available: boolean
              registration_deadline: string
              registration_url: string
              series_id: string
              source_url: string
              speaker_lineup: Json
              start_time: string
              status: string
              status_enum: string
              target_audience: string
              timezone: string
              title: string
              total_count: number
              updated_at: string
              venue_id: string
            }[]
          }
      find_event_by_external_id: {
        Args: { p_external_id: string; p_source?: string }
        Returns: string
      }
      find_similar_events: {
        Args: {
          p_organizer_id?: string
          p_similarity_threshold?: number
          p_start_time: string
          p_title: string
        }
        Returns: {
          event_id: string
          similarity: number
          title: string
        }[]
      }
      get_analytics_health: { Args: never; Returns: Json }
      get_event_types_with_counts: {
        Args: never
        Returns: {
          color: string
          description: string
          event_count: number
          id: string
          name: string
        }[]
      }
      get_impact_trend: { Args: { p_user_id: string }; Returns: Json }
      get_monthly_stats: {
        Args: { p_month_offset?: number; p_user_id: string }
        Returns: Json
      }
      get_skills_growth_analysis: {
        Args: { p_target_skills: string[]; p_user_id: string }
        Returns: Json
      }
      get_user_analytics_comprehensive: {
        Args: { p_include_recommendations?: boolean; p_user_id: string }
        Returns: Json
      }
      get_user_dashboard_data: { Args: { user_uuid: string }; Returns: Json }
      get_user_growth_analytics: { Args: { p_user_id: string }; Returns: Json }
      identify_multi_day_events: {
        Args: never
        Returns: {
          days_span: number
          end_time: string
          event_id: string
          start_time: string
          title: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      is_valid_email: { Args: { email: string }; Returns: boolean }
      is_valid_url: { Args: { url: string }; Returns: boolean }
      log_webhook_event: {
        Args: {
          p_action: string
          p_external_id: string
          p_payload: Json
          p_signature_verified?: boolean
          p_source: string
        }
        Returns: string
      }
      make_user_admin: { Args: { user_email: string }; Returns: undefined }
      refresh_analytics_data: { Args: never; Returns: undefined }
      set_attendance_status: {
        Args: {
          p_event_id: string
          p_notes?: string
          p_status: string
          p_user_id: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      toggle_bookmark: {
        Args: {
          p_event_id: string
          p_is_bookmarked: boolean
          p_user_id: string
        }
        Returns: Json
      }
      track_event_and_update_profile: {
        Args: {
          p_event_id: string
          p_notes?: string
          p_status: string
          p_user_id: string
        }
        Returns: Json
      }
      untrack_event_and_update_profile: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      available_time_enum:
        | "very-limited"
        | "limited"
        | "moderate"
        | "flexible"
        | "dedicated"
      budget_range_enum: "free-only" | "low" | "moderate" | "high" | "unlimited"
      career_event_type_enum:
        | "conference"
        | "workshop"
        | "meetup"
        | "webinar"
        | "summit"
        | "networking"
      career_goal_enum:
        | "skill-development"
        | "career-advancement"
        | "role-transition"
        | "leadership-growth"
        | "entrepreneurship"
        | "networking"
        | "specialization"
        | "salary-increase"
      career_timeframe_enum:
        | "immediate"
        | "short-term"
        | "medium-term"
        | "long-term"
      company_size_enum:
        | "startup"
        | "small"
        | "medium"
        | "large"
        | "enterprise"
        | "freelance"
      event_format_enum: "Online" | "In-person" | "Hybrid"
      event_dedupe_resolution_enum:
        | "unique"
        | "duplicate"
        | "merged"
        | "needs_review"
      event_ingestion_method_enum:
        | "pull"
        | "push"
        | "manual"
        | "backfill"
      event_ingestion_state_enum:
        | "pending"
        | "parsed"
        | "normalized"
        | "deduped"
        | "completed"
        | "failed"
        | "skipped"
      event_source_type_enum:
        | "rss"
        | "ics"
        | "newsletter"
        | "api"
        | "partnership"
        | "manual"
      event_status_enum: "Confirmed" | "Tentative" | "Cancelled" | "Postponed"
      learning_style_enum:
        | "hands-on"
        | "theoretical"
        | "interactive"
        | "networking"
        | "case-studies"
        | "peer-learning"
      networking_goal_enum:
        | "find-mentors"
        | "find-peers"
        | "find-collaborators"
        | "find-employers"
        | "industry-insights"
        | "thought-leadership"
      pricing_type_enum: "Free" | "Paid" | "Varies"
      seniority_level:
        | "student"
        | "entry-level"
        | "junior"
        | "mid-level"
        | "senior"
        | "staff"
        | "principal"
        | "lead"
        | "manager"
        | "director"
        | "vp"
        | "founder"
      subscription_tier: "free" | "pro" | "team"
      subscription_status: "active" | "trialing" | "past_due" | "canceled" | "expired"
      plan_type: "monthly" | "annual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      available_time_enum: [
        "very-limited",
        "limited",
        "moderate",
        "flexible",
        "dedicated",
      ],
      budget_range_enum: ["free-only", "low", "moderate", "high", "unlimited"],
      career_event_type_enum: [
        "conference",
        "workshop",
        "meetup",
        "webinar",
        "summit",
        "networking",
      ],
      career_goal_enum: [
        "skill-development",
        "career-advancement",
        "role-transition",
        "leadership-growth",
        "entrepreneurship",
        "networking",
        "specialization",
        "salary-increase",
      ],
      career_timeframe_enum: [
        "immediate",
        "short-term",
        "medium-term",
        "long-term",
      ],
      company_size_enum: [
        "startup",
        "small",
        "medium",
        "large",
        "enterprise",
        "freelance",
      ],
      event_format_enum: ["Online", "In-person", "Hybrid"],
      event_dedupe_resolution_enum: [
        "unique",
        "duplicate",
        "merged",
        "needs_review",
      ],
      event_ingestion_method_enum: ["pull", "push", "manual", "backfill"],
      event_ingestion_state_enum: [
        "pending",
        "parsed",
        "normalized",
        "deduped",
        "completed",
        "failed",
        "skipped",
      ],
      event_source_type_enum: [
        "rss",
        "ics",
        "newsletter",
        "api",
        "partnership",
        "manual",
      ],
      event_status_enum: ["Confirmed", "Tentative", "Cancelled", "Postponed"],
      learning_style_enum: [
        "hands-on",
        "theoretical",
        "interactive",
        "networking",
        "case-studies",
        "peer-learning",
      ],
      networking_goal_enum: [
        "find-mentors",
        "find-peers",
        "find-collaborators",
        "find-employers",
        "industry-insights",
        "thought-leadership",
      ],
      pricing_type_enum: ["Free", "Paid", "Varies"],
      seniority_level: [
        "student",
        "entry-level",
        "junior",
        "mid-level",
        "senior",
        "staff",
        "principal",
        "lead",
        "manager",
        "director",
        "vp",
        "founder",
      ],
    },
  },
} as const
