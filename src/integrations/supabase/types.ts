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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admission_checklists: {
        Row: {
          created_at: string
          created_by: string
          doc_cedula: boolean | null
          doc_contactos_emergencia: boolean | null
          doc_contrato: boolean | null
          doc_eps: boolean | null
          doc_formulas_medicas: boolean | null
          doc_historia_clinica: boolean | null
          doc_inventario_f3: boolean | null
          doc_laboratorios: boolean | null
          doc_reglamento: boolean | null
          doc_vacunacion: boolean | null
          doc_valoracion_f2: boolean | null
          folder_status: string | null
          id: string
          observations: string | null
          resident_id: string
          signature_coordinator: string | null
          signature_family: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          doc_cedula?: boolean | null
          doc_contactos_emergencia?: boolean | null
          doc_contrato?: boolean | null
          doc_eps?: boolean | null
          doc_formulas_medicas?: boolean | null
          doc_historia_clinica?: boolean | null
          doc_inventario_f3?: boolean | null
          doc_laboratorios?: boolean | null
          doc_reglamento?: boolean | null
          doc_vacunacion?: boolean | null
          doc_valoracion_f2?: boolean | null
          folder_status?: string | null
          id?: string
          observations?: string | null
          resident_id: string
          signature_coordinator?: string | null
          signature_family?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          doc_cedula?: boolean | null
          doc_contactos_emergencia?: boolean | null
          doc_contrato?: boolean | null
          doc_eps?: boolean | null
          doc_formulas_medicas?: boolean | null
          doc_historia_clinica?: boolean | null
          doc_inventario_f3?: boolean | null
          doc_laboratorios?: boolean | null
          doc_reglamento?: boolean | null
          doc_vacunacion?: boolean | null
          doc_valoracion_f2?: boolean | null
          folder_status?: string | null
          id?: string
          observations?: string | null
          resident_id?: string
          signature_coordinator?: string | null
          signature_family?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_checklists_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      belongings_inventory: {
        Row: {
          created_at: string
          created_by: string
          egress_date: string | null
          egress_family_document: string | null
          egress_family_name: string | null
          egress_reason: string | null
          egress_signature_family: string | null
          egress_signature_hogar: string | null
          id: string
          items: Json
          reason: string
          resident_id: string
          signature_coordinator: string | null
          signature_family: string | null
          signature_resident: string | null
          total_items: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          egress_date?: string | null
          egress_family_document?: string | null
          egress_family_name?: string | null
          egress_reason?: string | null
          egress_signature_family?: string | null
          egress_signature_hogar?: string | null
          id?: string
          items?: Json
          reason: string
          resident_id: string
          signature_coordinator?: string | null
          signature_family?: string | null
          signature_resident?: string | null
          total_items?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          egress_date?: string | null
          egress_family_document?: string | null
          egress_family_name?: string | null
          egress_reason?: string | null
          egress_signature_family?: string | null
          egress_signature_hogar?: string | null
          id?: string
          items?: Json
          reason?: string
          resident_id?: string
          signature_coordinator?: string | null
          signature_family?: string | null
          signature_resident?: string | null
          total_items?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "belongings_inventory_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrations: {
        Row: {
          activity: string | null
          budget_actual: number | null
          budget_estimated: number | null
          completed: boolean | null
          created_at: string
          created_by: string
          event_month: number | null
          event_name: string
          evidence_urls: Json | null
          feedback: string | null
          id: string
          responsible: string | null
        }
        Insert: {
          activity?: string | null
          budget_actual?: number | null
          budget_estimated?: number | null
          completed?: boolean | null
          created_at?: string
          created_by: string
          event_month?: number | null
          event_name: string
          evidence_urls?: Json | null
          feedback?: string | null
          id?: string
          responsible?: string | null
        }
        Update: {
          activity?: string | null
          budget_actual?: number | null
          budget_estimated?: number | null
          completed?: boolean | null
          created_at?: string
          created_by?: string
          event_month?: number | null
          event_name?: string
          evidence_urls?: Json | null
          feedback?: string | null
          id?: string
          responsible?: string | null
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          parent_code: string | null
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          parent_code?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parent_code?: string | null
        }
        Relationships: []
      }
      companion_authorizations: {
        Row: {
          appointment_date: string
          appointment_id: string | null
          authorization_text: string | null
          created_at: string
          family_document: string | null
          family_name: string
          id: string
          resident_id: string
          signature_date: string | null
          signature_family: string | null
          specialty: string | null
        }
        Insert: {
          appointment_date: string
          appointment_id?: string | null
          authorization_text?: string | null
          created_at?: string
          family_document?: string | null
          family_name: string
          id?: string
          resident_id: string
          signature_date?: string | null
          signature_family?: string | null
          specialty?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_id?: string | null
          authorization_text?: string | null
          created_at?: string
          family_document?: string | null
          family_name?: string
          id?: string
          resident_id?: string
          signature_date?: string | null
          signature_family?: string | null
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companion_authorizations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "medical_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_authorizations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          ai_nursing_note: string | null
          created_at: string
          created_by: string
          elimination: string | null
          hydration_glasses: number | null
          id: string
          log_date: string
          mood: string | null
          nutrition_pct: number | null
          observations: string | null
          resident_id: string
          shift: string
          signature: string | null
          updated_at: string
        }
        Insert: {
          ai_nursing_note?: string | null
          created_at?: string
          created_by: string
          elimination?: string | null
          hydration_glasses?: number | null
          id?: string
          log_date?: string
          mood?: string | null
          nutrition_pct?: number | null
          observations?: string | null
          resident_id: string
          shift: string
          signature?: string | null
          updated_at?: string
        }
        Update: {
          ai_nursing_note?: string | null
          created_at?: string
          created_by?: string
          elimination?: string | null
          hydration_glasses?: number | null
          id?: string
          log_date?: string
          mood?: string | null
          nutrition_pct?: number | null
          observations?: string | null
          resident_id?: string
          shift?: string
          signature?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      disinfection_records: {
        Row: {
          area: string
          completed: boolean | null
          created_at: string
          created_by: string
          id: string
          record_date: string
          record_type: string | null
          signature: string | null
        }
        Insert: {
          area: string
          completed?: boolean | null
          created_at?: string
          created_by: string
          id?: string
          record_date?: string
          record_type?: string | null
          signature?: string | null
        }
        Update: {
          area?: string
          completed?: boolean | null
          created_at?: string
          created_by?: string
          id?: string
          record_date?: string
          record_type?: string | null
          signature?: string | null
        }
        Relationships: []
      }
      document_attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      emergency_folders: {
        Row: {
          cedula_date: string | null
          clinical_summary_date: string | null
          created_at: string
          has_cedula: boolean | null
          has_clinical_summary: boolean | null
          has_doctor_contact: boolean | null
          has_family_contacts: boolean | null
          has_medications_list: boolean | null
          id: string
          last_review_date: string | null
          medications_date: string | null
          resident_id: string
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          cedula_date?: string | null
          clinical_summary_date?: string | null
          created_at?: string
          has_cedula?: boolean | null
          has_clinical_summary?: boolean | null
          has_doctor_contact?: boolean | null
          has_family_contacts?: boolean | null
          has_medications_list?: boolean | null
          id?: string
          last_review_date?: string | null
          medications_date?: string | null
          resident_id: string
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          cedula_date?: string | null
          clinical_summary_date?: string | null
          created_at?: string
          has_cedula?: boolean | null
          has_clinical_summary?: boolean | null
          has_doctor_contact?: boolean | null
          has_family_contacts?: boolean | null
          has_medications_list?: boolean | null
          id?: string
          last_review_date?: string | null
          medications_date?: string | null
          resident_id?: string
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_folders_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: true
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          account_id: string | null
          bank: string | null
          client_supplier: string | null
          cost_center: string | null
          created_at: string
          created_by: string
          description: string
          expense_amount: number | null
          id: string
          income_amount: number | null
          payment_method: string | null
          payment_status: string | null
          transaction_date: string
          voucher_number: string | null
        }
        Insert: {
          account_id?: string | null
          bank?: string | null
          client_supplier?: string | null
          cost_center?: string | null
          created_at?: string
          created_by: string
          description: string
          expense_amount?: number | null
          id?: string
          income_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          transaction_date?: string
          voucher_number?: string | null
        }
        Update: {
          account_id?: string | null
          bank?: string | null
          client_supplier?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string
          description?: string
          expense_amount?: number | null
          id?: string
          income_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          transaction_date?: string
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      food_intake_records: {
        Row: {
          created_at: string
          created_by: string
          details: string | null
          expiry_ok: boolean | null
          id: string
          invoice_number: string | null
          packaging_ok: boolean | null
          photo_urls: Json | null
          reception_date: string | null
          record_month: string
          signature: string | null
          supplier: string | null
          temperature_ok: boolean | null
          week_number: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          details?: string | null
          expiry_ok?: boolean | null
          id?: string
          invoice_number?: string | null
          packaging_ok?: boolean | null
          photo_urls?: Json | null
          reception_date?: string | null
          record_month: string
          signature?: string | null
          supplier?: string | null
          temperature_ok?: boolean | null
          week_number?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          details?: string | null
          expiry_ok?: boolean | null
          id?: string
          invoice_number?: string | null
          packaging_ok?: boolean | null
          photo_urls?: Json | null
          reception_date?: string | null
          record_month?: string
          signature?: string | null
          supplier?: string | null
          temperature_ok?: boolean | null
          week_number?: number | null
        }
        Relationships: []
      }
      fridge_temps: {
        Row: {
          created_at: string
          created_by: string
          fridge_name: string
          id: string
          is_safe: boolean | null
          notes: string | null
          record_date: string
          shift: string
          temperature: number
        }
        Insert: {
          created_at?: string
          created_by: string
          fridge_name: string
          id?: string
          is_safe?: boolean | null
          notes?: string | null
          record_date?: string
          shift: string
          temperature: number
        }
        Update: {
          created_at?: string
          created_by?: string
          fridge_name?: string
          id?: string
          is_safe?: boolean | null
          notes?: string | null
          record_date?: string
          shift?: string
          temperature?: number
        }
        Relationships: []
      }
      geriatric_assessments: {
        Row: {
          answers: Json
          assessment_date: string
          created_at: string
          created_by: string
          id: string
          interpretation: string | null
          max_score: number
          resident_id: string
          score: number
          signature_evaluator: string | null
          signature_supervisor: string | null
          test_key: string
          test_name: string
        }
        Insert: {
          answers?: Json
          assessment_date?: string
          created_at?: string
          created_by: string
          id?: string
          interpretation?: string | null
          max_score: number
          resident_id: string
          score: number
          signature_evaluator?: string | null
          signature_supervisor?: string | null
          test_key: string
          test_name: string
        }
        Update: {
          answers?: Json
          assessment_date?: string
          created_at?: string
          created_by?: string
          id?: string
          interpretation?: string | null
          max_score?: number
          resident_id?: string
          score?: number
          signature_evaluator?: string | null
          signature_supervisor?: string | null
          test_key?: string
          test_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "geriatric_assessments_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          cause_analysis: string | null
          consequences: string | null
          corrective_actions: Json | null
          created_at: string
          created_by: string
          description: string | null
          er_facility: string | null
          family_contact_name: string | null
          family_notified: boolean | null
          first_aid: boolean | null
          id: string
          incident_datetime: string
          incident_type: string
          resident_id: string
          transferred_to_er: boolean | null
        }
        Insert: {
          cause_analysis?: string | null
          consequences?: string | null
          corrective_actions?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          er_facility?: string | null
          family_contact_name?: string | null
          family_notified?: boolean | null
          first_aid?: boolean | null
          id?: string
          incident_datetime?: string
          incident_type: string
          resident_id: string
          transferred_to_er?: boolean | null
        }
        Update: {
          cause_analysis?: string | null
          consequences?: string | null
          corrective_actions?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          er_facility?: string | null
          family_contact_name?: string | null
          family_notified?: boolean | null
          first_aid?: boolean | null
          id?: string
          incident_datetime?: string
          incident_type?: string
          resident_id?: string
          transferred_to_er?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          invoice_number: string | null
          items: Json
          payment_method: string | null
          period: string | null
          resident_id: string | null
          status: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json
          payment_method?: string | null
          period?: string | null
          resident_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json
          payment_method?: string | null
          period?: string | null
          resident_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_checklists: {
        Row: {
          check_date: string
          cleaned_kitchen: boolean | null
          created_at: string
          created_by: string
          id: string
          observations: string | null
          respected_diets: boolean | null
          used_ppe: boolean | null
          washed_produce: boolean | null
        }
        Insert: {
          check_date?: string
          cleaned_kitchen?: boolean | null
          created_at?: string
          created_by: string
          id?: string
          observations?: string | null
          respected_diets?: boolean | null
          used_ppe?: boolean | null
          washed_produce?: boolean | null
        }
        Update: {
          check_date?: string
          cleaned_kitchen?: boolean | null
          created_at?: string
          created_by?: string
          id?: string
          observations?: string | null
          respected_diets?: boolean | null
          used_ppe?: boolean | null
          washed_produce?: boolean | null
        }
        Relationships: []
      }
      life_histories: {
        Row: {
          children_info: string | null
          created_at: string
          created_by: string
          dislikes: string | null
          dreams: string | null
          favorite_food: string | null
          favorite_music: string | null
          hobbies: string | null
          id: string
          marital_status: string | null
          morning_or_night: string | null
          most_important_person: string | null
          occupation: string | null
          photos: Json | null
          preferred_name: string | null
          resident_id: string
          spiritual_beliefs: string | null
          updated_at: string
        }
        Insert: {
          children_info?: string | null
          created_at?: string
          created_by: string
          dislikes?: string | null
          dreams?: string | null
          favorite_food?: string | null
          favorite_music?: string | null
          hobbies?: string | null
          id?: string
          marital_status?: string | null
          morning_or_night?: string | null
          most_important_person?: string | null
          occupation?: string | null
          photos?: Json | null
          preferred_name?: string | null
          resident_id: string
          spiritual_beliefs?: string | null
          updated_at?: string
        }
        Update: {
          children_info?: string | null
          created_at?: string
          created_by?: string
          dislikes?: string | null
          dreams?: string | null
          favorite_food?: string | null
          favorite_music?: string | null
          hobbies?: string | null
          id?: string
          marital_status?: string | null
          morning_or_night?: string | null
          most_important_person?: string | null
          occupation?: string | null
          photos?: Json | null
          preferred_name?: string | null
          resident_id?: string
          spiritual_beliefs?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_histories_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string | null
          companion: string | null
          companion_type: string | null
          created_at: string
          created_by: string
          id: string
          location: string | null
          medical_summary: string | null
          notes: string | null
          resident_id: string
          specialty: string | null
          updated_at: string
          was_attended: boolean | null
        }
        Insert: {
          appointment_date: string
          appointment_time?: string | null
          companion?: string | null
          companion_type?: string | null
          created_at?: string
          created_by: string
          id?: string
          location?: string | null
          medical_summary?: string | null
          notes?: string | null
          resident_id: string
          specialty?: string | null
          updated_at?: string
          was_attended?: boolean | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string | null
          companion?: string | null
          companion_type?: string | null
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          medical_summary?: string | null
          notes?: string | null
          resident_id?: string
          specialty?: string | null
          updated_at?: string
          was_attended?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_appointments_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_admin: {
        Row: {
          admin_datetime: string
          administered_by: string
          check_dose: boolean | null
          check_medication: boolean | null
          check_patient: boolean | null
          check_route: boolean | null
          check_time: boolean | null
          created_at: string
          dose_given: string | null
          id: string
          medication_id: string
          notes: string | null
          resident_id: string
          route: string | null
          signature: string | null
          skip_reason: string | null
          was_administered: boolean | null
        }
        Insert: {
          admin_datetime?: string
          administered_by: string
          check_dose?: boolean | null
          check_medication?: boolean | null
          check_patient?: boolean | null
          check_route?: boolean | null
          check_time?: boolean | null
          created_at?: string
          dose_given?: string | null
          id?: string
          medication_id: string
          notes?: string | null
          resident_id: string
          route?: string | null
          signature?: string | null
          skip_reason?: string | null
          was_administered?: boolean | null
        }
        Update: {
          admin_datetime?: string
          administered_by?: string
          check_dose?: boolean | null
          check_medication?: boolean | null
          check_patient?: boolean | null
          check_route?: boolean | null
          check_time?: boolean | null
          created_at?: string
          dose_given?: string | null
          id?: string
          medication_id?: string
          notes?: string | null
          resident_id?: string
          route?: string | null
          signature?: string | null
          skip_reason?: string | null
          was_administered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_admin_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_admin_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          concentration: string | null
          created_at: string
          created_by: string
          dose: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          medication_name: string
          notes: string | null
          prescription_date: string | null
          prescription_image_url: string | null
          resident_id: string
          route: string | null
          schedule: string | null
          updated_at: string
        }
        Insert: {
          concentration?: string | null
          created_at?: string
          created_by: string
          dose?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          medication_name: string
          notes?: string | null
          prescription_date?: string | null
          prescription_image_url?: string | null
          resident_id: string
          route?: string | null
          schedule?: string | null
          updated_at?: string
        }
        Update: {
          concentration?: string | null
          created_at?: string
          created_by?: string
          dose?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          medication_name?: string
          notes?: string | null
          prescription_date?: string | null
          prescription_image_url?: string | null
          resident_id?: string
          route?: string | null
          schedule?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_evaluations: {
        Row: {
          concept: string | null
          created_at: string
          evaluated_by: string
          evaluated_user_id: string
          evaluation_date: string
          id: string
          improvement_plan: string | null
          period: string | null
          score_compliance: number | null
          score_hygiene: number | null
          score_proactivity: number | null
          score_resident_care: number | null
          score_safety: number | null
          score_teamwork: number | null
          total_score: number | null
        }
        Insert: {
          concept?: string | null
          created_at?: string
          evaluated_by: string
          evaluated_user_id: string
          evaluation_date?: string
          id?: string
          improvement_plan?: string | null
          period?: string | null
          score_compliance?: number | null
          score_hygiene?: number | null
          score_proactivity?: number | null
          score_resident_care?: number | null
          score_safety?: number | null
          score_teamwork?: number | null
          total_score?: number | null
        }
        Update: {
          concept?: string | null
          created_at?: string
          evaluated_by?: string
          evaluated_user_id?: string
          evaluation_date?: string
          id?: string
          improvement_plan?: string | null
          period?: string | null
          score_compliance?: number | null
          score_hygiene?: number | null
          score_proactivity?: number | null
          score_resident_care?: number | null
          score_safety?: number | null
          score_teamwork?: number | null
          total_score?: number | null
        }
        Relationships: []
      }
      post_hospitalization: {
        Row: {
          created_at: string
          created_by: string
          diagnosis: string | null
          discharge_summary_url: string | null
          followup_date: string | null
          followup_result: string | null
          hospital_admission_date: string | null
          hospital_discharge_date: string | null
          id: string
          new_instructions: string | null
          resident_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          diagnosis?: string | null
          discharge_summary_url?: string | null
          followup_date?: string | null
          followup_result?: string | null
          hospital_admission_date?: string | null
          hospital_discharge_date?: string | null
          id?: string
          new_instructions?: string | null
          resident_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          diagnosis?: string | null
          discharge_summary_url?: string | null
          followup_date?: string | null
          followup_result?: string | null
          hospital_admission_date?: string | null
          hospital_discharge_date?: string | null
          id?: string
          new_instructions?: string | null
          resident_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hospitalization_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      pqrsf: {
        Row: {
          analysis: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          improvement_plan: string | null
          pqrsf_type: string
          record_date: string
          response_date: string | null
          sender_name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          improvement_plan?: string | null
          pqrsf_type: string
          record_date?: string
          response_date?: string | null
          sender_name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          analysis?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          improvement_plan?: string | null
          pqrsf_type?: string
          record_date?: string
          response_date?: string | null
          sender_name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psychosocial_records: {
        Row: {
          attendees: Json | null
          created_at: string
          created_by: string
          evolution: string | null
          group_achievement: string | null
          group_topic: string | null
          id: string
          reason: string | null
          recommendations: string | null
          record_date: string
          record_type: string
          resident_id: string | null
          signature: string | null
        }
        Insert: {
          attendees?: Json | null
          created_at?: string
          created_by: string
          evolution?: string | null
          group_achievement?: string | null
          group_topic?: string | null
          id?: string
          reason?: string | null
          recommendations?: string | null
          record_date?: string
          record_type: string
          resident_id?: string | null
          signature?: string | null
        }
        Update: {
          attendees?: Json | null
          created_at?: string
          created_by?: string
          evolution?: string | null
          group_achievement?: string | null
          group_topic?: string | null
          id?: string
          reason?: string | null
          recommendations?: string | null
          record_date?: string
          record_type?: string
          resident_id?: string | null
          signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "psychosocial_records_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          admission_date: string
          allergies: string | null
          authorize_social_media: boolean | null
          birth_date: string | null
          birth_place: string | null
          blood_type: string | null
          created_at: string
          document_id: string | null
          emergency_contact_1_name: string | null
          emergency_contact_1_phone: string | null
          emergency_contact_1_relation: string | null
          emergency_contact_2_name: string | null
          emergency_contact_2_phone: string | null
          emergency_contact_2_relation: string | null
          eps: string | null
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          photo_url: string | null
          responsible_family_document: string | null
          responsible_family_name: string | null
          responsible_family_phone: string | null
          room_id: string | null
          special_diet: string | null
          spiritual_preference: string | null
          status: Database["public"]["Enums"]["resident_status"]
          treating_doctor_name: string | null
          treating_doctor_phone: string | null
          trial_end_date: string | null
          updated_at: string
        }
        Insert: {
          admission_date?: string
          allergies?: string | null
          authorize_social_media?: boolean | null
          birth_date?: string | null
          birth_place?: string | null
          blood_type?: string | null
          created_at?: string
          document_id?: string | null
          emergency_contact_1_name?: string | null
          emergency_contact_1_phone?: string | null
          emergency_contact_1_relation?: string | null
          emergency_contact_2_name?: string | null
          emergency_contact_2_phone?: string | null
          emergency_contact_2_relation?: string | null
          eps?: string | null
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          responsible_family_document?: string | null
          responsible_family_name?: string | null
          responsible_family_phone?: string | null
          room_id?: string | null
          special_diet?: string | null
          spiritual_preference?: string | null
          status?: Database["public"]["Enums"]["resident_status"]
          treating_doctor_name?: string | null
          treating_doctor_phone?: string | null
          trial_end_date?: string | null
          updated_at?: string
        }
        Update: {
          admission_date?: string
          allergies?: string | null
          authorize_social_media?: boolean | null
          birth_date?: string | null
          birth_place?: string | null
          blood_type?: string | null
          created_at?: string
          document_id?: string | null
          emergency_contact_1_name?: string | null
          emergency_contact_1_phone?: string | null
          emergency_contact_1_relation?: string | null
          emergency_contact_2_name?: string | null
          emergency_contact_2_phone?: string | null
          emergency_contact_2_relation?: string | null
          eps?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          responsible_family_document?: string | null
          responsible_family_name?: string | null
          responsible_family_phone?: string | null
          room_id?: string | null
          special_diet?: string | null
          spiritual_preference?: string | null
          status?: Database["public"]["Enums"]["resident_status"]
          treating_doctor_name?: string | null
          treating_doctor_phone?: string | null
          trial_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_residents_room"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          floor: string | null
          id: string
          notes: string | null
          room_number: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          floor?: string | null
          id?: string
          notes?: string | null
          room_number: string
        }
        Update: {
          capacity?: number
          created_at?: string
          floor?: string | null
          id?: string
          notes?: string | null
          room_number?: string
        }
        Relationships: []
      }
      spiritual_records: {
        Row: {
          activity_type: string | null
          attendees_count: number | null
          created_at: string
          created_by: string
          id: string
          leader: string | null
          observations: string | null
          record_date: string
          topic: string | null
        }
        Insert: {
          activity_type?: string | null
          attendees_count?: number | null
          created_at?: string
          created_by: string
          id?: string
          leader?: string | null
          observations?: string | null
          record_date?: string
          topic?: string | null
        }
        Update: {
          activity_type?: string | null
          attendees_count?: number | null
          created_at?: string
          created_by?: string
          id?: string
          leader?: string | null
          observations?: string | null
          record_date?: string
          topic?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          nit: string | null
          notes: string | null
          phone: string | null
          products_services: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nit?: string | null
          notes?: string | null
          phone?: string | null
          products_services?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nit?: string | null
          notes?: string | null
          phone?: string | null
          products_services?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      therapeutic_activities: {
        Row: {
          activity_date: string
          activity_name: string
          created_at: string
          created_by: string
          id: string
          observations: string | null
          participants: Json | null
          photo_urls: Json | null
          responsible: string | null
        }
        Insert: {
          activity_date?: string
          activity_name: string
          created_at?: string
          created_by: string
          id?: string
          observations?: string | null
          participants?: Json | null
          photo_urls?: Json | null
          responsible?: string | null
        }
        Update: {
          activity_date?: string
          activity_name?: string
          created_at?: string
          created_by?: string
          id?: string
          observations?: string | null
          participants?: Json | null
          photo_urls?: Json | null
          responsible?: string | null
        }
        Relationships: []
      }
      therapy_records: {
        Row: {
          attended_friday: boolean | null
          attended_monday: boolean | null
          attended_wednesday: boolean | null
          created_at: string
          created_by: string
          evolution_code: string | null
          id: string
          observations: string | null
          resident_id: string
          therapy_type: string | null
          week_start: string
        }
        Insert: {
          attended_friday?: boolean | null
          attended_monday?: boolean | null
          attended_wednesday?: boolean | null
          created_at?: string
          created_by: string
          evolution_code?: string | null
          id?: string
          observations?: string | null
          resident_id: string
          therapy_type?: string | null
          week_start: string
        }
        Update: {
          attended_friday?: boolean | null
          attended_monday?: boolean | null
          attended_wednesday?: boolean | null
          created_at?: string
          created_by?: string
          evolution_code?: string | null
          id?: string
          observations?: string | null
          resident_id?: string
          therapy_type?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapy_records_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          attendees: Json | null
          content: string | null
          created_at: string
          created_by: string
          end_time: string | null
          facilitator: string | null
          facilitator_entity: string | null
          id: string
          objective: string | null
          objective_met: boolean | null
          observations: string | null
          start_time: string | null
          topic: string
          training_date: string
        }
        Insert: {
          attendees?: Json | null
          content?: string | null
          created_at?: string
          created_by: string
          end_time?: string | null
          facilitator?: string | null
          facilitator_entity?: string | null
          id?: string
          objective?: string | null
          objective_met?: boolean | null
          observations?: string | null
          start_time?: string | null
          topic: string
          training_date: string
        }
        Update: {
          attendees?: Json | null
          content?: string | null
          created_at?: string
          created_by?: string
          end_time?: string | null
          facilitator?: string | null
          facilitator_entity?: string | null
          id?: string
          objective?: string | null
          objective_met?: boolean | null
          observations?: string | null
          start_time?: string | null
          topic?: string
          training_date?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vital_signs: {
        Row: {
          blood_pressure: string | null
          created_at: string
          created_by: string
          glucose: number | null
          heart_rate: number | null
          id: string
          notes: string | null
          record_date: string
          resident_id: string
          spo2: number | null
          temperature: number | null
          weight: number | null
        }
        Insert: {
          blood_pressure?: string | null
          created_at?: string
          created_by: string
          glucose?: number | null
          heart_rate?: number | null
          id?: string
          notes?: string | null
          record_date?: string
          resident_id: string
          spo2?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Update: {
          blood_pressure?: string | null
          created_at?: string
          created_by?: string
          glucose?: number | null
          heart_rate?: number | null
          id?: string
          notes?: string | null
          record_date?: string
          resident_id?: string
          spo2?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vital_signs_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "coordinador"
        | "enfermera"
        | "cuidadora"
        | "terapeuta"
        | "psicologo"
        | "administrativo"
      resident_status: "prueba" | "permanente" | "egresado" | "fallecido"
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
      app_role: [
        "super_admin",
        "coordinador",
        "enfermera",
        "cuidadora",
        "terapeuta",
        "psicologo",
        "administrativo",
      ],
      resident_status: ["prueba", "permanente", "egresado", "fallecido"],
    },
  },
} as const
