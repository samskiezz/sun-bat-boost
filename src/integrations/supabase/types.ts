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
      batteries: {
        Row: {
          approval_expires: string | null
          approval_status: string | null
          brand: string
          certificate: string | null
          chemistry: string | null
          datasheet_url: string | null
          hash: string | null
          id: number
          model: string
          scraped_at: string
          source_url: string
        }
        Insert: {
          approval_expires?: string | null
          approval_status?: string | null
          brand: string
          certificate?: string | null
          chemistry?: string | null
          datasheet_url?: string | null
          hash?: string | null
          id?: number
          model: string
          scraped_at?: string
          source_url: string
        }
        Update: {
          approval_expires?: string | null
          approval_status?: string | null
          brand?: string
          certificate?: string | null
          chemistry?: string | null
          datasheet_url?: string | null
          hash?: string | null
          id?: number
          model?: string
          scraped_at?: string
          source_url?: string
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
      product_changes: {
        Row: {
          brand: string
          changed_at: string
          id: number
          model: string
          new_hash: string | null
          old_hash: string | null
          product_type: string
        }
        Insert: {
          brand: string
          changed_at?: string
          id?: number
          model: string
          new_hash?: string | null
          old_hash?: string | null
          product_type: string
        }
        Update: {
          brand?: string
          changed_at?: string
          id?: number
          model?: string
          new_hash?: string | null
          old_hash?: string | null
          product_type?: string
        }
        Relationships: []
      }
      pv_modules: {
        Row: {
          approval_expires: string | null
          approval_status: string | null
          brand: string
          certificate: string | null
          datasheet_url: string | null
          hash: string | null
          id: number
          model: string
          scraped_at: string
          source_url: string
          technology: string | null
        }
        Insert: {
          approval_expires?: string | null
          approval_status?: string | null
          brand: string
          certificate?: string | null
          datasheet_url?: string | null
          hash?: string | null
          id?: number
          model: string
          scraped_at?: string
          source_url: string
          technology?: string | null
        }
        Update: {
          approval_expires?: string | null
          approval_status?: string | null
          brand?: string
          certificate?: string | null
          datasheet_url?: string | null
          hash?: string | null
          id?: number
          model?: string
          scraped_at?: string
          source_url?: string
          technology?: string | null
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
