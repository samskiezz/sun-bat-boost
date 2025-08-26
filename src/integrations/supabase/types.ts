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
          capacity_kwh: number | null
          certificate: string | null
          chemistry: string | null
          datasheet_url: string | null
          description: string | null
          hash: string | null
          id: number
          image_url: string | null
          model: string
          nominal_capacity: number | null
          scraped_at: string
          source_url: string
          units: number | null
          usable_capacity: number | null
          vpp_capable: boolean | null
        }
        Insert: {
          approval_expires?: string | null
          approval_status?: string | null
          brand: string
          capacity_kwh?: number | null
          certificate?: string | null
          chemistry?: string | null
          datasheet_url?: string | null
          description?: string | null
          hash?: string | null
          id?: number
          image_url?: string | null
          model: string
          nominal_capacity?: number | null
          scraped_at?: string
          source_url: string
          units?: number | null
          usable_capacity?: number | null
          vpp_capable?: boolean | null
        }
        Update: {
          approval_expires?: string | null
          approval_status?: string | null
          brand?: string
          capacity_kwh?: number | null
          certificate?: string | null
          chemistry?: string | null
          datasheet_url?: string | null
          description?: string | null
          hash?: string | null
          id?: number
          image_url?: string | null
          model?: string
          nominal_capacity?: number | null
          scraped_at?: string
          source_url?: string
          units?: number | null
          usable_capacity?: number | null
          vpp_capable?: boolean | null
        }
        Relationships: []
      }
      data_update_tracking: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          notes: string | null
          record_count: number
          status: string
          table_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          notes?: string | null
          record_count?: number
          status?: string
          table_name: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          notes?: string | null
          record_count?: number
          status?: string
          table_name?: string
        }
        Relationships: []
      }
      doc_spans: {
        Row: {
          bbox: Json | null
          created_at: string
          id: string
          key: string
          page: number
          product_id: string
          text: string
        }
        Insert: {
          bbox?: Json | null
          created_at?: string
          id?: string
          key: string
          page: number
          product_id: string
          text: string
        }
        Update: {
          bbox?: Json | null
          created_at?: string
          id?: string
          key?: string
          page?: number
          product_id?: string
          text?: string
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
          description: string | null
          hash: string | null
          id: number
          image_url: string | null
          model: string
          power_rating: number | null
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
          description?: string | null
          hash?: string | null
          id?: number
          image_url?: string | null
          model: string
          power_rating?: number | null
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
          description?: string | null
          hash?: string | null
          id?: number
          image_url?: string | null
          model?: string
          power_rating?: number | null
          scraped_at?: string
          source_url?: string
          technology?: string | null
        }
        Relationships: []
      }
      replay_items: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          processed: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload: Json
          processed?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          processed?: boolean
        }
        Relationships: []
      }
      train_episodes: {
        Row: {
          context: Json
          created_at: string
          id: string
          metrics: Json
          mode: string
          result: Json
          reward: number
        }
        Insert: {
          context: Json
          created_at?: string
          id?: string
          metrics: Json
          mode: string
          result: Json
          reward: number
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          metrics?: Json
          mode?: string
          result?: Json
          reward?: number
        }
        Relationships: []
      }
      training_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          value?: number
        }
        Relationships: []
      }
      ui_constraints: {
        Row: {
          confidence: number
          created_at: string
          enabled: boolean
          expression: Json
          id: string
          reason: Json
          rule_code: string
          scope: string
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          enabled?: boolean
          expression: Json
          id?: string
          reason: Json
          rule_code: string
          scope: string
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          enabled?: boolean
          expression?: Json
          id?: string
          reason?: Json
          rule_code?: string
          scope?: string
          updated_at?: string
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
      all_products: {
        Row: {
          approval_expires: string | null
          approval_status: string | null
          brand: string | null
          capacity: number | null
          certificate: string | null
          description: string | null
          id: number | null
          image_url: string | null
          model: string | null
          product_type: string | null
          rating: number | null
          scraped_at: string | null
          source_url: string | null
          specs: string | null
          vpp_capable: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_data_freshness: {
        Args: { table_name_param: string }
        Returns: boolean
      }
      refresh_battery_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_data_tracking: {
        Args: {
          count_param: number
          notes_param?: string
          status_param?: string
          table_name_param: string
        }
        Returns: undefined
      }
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
