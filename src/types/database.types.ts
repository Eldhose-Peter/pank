export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          default_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          currency: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          currency?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          currency?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string | null;
          display_name: string;
          role: 'owner' | 'admin' | 'member';
          is_placeholder: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id?: string | null;
          display_name: string;
          role?: 'owner' | 'admin' | 'member';
          is_placeholder?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string | null;
          display_name?: string;
          role?: 'owner' | 'admin' | 'member';
          is_placeholder?: boolean;
          joined_at?: string;
        };
        Relationships: [];
      };
      group_invitations: {
        Row: {
          id: string;
          group_id: string;
          token: string;
          invited_by: string;
          placeholder_member_id: string | null;
          expires_at: string;
          max_uses: number | null;
          use_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          token?: string;
          invited_by: string;
          placeholder_member_id?: string | null;
          expires_at?: string;
          max_uses?: number | null;
          use_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          token?: string;
          invited_by?: string;
          placeholder_member_id?: string | null;
          expires_at?: string;
          max_uses?: number | null;
          use_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          title: string;
          description: string | null;
          amount: number;
          currency: string;
          split_type: 'equal' | 'exact' | 'percentage' | 'shares';
          expense_date: string;
          created_by: string;
          idempotency_key: string | null;
          receipt_url: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          title: string;
          description?: string | null;
          amount: number;
          currency?: string;
          split_type: 'equal' | 'exact' | 'percentage' | 'shares';
          expense_date?: string;
          created_by: string;
          idempotency_key?: string | null;
          receipt_url?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          title?: string;
          description?: string | null;
          amount?: number;
          currency?: string;
          split_type?: 'equal' | 'exact' | 'percentage' | 'shares';
          expense_date?: string;
          created_by?: string;
          idempotency_key?: string | null;
          receipt_url?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      expense_payments: {
        Row: {
          id: string;
          expense_id: string;
          group_member_id: string;
          amount_paid: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          group_member_id: string;
          amount_paid: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          expense_id?: string;
          group_member_id?: string;
          amount_paid?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          group_member_id: string;
          split_value: number;
          owed_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          group_member_id: string;
          split_value: number;
          owed_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          expense_id?: string;
          group_member_id?: string;
          split_value?: number;
          owed_amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      settlements: {
        Row: {
          id: string;
          group_id: string;
          payer_member_id: string;
          payee_member_id: string;
          amount: number;
          currency: string;
          payment_method: string | null;
          notes: string | null;
          settled_at: string;
          created_by: string;
          is_deleted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          payer_member_id: string;
          payee_member_id: string;
          amount: number;
          currency?: string;
          payment_method?: string | null;
          notes?: string | null;
          settled_at?: string;
          created_by: string;
          is_deleted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          payer_member_id?: string;
          payee_member_id?: string;
          amount?: number;
          currency?: string;
          payment_method?: string | null;
          notes?: string | null;
          settled_at?: string;
          created_by?: string;
          is_deleted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      expense_audit_log: {
        Row: {
          id: string;
          expense_id: string | null;
          group_id: string;
          action: 'created' | 'updated' | 'deleted' | 'restored';
          actor_id: string;
          snapshot_before: Json | null;
          snapshot_after: Json | null;
          change_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id?: string | null;
          group_id: string;
          action: 'created' | 'updated' | 'deleted' | 'restored';
          actor_id: string;
          snapshot_before?: Json | null;
          snapshot_after?: Json | null;
          change_summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          expense_id?: string | null;
          group_id?: string;
          action?: 'created' | 'updated' | 'deleted' | 'restored';
          actor_id?: string;
          snapshot_before?: Json | null;
          snapshot_after?: Json | null;
          change_summary?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversation_sessions: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          status: 'active' | 'completed' | 'expired';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          status?: 'active' | 'completed' | 'expired';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          status?: 'active' | 'completed' | 'expired';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversation_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      expense_drafts: {
        Row: {
          id: string;
          session_id: string | null;
          group_id: string;
          created_by: string;
          raw_input: string;
          structured_data: Json;
          status: 'pending_clarification' | 'ready_for_review' | 'confirmed' | 'rejected';
          clarification_questions: Json;
          receipt_url: string | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          group_id: string;
          created_by: string;
          raw_input: string;
          structured_data: Json;
          status?: 'pending_clarification' | 'ready_for_review' | 'confirmed' | 'rejected';
          clarification_questions?: Json;
          receipt_url?: string | null;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          group_id?: string;
          created_by?: string;
          raw_input?: string;
          structured_data?: Json;
          status?: 'pending_clarification' | 'ready_for_review' | 'confirmed' | 'rejected';
          clarification_questions?: Json;
          receipt_url?: string | null;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_group_member: {
        Args: { check_group_id: string; check_user_id?: string };
        Returns: boolean;
      };
      is_group_admin: {
        Args: { check_group_id: string; check_user_id?: string };
        Returns: boolean;
      };
      accept_group_invitation: {
        Args: { invite_token: string };
        Returns: Json;
      };
      create_expense_transactional: {
        Args: {
          p_group_id: string;
          p_title: string;
          p_description: string;
          p_amount: number;
          p_currency: string;
          p_split_type: string;
          p_expense_date: string;
          p_idempotency_key: string | null;
          p_payments: Json;
          p_splits: Json;
        };
        Returns: Json;
      };
      update_expense_transactional: {
        Args: {
          p_expense_id: string;
          p_group_id: string;
          p_title: string;
          p_description: string;
          p_amount: number;
          p_currency: string;
          p_split_type: string;
          p_expense_date: string;
          p_payments: Json;
          p_splits: Json;
        };
        Returns: Json;
      };
      delete_expense_transactional: {
        Args: {
          p_expense_id: string;
          p_group_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
