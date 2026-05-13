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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      action_plans: {
        Row: {
          code: string | null
          created_at: string
          deadline: string | null
          deleted_at: string | null
          description: string
          id: string
          notes: string | null
          origin_id: string | null
          origin_type: string
          priority: string
          progress: number
          responsible_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          notes?: string | null
          origin_id?: string | null
          origin_type: string
          priority?: string
          progress?: number
          responsible_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          origin_id?: string | null
          origin_type?: string
          priority?: string
          progress?: number
          responsible_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_data: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      calibrations: {
        Row: {
          certificate_number: string | null
          certificate_url: string | null
          created_at: string
          deleted_at: string | null
          equipment_id: string
          id: string
          next_due_date: string | null
          notes: string | null
          performed_at: string
          points: Json
          provider: string | null
          responsible_id: string | null
          result: string
          uncertainty: string | null
          updated_at: string
        }
        Insert: {
          certificate_number?: string | null
          certificate_url?: string | null
          created_at?: string
          deleted_at?: string | null
          equipment_id: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          performed_at: string
          points?: Json
          provider?: string | null
          responsible_id?: string | null
          result?: string
          uncertainty?: string | null
          updated_at?: string
        }
        Update: {
          certificate_number?: string | null
          certificate_url?: string | null
          created_at?: string
          deleted_at?: string | null
          equipment_id?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          performed_at?: string
          points?: Json
          provider?: string | null
          responsible_id?: string | null
          result?: string
          uncertainty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibrations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibrations_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competencies: {
        Row: {
          area: string
          certified_at: string | null
          created_at: string
          deleted_at: string | null
          evidence: string | null
          expires_at: string | null
          id: string
          level: string
          notes: string | null
          skill: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area: string
          certified_at?: string | null
          created_at?: string
          deleted_at?: string | null
          evidence?: string | null
          expires_at?: string | null
          id?: string
          level?: string
          notes?: string | null
          skill: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          certified_at?: string | null
          created_at?: string
          deleted_at?: string | null
          evidence?: string | null
          expires_at?: string | null
          id?: string
          level?: string
          notes?: string | null
          skill?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reads: {
        Row: {
          confirmed_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_reads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          file_url: string | null
          id: string
          responsible_id: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          validity: string | null
          version: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          responsible_id?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          validity?: string | null
          version?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          responsible_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          validity?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipments: {
        Row: {
          acquisition_date: string | null
          category: string | null
          code: string
          created_at: string
          deleted_at: string | null
          id: string
          location: string | null
          manufacturer: string | null
          model: string | null
          name: string
          next_calibration_date: string | null
          notes: string | null
          responsible_id: string | null
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acquisition_date?: string | null
          category?: string | null
          code: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          next_calibration_date?: string | null
          notes?: string | null
          responsible_id?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acquisition_date?: string | null
          category?: string | null
          code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          next_calibration_date?: string | null
          notes?: string | null
          responsible_id?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipments_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrences: {
        Row: {
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          immediate_action: string | null
          linked_audit_id: string | null
          linked_document_id: string | null
          occurred_at: string
          origin: string
          responsible_id: string | null
          root_cause: string | null
          severity: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          immediate_action?: string | null
          linked_audit_id?: string | null
          linked_document_id?: string | null
          occurred_at?: string
          origin: string
          responsible_id?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          immediate_action?: string | null
          linked_audit_id?: string | null
          linked_document_id?: string | null
          occurred_at?: string
          origin?: string
          responsible_id?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrences_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string
          expected_at: string | null
          id: string
          notes: string | null
          quantity: number
          received_at: string | null
          requested_at: string
          requester_id: string | null
          status: string
          supplier_id: string | null
          total: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description: string
          expected_at?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          received_at?: string | null
          requested_at?: string
          requester_id?: string | null
          status?: string
          supplier_id?: string | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          expected_at?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          received_at?: string | null
          requested_at?: string
          requester_id?: string | null
          status?: string
          supplier_id?: string | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          cause: string | null
          classification: string | null
          code: string | null
          consequence: string | null
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          impact: number
          level: number | null
          probability: number
          process: string
          responsible_id: string | null
          status: string
          treatment: string | null
          updated_at: string
        }
        Insert: {
          cause?: string | null
          classification?: string | null
          code?: string | null
          consequence?: string | null
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          impact: number
          level?: number | null
          probability: number
          process: string
          responsible_id?: string | null
          status?: string
          treatment?: string | null
          updated_at?: string
        }
        Update: {
          cause?: string | null
          classification?: string | null
          code?: string | null
          consequence?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          impact?: number
          level?: number | null
          probability?: number
          process?: string
          responsible_id?: string | null
          status?: string
          treatment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          category: string | null
          cnpj: string | null
          code: string | null
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          qualified_until: string | null
          rating: number | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          cnpj?: string | null
          code?: string | null
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          qualified_until?: string | null
          rating?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          cnpj?: string | null
          code?: string | null
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          qualified_until?: string | null
          rating?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "tecnico" | "auditor" | "consulta"
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
      app_role: ["admin", "gestor", "tecnico", "auditor", "consulta"],
    },
  },
} as const
