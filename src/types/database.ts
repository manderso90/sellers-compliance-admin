// Seller's Compliance — Type definitions matching production Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type JobStatus = 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
export type DispatchStatus = 'unscheduled' | 'scheduled' | 'dispatched' | 'en_route'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          is_active: boolean
          avatar_url: string | null
          home_latitude: number | null
          home_longitude: number | null
          roles: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          is_active?: boolean
          avatar_url?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          roles?: string[]
        }
        Update: {
          email?: string
          full_name?: string | null
          phone?: string | null
          is_active?: boolean
          avatar_url?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          roles?: string[]
        }
        Relationships: []
      }
      inspections: {
        Row: {
          id: string
          property_id: string
          customer_id: string
          assigned_inspector_id: string | null
          status: JobStatus
          requested_date: string | null
          requested_time_preference: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          scheduled_end: string | null
          completed_at: string | null
          service_type: string
          includes_installation: boolean
          access_instructions: string | null
          lockbox_code: string | null
          contact_on_site: string | null
          escrow_number: string | null
          escrow_officer_name: string | null
          listing_agent_name: string | null
          price: number | null
          invoice_number: string | null
          payment_status: string | null
          admin_notes: string | null
          public_notes: string | null
          schedule_notes: string | null
          estimated_duration_minutes: number
          inspection_labor_cost: number | null
          inspection_travel_cost: number | null
          started_at: string | null
          work_started_at: string | null
          inspector_outcome: string | null
          inspector_notes: string | null
          dispatch_status: DispatchStatus
          last_reassigned_by: string | null
          last_reassigned_at: string | null
          stripe_checkout_session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          customer_id: string
          assigned_inspector_id?: string | null
          status?: JobStatus
          requested_date?: string | null
          requested_time_preference?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          completed_at?: string | null
          service_type?: string
          includes_installation?: boolean
          access_instructions?: string | null
          lockbox_code?: string | null
          contact_on_site?: string | null
          escrow_number?: string | null
          escrow_officer_name?: string | null
          listing_agent_name?: string | null
          price?: number | null
          invoice_number?: string | null
          payment_status?: string | null
          admin_notes?: string | null
          public_notes?: string | null
          schedule_notes?: string | null
          estimated_duration_minutes?: number
          inspection_labor_cost?: number | null
          inspection_travel_cost?: number | null
          inspector_outcome?: string | null
          inspector_notes?: string | null
          dispatch_status?: DispatchStatus
          last_reassigned_by?: string | null
          last_reassigned_at?: string | null
          stripe_checkout_session_id?: string | null
        }
        Update: {
          property_id?: string
          customer_id?: string
          assigned_inspector_id?: string | null
          status?: JobStatus
          requested_date?: string | null
          requested_time_preference?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          scheduled_end?: string | null
          completed_at?: string | null
          service_type?: string
          includes_installation?: boolean
          access_instructions?: string | null
          lockbox_code?: string | null
          contact_on_site?: string | null
          escrow_number?: string | null
          escrow_officer_name?: string | null
          listing_agent_name?: string | null
          price?: number | null
          invoice_number?: string | null
          payment_status?: string | null
          admin_notes?: string | null
          public_notes?: string | null
          estimated_duration_minutes?: number
          inspection_labor_cost?: number | null
          inspection_travel_cost?: number | null
          started_at?: string | null
          work_started_at?: string | null
          inspector_outcome?: string | null
          inspector_notes?: string | null
          dispatch_status?: DispatchStatus
          last_reassigned_by?: string | null
          last_reassigned_at?: string | null
          schedule_notes?: string | null
          stripe_checkout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'inspections_customer_id_fkey'
            columns: ['customer_id']
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inspections_property_id_fkey'
            columns: ['property_id']
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inspections_assigned_inspector_id_fkey'
            columns: ['assigned_inspector_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      properties: {
        Row: {
          id: string
          street_address: string
          unit: string | null
          city: string
          state: string
          zip_code: string
          county: string | null
          property_type: string
          square_footage: number | null
          year_built: number | null
          latitude: number | null
          longitude: number | null
          bedrooms: number | null
          bathrooms: number | null
          levels: number | null
          adu_count: number | null
          unit_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          street_address: string
          unit?: string | null
          city: string
          state?: string
          zip_code: string
          county?: string | null
          property_type?: string
          square_footage?: number | null
          year_built?: number | null
          latitude?: number | null
          longitude?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          levels?: number | null
          adu_count?: number | null
          unit_count?: number | null
        }
        Update: {
          street_address?: string
          unit?: string | null
          city?: string
          state?: string
          zip_code?: string
          county?: string | null
          property_type?: string
          square_footage?: number | null
          year_built?: number | null
          latitude?: number | null
          longitude?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          levels?: number | null
          adu_count?: number | null
          unit_count?: number | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          company_name: string | null
          customer_type: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone?: string | null
          company_name?: string | null
          customer_type?: string
          notes?: string | null
        }
        Update: {
          full_name?: string
          email?: string
          phone?: string | null
          company_name?: string | null
          customer_type?: string
          notes?: string | null
        }
        Relationships: []
      }
      inspection_status_history: {
        Row: {
          id: string
          inspection_id: string
          changed_by: string | null
          from_status: string | null
          to_status: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inspection_id: string
          changed_by?: string | null
          from_status?: string | null
          to_status: string
          note?: string | null
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Inspection = Database['public']['Tables']['inspections']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type InspectionStatusHistory = Database['public']['Tables']['inspection_status_history']['Row']

// Backward-compatible aliases used by components
// "Inspector" is a profile with the inspector role
export type Inspector = Profile
// "Job" is an inspection with joined property/customer fields flattened on
export type Job = Inspection & {
  inspector_name?: string | null
  client_name: string
  client_phone: string | null
  client_email: string | null
  address: string
  city: string
  state: string
  zip_code: string
  has_lockbox: boolean
  title: string
  notes: string | null
}
// Keep old name available
export type JobStatusHistory = InspectionStatusHistory
