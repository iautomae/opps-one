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
  public: {
    Tables: {
      agentes: {
        Row: {
          avatar_url: string | null
          created_at: string
          eleven_labs_agent_id: string | null
          id: string
          knowledge_files: Json | null
          make_webhook_url: string | null
          nombre: string
          personalidad: string | null
          phone_number: string | null
          phone_number_id: string | null
          prompt: string | null
          pushover_notification_filter: string | null
          pushover_reply_message: string | null
          pushover_template: string | null
          pushover_title: string | null
          pushover_user_1_active: boolean | null
          pushover_user_1_filter: string | null
          pushover_user_1_key: string | null
          pushover_user_1_name: string | null
          pushover_user_1_notification_filter: string | null
          pushover_user_1_template: string | null
          pushover_user_1_test_phone: string | null
          pushover_user_1_title: string | null
          pushover_user_1_token: string | null
          pushover_user_2_active: boolean | null
          pushover_user_2_filter: string | null
          pushover_user_2_key: string | null
          pushover_user_2_name: string | null
          pushover_user_2_notification_filter: string | null
          pushover_user_2_template: string | null
          pushover_user_2_test_phone: string | null
          pushover_user_2_title: string | null
          pushover_user_2_token: string | null
          pushover_user_3_active: boolean | null
          pushover_user_3_filter: string | null
          pushover_user_3_key: string | null
          pushover_user_3_name: string | null
          pushover_user_3_notification_filter: string | null
          pushover_user_3_template: string | null
          pushover_user_3_test_phone: string | null
          pushover_user_3_title: string | null
          pushover_user_3_token: string | null
          status: string | null
          token_cost_per_unit: number | null
          token_multiplier: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          eleven_labs_agent_id?: string | null
          id?: string
          knowledge_files?: Json | null
          make_webhook_url?: string | null
          nombre: string
          personalidad?: string | null
          phone_number?: string | null
          phone_number_id?: string | null
          prompt?: string | null
          pushover_notification_filter?: string | null
          pushover_reply_message?: string | null
          pushover_template?: string | null
          pushover_title?: string | null
          pushover_user_1_active?: boolean | null
          pushover_user_1_filter?: string | null
          pushover_user_1_key?: string | null
          pushover_user_1_name?: string | null
          pushover_user_1_notification_filter?: string | null
          pushover_user_1_template?: string | null
          pushover_user_1_test_phone?: string | null
          pushover_user_1_title?: string | null
          pushover_user_1_token?: string | null
          pushover_user_2_active?: boolean | null
          pushover_user_2_filter?: string | null
          pushover_user_2_key?: string | null
          pushover_user_2_name?: string | null
          pushover_user_2_notification_filter?: string | null
          pushover_user_2_template?: string | null
          pushover_user_2_test_phone?: string | null
          pushover_user_2_title?: string | null
          pushover_user_2_token?: string | null
          pushover_user_3_active?: boolean | null
          pushover_user_3_filter?: string | null
          pushover_user_3_key?: string | null
          pushover_user_3_name?: string | null
          pushover_user_3_notification_filter?: string | null
          pushover_user_3_template?: string | null
          pushover_user_3_test_phone?: string | null
          pushover_user_3_title?: string | null
          pushover_user_3_token?: string | null
          status?: string | null
          token_cost_per_unit?: number | null
          token_multiplier?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          eleven_labs_agent_id?: string | null
          id?: string
          knowledge_files?: Json | null
          make_webhook_url?: string | null
          nombre?: string
          personalidad?: string | null
          phone_number?: string | null
          phone_number_id?: string | null
          prompt?: string | null
          pushover_notification_filter?: string | null
          pushover_reply_message?: string | null
          pushover_template?: string | null
          pushover_title?: string | null
          pushover_user_1_active?: boolean | null
          pushover_user_1_filter?: string | null
          pushover_user_1_key?: string | null
          pushover_user_1_name?: string | null
          pushover_user_1_notification_filter?: string | null
          pushover_user_1_template?: string | null
          pushover_user_1_test_phone?: string | null
          pushover_user_1_title?: string | null
          pushover_user_1_token?: string | null
          pushover_user_2_active?: boolean | null
          pushover_user_2_filter?: string | null
          pushover_user_2_key?: string | null
          pushover_user_2_name?: string | null
          pushover_user_2_notification_filter?: string | null
          pushover_user_2_template?: string | null
          pushover_user_2_test_phone?: string | null
          pushover_user_2_title?: string | null
          pushover_user_2_token?: string | null
          pushover_user_3_active?: boolean | null
          pushover_user_3_filter?: string | null
          pushover_user_3_key?: string | null
          pushover_user_3_name?: string | null
          pushover_user_3_notification_filter?: string | null
          pushover_user_3_template?: string | null
          pushover_user_3_test_phone?: string | null
          pushover_user_3_title?: string | null
          pushover_user_3_token?: string | null
          status?: string | null
          token_cost_per_unit?: number | null
          token_multiplier?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          advisor_name: string | null
          agent_id: string | null
          created_at: string
          eleven_labs_conversation_id: string | null
          email: string | null
          estado: string | null
          fecha_seguimiento: string | null
          id: number
          name: string | null
          nombre: string | null
          notas_seguimiento: string | null
          phone: string | null
          score: number | null
          status: string | null
          summary: string | null
          tokens_billed: number | null
          tokens_raw: number | null
          transcript: Json | null
          user_id: string | null
        }
        Insert: {
          advisor_name?: string | null
          agent_id?: string | null
          created_at?: string
          eleven_labs_conversation_id?: string | null
          email?: string | null
          estado?: string | null
          fecha_seguimiento?: string | null
          id?: number
          name?: string | null
          nombre?: string | null
          notas_seguimiento?: string | null
          phone?: string | null
          score?: number | null
          status?: string | null
          summary?: string | null
          tokens_billed?: number | null
          tokens_raw?: number | null
          transcript?: Json | null
          user_id?: string | null
        }
        Update: {
          advisor_name?: string | null
          agent_id?: string | null
          created_at?: string
          eleven_labs_conversation_id?: string | null
          email?: string | null
          estado?: string | null
          fecha_seguimiento?: string | null
          id?: number
          name?: string | null
          nombre?: string | null
          notas_seguimiento?: string | null
          phone?: string | null
          score?: number | null
          status?: string | null
          summary?: string | null
          tokens_billed?: number | null
          tokens_raw?: number | null
          transcript?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agentes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          brand_logo: string | null
          email: string | null
          features: Json | null
          full_name: string
          has_leads_access: boolean | null
          id: string
          role: string | null
        }
        Insert: {
          brand_logo?: string | null
          email?: string | null
          features?: Json | null
          full_name?: string
          has_leads_access?: boolean | null
          id: string
          role?: string | null
        }
        Update: {
          brand_logo?: string | null
          email?: string | null
          features?: Json | null
          full_name?: string
          has_leads_access?: boolean | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      tramite_observaciones: {
        Row: {
          created_at: string | null
          estado: Database["public"]["Enums"]["observacion_estado"]
          fecha_limite: string | null
          fecha_subsanacion: string | null
          id: string
          motivo: string
          tramite_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["observacion_estado"]
          fecha_limite?: string | null
          fecha_subsanacion?: string | null
          id?: string
          motivo: string
          tramite_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["observacion_estado"]
          fecha_limite?: string | null
          fecha_subsanacion?: string | null
          id?: string
          motivo?: string
          tramite_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tramite_observaciones_tramite_id_fkey"
            columns: ["tramite_id"]
            isOneToOne: false
            referencedRelation: "tramites"
            referencedColumns: ["id"]
          },
        ]
      }
      tramite_requisitos: {
        Row: {
          archivo_url: string | null
          created_at: string | null
          estado: Database["public"]["Enums"]["requisito_estado"]
          fecha_vencimiento: string | null
          id: string
          observacion: string | null
          tipo_requisito: string
          tramite_id: string
          updated_at: string | null
        }
        Insert: {
          archivo_url?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["requisito_estado"]
          fecha_vencimiento?: string | null
          id?: string
          observacion?: string | null
          tipo_requisito: string
          tramite_id: string
          updated_at?: string | null
        }
        Update: {
          archivo_url?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["requisito_estado"]
          fecha_vencimiento?: string | null
          id?: string
          observacion?: string | null
          tipo_requisito?: string
          tramite_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tramite_requisitos_tramite_id_fkey"
            columns: ["tramite_id"]
            isOneToOne: false
            referencedRelation: "tramites"
            referencedColumns: ["id"]
          },
        ]
      }
      tramites: {
        Row: {
          cliente_nombre: string
          cliente_telefono: string | null
          created_at: string | null
          debe: number | null
          estado_general: Database["public"]["Enums"]["tramite_estado"]
          fase_actual: string | null
          id: string
          modalidad: string | null
          pago1: number | null
          provincia: string | null
          sucamec_expediente: string | null
          tipo_tramite: Database["public"]["Enums"]["tramite_tipo"]
          updated_at: string | null
          usuario_creador_id: string | null
        }
        Insert: {
          cliente_nombre: string
          cliente_telefono?: string | null
          created_at?: string | null
          debe?: number | null
          estado_general?: Database["public"]["Enums"]["tramite_estado"]
          fase_actual?: string | null
          id?: string
          modalidad?: string | null
          pago1?: number | null
          provincia?: string | null
          sucamec_expediente?: string | null
          tipo_tramite: Database["public"]["Enums"]["tramite_tipo"]
          updated_at?: string | null
          usuario_creador_id?: string | null
        }
        Update: {
          cliente_nombre?: string
          cliente_telefono?: string | null
          created_at?: string | null
          debe?: number | null
          estado_general?: Database["public"]["Enums"]["tramite_estado"]
          fase_actual?: string | null
          id?: string
          modalidad?: string | null
          pago1?: number | null
          provincia?: string | null
          sucamec_expediente?: string | null
          tipo_tramite?: Database["public"]["Enums"]["tramite_tipo"]
          updated_at?: string | null
          usuario_creador_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_exists: { Args: { p_email: string }; Returns: boolean }
      get_complete_schema: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      verify_user_email: { Args: { email_input: string }; Returns: boolean }
    }
    Enums: {
      observacion_estado: "PENDIENTE_SUBSANAR" | "SUBSANADO"
      requisito_estado:
        | "PENDIENTE"
        | "REVISADO"
        | "OBSERVADO"
        | "APROBADO"
        | "RECHAZADO"
      tramite_estado: "PENDIENTE" | "EN_PROCESO" | "OBSERVADO" | "FINALIZADO"
      tramite_tipo: "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "TP" | "OTROS"
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
      observacion_estado: ["PENDIENTE_SUBSANAR", "SUBSANADO"],
      requisito_estado: [
        "PENDIENTE",
        "REVISADO",
        "OBSERVADO",
        "APROBADO",
        "RECHAZADO",
      ],
      tramite_estado: ["PENDIENTE", "EN_PROCESO", "OBSERVADO", "FINALIZADO"],
      tramite_tipo: ["L1", "L2", "L3", "L4", "L5", "L6", "TP", "OTROS"],
    },
  },
} as const
