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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_notes: {
        Row: {
          archived_at: string | null
          author_name: string
          content: string
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          archived_at?: string | null
          author_name: string
          content: string
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          archived_at?: string | null
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          created_at: string
          id: string
          likert_value: number | null
          open_text_value: string | null
          question_id: string
          response_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          likert_value?: number | null
          open_text_value?: string | null
          question_id: string
          response_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          likert_value?: number | null
          open_text_value?: string | null
          question_id?: string
          response_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_scores"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      archetypes: {
        Row: {
          code: string
          created_at: string
          description: string
          display_order: number
          id: string
          name: string
          target_vectors: Json
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          display_order: number
          id?: string
          name: string
          target_vectors: Json
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          name?: string
          target_vectors?: Json
        }
        Relationships: []
      }
      deployments: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          is_active: boolean
          max_responses: number | null
          opens_at: string | null
          survey_id: string
          token: string
          type: Database["public"]["Enums"]["deployment_type"]
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_responses?: number | null
          opens_at?: string | null
          survey_id: string
          token?: string
          type?: Database["public"]["Enums"]["deployment_type"]
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_responses?: number | null
          opens_at?: string | null
          survey_id?: string
          token?: string
          type?: Database["public"]["Enums"]["deployment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "deployments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "deployments_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      dialogue_embeddings: {
        Row: {
          created_at: string
          embedding: string
          id: string
          model_version: string
          question_id: string
          response_id: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          embedding: string
          id?: string
          model_version?: string
          question_id: string
          response_id: string
          survey_id: string
        }
        Update: {
          created_at?: string
          embedding?: string
          id?: string
          model_version?: string
          question_id?: string
          response_id?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialogue_embeddings_question_id_fk"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "dialogue_embeddings_question_id_fk"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_scores"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "dialogue_embeddings_question_id_fk"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialogue_embeddings_response_id_fk"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialogue_embeddings_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "dialogue_embeddings_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "dialogue_embeddings_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      dialogue_keywords: {
        Row: {
          created_at: string
          dimension_id: string | null
          frequency: number
          id: string
          keyword: string
          sentiment: string | null
          survey_id: string
        }
        Insert: {
          created_at?: string
          dimension_id?: string | null
          frequency?: number
          id?: string
          keyword: string
          sentiment?: string | null
          survey_id: string
        }
        Update: {
          created_at?: string
          dimension_id?: string | null
          frequency?: number
          id?: string
          keyword?: string
          sentiment?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialogue_keywords_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialogue_keywords_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "question_scores"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "dialogue_keywords_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "dialogue_keywords_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "dialogue_keywords_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensions: {
        Row: {
          code: string
          color: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          segment_end_angle: number | null
          segment_start_angle: number | null
        }
        Insert: {
          code: string
          color: string
          created_at?: string
          description?: string | null
          display_order: number
          id?: string
          name: string
          segment_end_angle?: number | null
          segment_start_angle?: number | null
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          segment_end_angle?: number | null
          segment_start_angle?: number | null
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          provider_message_id: string | null
          recipient: string
          sent_at: string | null
          status: string
          subject: string
          survey_id: string | null
          template_type: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: string
          subject: string
          survey_id?: string | null
          template_type: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string
          survey_id?: string | null
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "email_log_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "email_log_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          html_body: string
          id: string
          org_id: string | null
          subject: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_body: string
          id?: string
          org_id?: string | null
          subject: string
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_body?: string
          id?: string
          org_id?: string | null
          subject?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          email_status: string | null
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string | null
          reminder_count: number | null
          role: Database["public"]["Enums"]["user_role"]
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_status?: string | null
          expires_at: string
          id?: string
          invited_by?: string | null
          organization_id?: string | null
          reminder_count?: number | null
          role: Database["public"]["Enums"]["user_role"]
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_status?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string | null
          reminder_count?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          department: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          team: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["user_role"]
          team?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          team?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_consultants: {
        Row: {
          assigned_at: string
          consultant_name: string
          id: string
          organization_id: string
        }
        Insert: {
          assigned_at?: string
          consultant_name: string
          id?: string
          organization_id: string
        }
        Update: {
          assigned_at?: string
          consultant_name?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_consultants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          client_access_enabled: boolean
          display_name: string | null
          id: string
          logo_url: string | null
          metadata_departments: Json
          metadata_locations: Json
          metadata_roles: Json
          metadata_tenure_bands: Json
          organization_id: string
          updated_at: string
        }
        Insert: {
          client_access_enabled?: boolean
          display_name?: string | null
          id?: string
          logo_url?: string | null
          metadata_departments?: Json
          metadata_locations?: Json
          metadata_roles?: Json
          metadata_tenure_bands?: Json
          organization_id: string
          updated_at?: string
        }
        Update: {
          client_access_enabled?: boolean
          display_name?: string | null
          id?: string
          logo_url?: string | null
          metadata_departments?: Json
          metadata_locations?: Json
          metadata_roles?: Json
          metadata_tenure_bands?: Json
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          archived_at: string | null
          branding: Json
          client_access_enabled: boolean
          created_at: string
          created_by: string | null
          employee_count: number | null
          id: string
          industry: string | null
          name: string
          primary_contact_email: string | null
          primary_contact_name: string | null
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          branding?: Json
          client_access_enabled?: boolean
          created_at?: string
          created_by?: string | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          name: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          branding?: Json
          client_access_enabled?: boolean
          created_at?: string
          created_by?: string | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          name?: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          anonymity_threshold: number
          brand_colors: Json
          completion_message: string
          data_retention_policy: string
          default_duration_days: number
          id: string
          logo_url: string | null
          updated_at: string
          welcome_message: string
        }
        Insert: {
          anonymity_threshold?: number
          brand_colors?: Json
          completion_message?: string
          data_retention_policy?: string
          default_duration_days?: number
          id?: string
          logo_url?: string | null
          updated_at?: string
          welcome_message?: string
        }
        Update: {
          anonymity_threshold?: number
          brand_colors?: Json
          completion_message?: string
          data_retention_policy?: string
          default_duration_days?: number
          id?: string
          logo_url?: string | null
          updated_at?: string
          welcome_message?: string
        }
        Relationships: []
      }
      question_dimensions: {
        Row: {
          dimension_id: string
          question_id: string
          weight: number
        }
        Insert: {
          dimension_id: string
          question_id: string
          weight?: number
        }
        Update: {
          dimension_id?: string
          question_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_dimensions_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_dimensions_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "question_scores"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "question_dimensions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "question_dimensions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_scores"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "question_dimensions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          required: boolean
          reverse_scored: boolean
          sub_dimension_id: string | null
          survey_id: string
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          order_index: number
          required?: boolean
          reverse_scored?: boolean
          sub_dimension_id?: string | null
          survey_id: string
          text: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          required?: boolean
          reverse_scored?: boolean
          sub_dimension_id?: string | null
          survey_id?: string
          text?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_sub_dimension_id_fkey"
            columns: ["sub_dimension_id"]
            isOneToOne: false
            referencedRelation: "sub_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          actions: Json
          body: string
          ccc_service_link: string | null
          created_at: string
          dimension_id: string | null
          id: string
          priority: number
          severity: string
          survey_id: string
          title: string
          trust_ladder_link: string | null
          updated_at: string
        }
        Insert: {
          actions?: Json
          body: string
          ccc_service_link?: string | null
          created_at?: string
          dimension_id?: string | null
          id?: string
          priority?: number
          severity: string
          survey_id: string
          title: string
          trust_ladder_link?: string | null
          updated_at?: string
        }
        Update: {
          actions?: Json
          body?: string
          ccc_service_link?: string | null
          created_at?: string
          dimension_id?: string | null
          id?: string
          priority?: number
          severity?: string
          survey_id?: string
          title?: string
          trust_ladder_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "question_scores"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "recommendations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "recommendations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "recommendations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          client_visible: boolean
          created_at: string
          created_by: string | null
          error: string | null
          file_size: number | null
          format: string
          id: string
          organization_id: string | null
          page_count: number | null
          progress: number
          sections: string[] | null
          status: string
          storage_path: string | null
          survey_id: string
          title: string | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          error?: string | null
          file_size?: number | null
          format?: string
          id?: string
          organization_id?: string | null
          page_count?: number | null
          progress?: number
          sections?: string[] | null
          status?: string
          storage_path?: string | null
          survey_id: string
          title?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          error?: string | null
          file_size?: number | null
          format?: string
          id?: string
          organization_id?: string | null
          page_count?: number | null
          progress?: number
          sections?: string[] | null
          status?: string
          storage_path?: string | null
          survey_id?: string
          title?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "reports_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "reports_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          created_at: string
          deployment_id: string
          id: string
          ip_hash: string | null
          is_complete: boolean
          metadata_department: string | null
          metadata_location: string | null
          metadata_role: string | null
          metadata_tenure: string | null
          session_token: string
          started_at: string
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          deployment_id: string
          id?: string
          ip_hash?: string | null
          is_complete?: boolean
          metadata_department?: string | null
          metadata_location?: string | null
          metadata_role?: string | null
          metadata_tenure?: string | null
          session_token: string
          started_at?: string
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          deployment_id?: string
          id?: string
          ip_hash?: string | null
          is_complete?: boolean
          metadata_department?: string | null
          metadata_location?: string | null
          metadata_role?: string | null
          metadata_tenure?: string | null
          session_token?: string
          started_at?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      score_recalculations: {
        Row: {
          completed_at: string | null
          id: string
          reason: string
          started_at: string
          status: string
          survey_id: string
          triggered_by: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          reason: string
          started_at?: string
          status?: string
          survey_id: string
          triggered_by: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          reason?: string
          started_at?: string
          status?: string
          survey_id?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_recalculations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "score_recalculations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "score_recalculations_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          calculated_at: string
          created_at: string
          dimension_id: string
          id: string
          raw_score: number
          response_count: number
          score: number
          segment_type: string | null
          segment_value: string | null
          survey_id: string
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          dimension_id: string
          id?: string
          raw_score: number
          response_count?: number
          score: number
          segment_type?: string | null
          segment_value?: string | null
          survey_id: string
        }
        Update: {
          calculated_at?: string
          created_at?: string
          dimension_id?: string
          id?: string
          raw_score?: number
          response_count?: number
          score?: number
          segment_type?: string | null
          segment_value?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "question_scores"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "scores_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "scores_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "scores_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_dimensions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          dimension_id: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          dimension_id: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          dimension_id?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_dimensions_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_dimensions_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "question_scores"
            referencedColumns: ["dimension_id"]
          },
        ]
      }
      survey_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          invitation_sent_at: string | null
          name: string | null
          reminder_sent_at: string | null
          segment_metadata: Json | null
          status: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invitation_sent_at?: string | null
          name?: string | null
          reminder_sent_at?: string | null
          segment_metadata?: Json | null
          status?: string
          survey_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invitation_sent_at?: string | null
          name?: string | null
          reminder_sent_at?: string | null
          segment_metadata?: Json | null
          status?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_recipients_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_recipients_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "survey_recipients_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          organization_id: string | null
          questions: Json | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          organization_id?: string | null
          questions?: Json | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          organization_id?: string | null
          questions?: Json | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          archived_at: string | null
          closes_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          opens_at: string | null
          organization_id: string
          reminder_schedule: Json | null
          scores_calculated: boolean
          settings: Json
          status: Database["public"]["Enums"]["survey_status"]
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          opens_at?: string | null
          organization_id: string
          reminder_schedule?: Json | null
          scores_calculated?: boolean
          settings?: Json
          status?: Database["public"]["Enums"]["survey_status"]
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          opens_at?: string | null
          organization_id?: string
          reminder_schedule?: Json | null
          scores_calculated?: boolean
          settings?: Json
          status?: Database["public"]["Enums"]["survey_status"]
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          reminder_enabled: boolean
          report_ready_enabled: boolean
          survey_invitation_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_enabled?: boolean
          report_ready_enabled?: boolean
          survey_invitation_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_enabled?: boolean
          report_ready_enabled?: boolean
          survey_invitation_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          assigned_clients: string[]
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_active_at: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          assigned_clients?: string[]
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_active_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          assigned_clients?: string[]
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      active_survey_per_org: {
        Row: {
          active_deployments: number | null
          closes_at: string | null
          opens_at: string | null
          organization_id: string | null
          scores_calculated: boolean | null
          status: Database["public"]["Enums"]["survey_status"] | null
          survey_id: string | null
          title: string | null
          total_responses: number | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dialogue_responses: {
        Row: {
          created_at: string | null
          id: string | null
          metadata_department: string | null
          metadata_location: string | null
          metadata_role: string | null
          metadata_tenure: string | null
          organization_id: string | null
          question_id: string | null
          question_text: string | null
          response_text: string | null
          submitted_at: string | null
          survey_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      question_scores: {
        Row: {
          dimension_code: string | null
          dimension_color: string | null
          dimension_id: string | null
          dimension_name: string | null
          dist_1: number | null
          dist_10: number | null
          dist_2: number | null
          dist_3: number | null
          dist_4: number | null
          dist_5: number | null
          dist_6: number | null
          dist_7: number | null
          dist_8: number | null
          dist_9: number | null
          is_reverse_scored: boolean | null
          mean_score: number | null
          order_index: number | null
          question_id: string | null
          question_text: string | null
          question_type: Database["public"]["Enums"]["question_type"] | null
          response_count: number | null
          sub_dimension_code: string | null
          sub_dimension_id: string | null
          sub_dimension_name: string | null
          survey_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_sub_dimension_id_fkey"
            columns: ["sub_dimension_id"]
            isOneToOne: false
            referencedRelation: "sub_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_segment_scores: {
        Row: {
          dimension_code: string | null
          dimension_color: string | null
          dimension_id: string | null
          dimension_name: string | null
          is_masked: boolean | null
          raw_score: number | null
          response_count: number | null
          score: number | null
          segment_type: string | null
          segment_value: string | null
          survey_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "question_scores"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "scores_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "active_survey_per_org"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "scores_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "dialogue_responses"
            referencedColumns: ["survey_id"]
          },
          {
            foreignKeyName: "scores_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_user_org_id: { Args: never; Returns: string }
      auth_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_response_metrics: {
        Args: { p_survey_id: string }
        Returns: Json
      }
      get_segment_question_scores: {
        Args: {
          p_segment_type: string
          p_segment_value: string
          p_survey_id: string
        }
        Returns: {
          dimension_code: string
          dimension_color: string
          dimension_id: string
          dimension_name: string
          dist_1: number
          dist_10: number
          dist_2: number
          dist_3: number
          dist_4: number
          dist_5: number
          dist_6: number
          dist_7: number
          dist_8: number
          dist_9: number
          is_masked: boolean
          is_reverse_scored: boolean
          mean_score: number
          order_index: number
          question_id: string
          question_text: string
          response_count: number
          sub_dimension_code: string
          sub_dimension_name: string
        }[]
      }
      is_ccc_user: { Args: never; Returns: boolean }
      is_valid_deployment: { Args: { dep_id: string }; Returns: boolean }
      is_valid_response: { Args: { resp_id: string }; Returns: boolean }
      reorder_questions: {
        Args: {
          p_new_orders: number[]
          p_question_ids: string[]
          p_survey_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      deployment_type:
        | "anonymous_link"
        | "tracked_link"
        | "email_invite"
        | "sso_gated"
      question_type: "likert_4" | "open_text" | "likert"
      survey_status: "draft" | "active" | "paused" | "closed" | "archived"
      user_role:
        | "ccc_admin"
        | "ccc_member"
        | "client_exec"
        | "client_director"
        | "client_manager"
        | "client_user"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      deployment_type: [
        "anonymous_link",
        "tracked_link",
        "email_invite",
        "sso_gated",
      ],
      question_type: ["likert_4", "open_text", "likert"],
      survey_status: ["draft", "active", "paused", "closed", "archived"],
      user_role: [
        "ccc_admin",
        "ccc_member",
        "client_exec",
        "client_director",
        "client_manager",
        "client_user",
      ],
    },
  },
} as const
