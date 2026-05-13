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
      audit_findings: {
        Row: {
          audit_id: string
          created_at: string
          id: string
          observation: string | null
          position: number
          requirement: string
          result: string
          severity: string | null
          updated_at: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          id?: string
          observation?: string | null
          position?: number
          requirement: string
          result?: string
          severity?: string | null
          updated_at?: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          id?: string
          observation?: string | null
          position?: number
          requirement?: string
          result?: string
          severity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          area: string | null
          auditor_id: string | null
          auditor_name: string | null
          code: string | null
          created_at: string
          deleted_at: string | null
          findings_count: number
          id: string
          notes: string | null
          performed_at: string | null
          planned_at: string | null
          scope: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          auditor_id?: string | null
          auditor_name?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          findings_count?: number
          id?: string
          notes?: string | null
          performed_at?: string | null
          planned_at?: string | null
          scope: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          auditor_id?: string | null
          auditor_name?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          findings_count?: number
          id?: string
          notes?: string | null
          performed_at?: string | null
          planned_at?: string | null
          scope?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      competency_history: {
        Row: {
          action: string
          area: string | null
          certified_at: string | null
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          competency_id: string
          evidence: string | null
          expires_at: string | null
          id: string
          level: string | null
          notes: string | null
          skill: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          action: string
          area?: string | null
          certified_at?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          competency_id: string
          evidence?: string | null
          expires_at?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          skill?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          action?: string
          area?: string | null
          certified_at?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          competency_id?: string
          evidence?: string | null
          expires_at?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          skill?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
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
      form_responses: {
        Row: {
          approval_status: string
          approved_at: string | null
          approver_id: string | null
          created_at: string
          form_id: string
          id: string
          submitted_at: string
          submitted_by: string | null
          submitted_by_name: string | null
          updated_at: string
          values: Json
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          submitted_at?: string
          submitted_by?: string | null
          submitted_by_name?: string | null
          updated_at?: string
          values?: Json
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          submitted_at?: string
          submitted_by?: string | null
          submitted_by_name?: string | null
          updated_at?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          approvers: string[] | null
          created_at: string
          deleted_at: string | null
          description: string | null
          fields: Json
          id: string
          requires_approval: boolean
          responsible_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approvers?: string[] | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          fields?: Json
          id?: string
          requires_approval?: boolean
          responsible_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approvers?: string[] | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          fields?: Json
          id?: string
          requires_approval?: boolean
          responsible_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_results: {
        Row: {
          created_at: string
          id: string
          indicator_id: string
          notes: string | null
          period: string
          status: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_id: string
          notes?: string | null
          period: string
          status?: string | null
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          indicator_id?: string
          notes?: string | null
          period?: string
          status?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_results_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          area: string | null
          code: string | null
          created_at: string
          deleted_at: string | null
          direction: string
          frequency: string
          id: string
          name: string
          notes: string | null
          responsible_id: string | null
          target: number
          unit: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          direction?: string
          frequency?: string
          id?: string
          name: string
          notes?: string | null
          responsible_id?: string | null
          target?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          direction?: string
          frequency?: string
          id?: string
          name?: string
          notes?: string | null
          responsible_id?: string | null
          target?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicators_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_agenda: {
        Row: {
          created_at: string
          from_meeting_id: string | null
          id: string
          meeting_id: string
          notes: string | null
          position: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_meeting_id?: string | null
          id?: string
          meeting_id: string
          notes?: string | null
          position?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_meeting_id?: string | null
          id?: string
          meeting_id?: string
          notes?: string | null
          position?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_from_meeting_id_fkey"
            columns: ["from_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_agenda_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          meeting_date: string
          meeting_time: string | null
          notes: string | null
          participants: string[]
          recurrence_frequency: string | null
          recurrence_parent_id: string | null
          recurrence_until: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          meeting_date: string
          meeting_time?: string | null
          notes?: string | null
          participants?: string[]
          recurrence_frequency?: string | null
          recurrence_parent_id?: string | null
          recurrence_until?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          meeting_date?: string
          meeting_time?: string | null
          notes?: string | null
          participants?: string[]
          recurrence_frequency?: string | null
          recurrence_parent_id?: string | null
          recurrence_until?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "meetings"
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
          root_cause_data: Json | null
          root_cause_tool: string | null
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
          root_cause_data?: Json | null
          root_cause_tool?: string | null
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
          root_cause_data?: Json | null
          root_cause_tool?: string | null
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
      supplier_evaluations: {
        Row: {
          created_at: string
          evaluation_date: string
          evaluator_id: string | null
          evaluator_name: string | null
          id: string
          observations: string | null
          score: number
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluation_date?: string
          evaluator_id?: string | null
          evaluator_name?: string | null
          id?: string
          observations?: string | null
          score: number
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluation_date?: string
          evaluator_id?: string | null
          evaluator_name?: string | null
          id?: string
          observations?: string | null
          score?: number
          supplier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_portal_submissions: {
        Row: {
          contact_email: string | null
          created_at: string
          description: string | null
          document_type: string
          file_url: string | null
          id: string
          linked_supplier_id: string | null
          origin: string
          protocol: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          supplier_code: string
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          document_type: string
          file_url?: string | null
          id?: string
          linked_supplier_id?: string | null
          origin?: string
          protocol: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supplier_code: string
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          document_type?: string
          file_url?: string | null
          id?: string
          linked_supplier_id?: string | null
          origin?: string
          protocol?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supplier_code?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: []
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
          evaluation_frequency_days: number | null
          id: string
          last_evaluation_date: string | null
          name: string
          next_evaluation_date: string | null
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
          evaluation_frequency_days?: number | null
          id?: string
          last_evaluation_date?: string | null
          name: string
          next_evaluation_date?: string | null
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
          evaluation_frequency_days?: number | null
          id?: string
          last_evaluation_date?: string | null
          name?: string
          next_evaluation_date?: string | null
          notes?: string | null
          phone?: string | null
          qualified_until?: string | null
          rating?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_timeline: {
        Row: {
          action: string
          author_id: string | null
          author_name: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          action: string
          author_id?: string | null
          author_name: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          action?: string
          author_id?: string | null
          author_name?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_timeline_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_timeline_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          contact_email: string | null
          created_at: string
          customer_name: string
          deleted_at: string | null
          description: string
          id: string
          linked_occurrence_id: string | null
          origin: string
          priority: string
          protocol: string
          satisfaction_score: number | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          contact_email?: string | null
          created_at?: string
          customer_name: string
          deleted_at?: string | null
          description: string
          id?: string
          linked_occurrence_id?: string | null
          origin?: string
          priority?: string
          protocol: string
          satisfaction_score?: number | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          contact_email?: string | null
          created_at?: string
          customer_name?: string
          deleted_at?: string | null
          description?: string
          id?: string
          linked_occurrence_id?: string | null
          origin?: string
          priority?: string
          protocol?: string
          satisfaction_score?: number | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_linked_occurrence_id_fkey"
            columns: ["linked_occurrence_id"]
            isOneToOne: false
            referencedRelation: "occurrences"
            referencedColumns: ["id"]
          },
        ]
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
      next_supplier_doc_protocol: { Args: never; Returns: string }
      next_ticket_protocol: { Args: never; Returns: string }
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
