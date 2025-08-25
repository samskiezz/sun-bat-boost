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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      battery_vpp_compatibility: {
        Row: {
          battery_id: string | null
          compatibility_score: number | null
          created_at: string | null
          id: string
          notes: string | null
          verified_date: string | null
          vpp_provider_id: string | null
        }
        Insert: {
          battery_id?: string | null
          compatibility_score?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          verified_date?: string | null
          vpp_provider_id?: string | null
        }
        Update: {
          battery_id?: string | null
          compatibility_score?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          verified_date?: string | null
          vpp_provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battery_vpp_compatibility_battery_id_fkey"
            columns: ["battery_id"]
            isOneToOne: false
            referencedRelation: "cec_batteries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battery_vpp_compatibility_vpp_provider_id_fkey"
            columns: ["vpp_provider_id"]
            isOneToOne: false
            referencedRelation: "vpp_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      cec_batteries: {
        Row: {
          approved_date: string | null
          brand: string
          capacity_kwh: number
          cec_id: string | null
          cec_listing_id: string | null
          chemistry: string | null
          created_at: string | null
          cycles: number | null
          dimensions_height: number | null
          dimensions_length: number | null
          dimensions_width: number | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          model: string
          model_number: string
          updated_at: string | null
          usable_capacity_kwh: number | null
          voltage: number | null
          warranty_years: number | null
          weight: number | null
        }
        Insert: {
          approved_date?: string | null
          brand: string
          capacity_kwh: number
          cec_id?: string | null
          cec_listing_id?: string | null
          chemistry?: string | null
          created_at?: string | null
          cycles?: number | null
          dimensions_height?: number | null
          dimensions_length?: number | null
          dimensions_width?: number | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          model: string
          model_number: string
          updated_at?: string | null
          usable_capacity_kwh?: number | null
          voltage?: number | null
          warranty_years?: number | null
          weight?: number | null
        }
        Update: {
          approved_date?: string | null
          brand?: string
          capacity_kwh?: number
          cec_id?: string | null
          cec_listing_id?: string | null
          chemistry?: string | null
          created_at?: string | null
          cycles?: number | null
          dimensions_height?: number | null
          dimensions_length?: number | null
          dimensions_width?: number | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          model?: string
          model_number?: string
          updated_at?: string | null
          usable_capacity_kwh?: number | null
          voltage?: number | null
          warranty_years?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      cec_data_refresh_log: {
        Row: {
          completed_at: string | null
          data_source_url: string | null
          error_message: string | null
          id: string
          records_added: number | null
          records_deactivated: number | null
          records_updated: number | null
          refresh_type: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          data_source_url?: string | null
          error_message?: string | null
          id?: string
          records_added?: number | null
          records_deactivated?: number | null
          records_updated?: number | null
          refresh_type: string
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          data_source_url?: string | null
          error_message?: string | null
          id?: string
          records_added?: number | null
          records_deactivated?: number | null
          records_updated?: number | null
          refresh_type?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      cec_inverters: {
        Row: {
          ac_output_kw: number
          approved_date: string | null
          brand: string
          cec_id: string | null
          cec_listing_id: string | null
          created_at: string | null
          dc_input_kw: number | null
          dimensions_height: number | null
          dimensions_length: number | null
          dimensions_width: number | null
          efficiency: number | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          model: string
          model_number: string
          mppt_channels: number | null
          phases: number | null
          type: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          ac_output_kw: number
          approved_date?: string | null
          brand: string
          cec_id?: string | null
          cec_listing_id?: string | null
          created_at?: string | null
          dc_input_kw?: number | null
          dimensions_height?: number | null
          dimensions_length?: number | null
          dimensions_width?: number | null
          efficiency?: number | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          model: string
          model_number: string
          mppt_channels?: number | null
          phases?: number | null
          type?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          ac_output_kw?: number
          approved_date?: string | null
          brand?: string
          cec_id?: string | null
          cec_listing_id?: string | null
          created_at?: string | null
          dc_input_kw?: number | null
          dimensions_height?: number | null
          dimensions_length?: number | null
          dimensions_width?: number | null
          efficiency?: number | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          model?: string
          model_number?: string
          mppt_channels?: number | null
          phases?: number | null
          type?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      cec_panels: {
        Row: {
          approved_date: string | null
          brand: string
          cec_id: string | null
          cec_listing_id: string | null
          created_at: string | null
          dimensions_length: number | null
          dimensions_width: number | null
          efficiency: number | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          model: string
          model_number: string
          technology: string | null
          updated_at: string | null
          watts: number
          weight: number | null
        }
        Insert: {
          approved_date?: string | null
          brand: string
          cec_id?: string | null
          cec_listing_id?: string | null
          created_at?: string | null
          dimensions_length?: number | null
          dimensions_width?: number | null
          efficiency?: number | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          model: string
          model_number: string
          technology?: string | null
          updated_at?: string | null
          watts: number
          weight?: number | null
        }
        Update: {
          approved_date?: string | null
          brand?: string
          cec_id?: string | null
          cec_listing_id?: string | null
          created_at?: string | null
          dimensions_length?: number | null
          dimensions_width?: number | null
          efficiency?: number | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          model?: string
          model_number?: string
          technology?: string | null
          updated_at?: string | null
          watts?: number
          weight?: number | null
        }
        Relationships: []
      }
      postcode_zones: {
        Row: {
          created_at: string
          postcode: number
          state: string
          zone: number
        }
        Insert: {
          created_at?: string
          postcode: number
          state: string
          zone: number
        }
        Update: {
          created_at?: string
          postcode?: number
          state?: string
          zone?: number
        }
        Relationships: []
      }
      refresh_log: {
        Row: {
          created_at: string
          details: string | null
          fetched_at: string
          id: string
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          fetched_at?: string
          id?: string
          source: string
          status: string
        }
        Update: {
          created_at?: string
          details?: string | null
          fetched_at?: string
          id?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      vpp_providers: {
        Row: {
          company: string
          compatible_battery_brands: string[] | null
          compatible_inverter_brands: string[] | null
          contact_phone: string | null
          created_at: string | null
          estimated_annual_reward: number | null
          id: string
          is_active: boolean | null
          max_battery_kwh: number | null
          min_battery_kwh: number | null
          name: string
          requirements: string | null
          signup_bonus: number | null
          states_available: string[] | null
          terms_url: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          company: string
          compatible_battery_brands?: string[] | null
          compatible_inverter_brands?: string[] | null
          contact_phone?: string | null
          created_at?: string | null
          estimated_annual_reward?: number | null
          id?: string
          is_active?: boolean | null
          max_battery_kwh?: number | null
          min_battery_kwh?: number | null
          name: string
          requirements?: string | null
          signup_bonus?: number | null
          states_available?: string[] | null
          terms_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          company?: string
          compatible_battery_brands?: string[] | null
          compatible_inverter_brands?: string[] | null
          contact_phone?: string | null
          created_at?: string | null
          estimated_annual_reward?: number | null
          id?: string
          is_active?: boolean | null
          max_battery_kwh?: number | null
          min_battery_kwh?: number | null
          name?: string
          requirements?: string | null
          signup_bonus?: number | null
          states_available?: string[] | null
          terms_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
