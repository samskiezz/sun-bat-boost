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
      compat: {
        Row: {
          battery_id: string
          created_at: string
          details: Json | null
          id: string
          inverter_id: string
          ok: boolean
          rule_code: string
        }
        Insert: {
          battery_id: string
          created_at?: string
          details?: Json | null
          id?: string
          inverter_id: string
          ok: boolean
          rule_code: string
        }
        Update: {
          battery_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          inverter_id?: string
          ok?: boolean
          rule_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "compat_battery_id_fkey"
            columns: ["battery_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compat_inverter_id_fkey"
            columns: ["inverter_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      manufacturers: {
        Row: {
          aliases: string[] | null
          created_at: string
          id: string
          name: string
          updated_at: string
          urls: string[] | null
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          urls?: string[] | null
        }
        Update: {
          aliases?: string[] | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          urls?: string[] | null
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
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"] | null
          cec_ref: string | null
          created_at: string
          datasheet_url: string | null
          id: string
          manufacturer_id: string | null
          model: string
          pdf_hash: string | null
          pdf_path: string | null
          product_url: string | null
          raw: Json | null
          series: string | null
          sku: string | null
          source: string | null
          specs: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"] | null
          cec_ref?: string | null
          created_at?: string
          datasheet_url?: string | null
          id?: string
          manufacturer_id?: string | null
          model: string
          pdf_hash?: string | null
          pdf_path?: string | null
          product_url?: string | null
          raw?: Json | null
          series?: string | null
          sku?: string | null
          source?: string | null
          specs?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"] | null
          cec_ref?: string | null
          created_at?: string
          datasheet_url?: string | null
          id?: string
          manufacturer_id?: string | null
          model?: string
          pdf_hash?: string | null
          pdf_path?: string | null
          product_url?: string | null
          raw?: Json | null
          series?: string | null
          sku?: string | null
          source?: string | null
          specs?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_guidelines: {
        Row: {
          content_hash: string | null
          created_at: string
          extracted_at: string
          guidelines: Json
          id: string
          source: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          extracted_at?: string
          guidelines?: Json
          id?: string
          source: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          extracted_at?: string
          guidelines?: Json
          id?: string
          source?: string
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
      readiness_gates: {
        Row: {
          created_at: string
          current_value: number | null
          details: Json | null
          gate_name: string
          id: string
          last_checked: string | null
          passing: boolean | null
          required_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          details?: Json | null
          gate_name: string
          id?: string
          last_checked?: string | null
          passing?: boolean | null
          required_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          details?: Json | null
          gate_name?: string
          id?: string
          last_checked?: string | null
          passing?: boolean | null
          required_value?: number
          updated_at?: string
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
      scrape_job_progress: {
        Row: {
          category: string
          job_id: string
          last_specs_trigger: number | null
          pdf_done: number
          processed: number
          specs_done: number
          state: string
          target: number
        }
        Insert: {
          category: string
          job_id: string
          last_specs_trigger?: number | null
          pdf_done?: number
          processed?: number
          specs_done?: number
          state?: string
          target: number
        }
        Update: {
          category?: string
          job_id?: string
          last_specs_trigger?: number | null
          pdf_done?: number
          processed?: number
          specs_done?: number
          state?: string
          target?: number
        }
        Relationships: [
          {
            foreignKeyName: "scrape_job_progress_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_jobs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      scrape_progress: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          id: string
          last_cursor: string | null
          status: string | null
          total_found: number | null
          total_parsed: number | null
          total_processed: number | null
          total_with_pdfs: number | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string
          id?: string
          last_cursor?: string | null
          status?: string | null
          total_found?: number | null
          total_parsed?: number | null
          total_processed?: number | null
          total_with_pdfs?: number | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          id?: string
          last_cursor?: string | null
          status?: string | null
          total_found?: number | null
          total_parsed?: number | null
          total_processed?: number | null
          total_with_pdfs?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      specs: {
        Row: {
          created_at: string
          doc_span_id: string | null
          id: string
          key: string
          product_id: string
          source: string | null
          unit: string | null
          value: string
        }
        Insert: {
          created_at?: string
          doc_span_id?: string | null
          id?: string
          key: string
          product_id: string
          source?: string | null
          unit?: string | null
          value: string
        }
        Update: {
          created_at?: string
          doc_span_id?: string | null
          id?: string
          key?: string
          product_id?: string
          source?: string | null
          unit?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      training_standards: {
        Row: {
          created_at: string
          id: string
          standard_type: string
          standards: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          standard_type: string
          standards?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          standard_type?: string
          standards?: Json
          updated_at?: string
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
      check_readiness_gates: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_product_counts_by_category: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_count: number
          category: string
          total_count: number
          with_datasheet_count: number
          with_pdf_count: number
        }[]
      }
      get_products_needing_specs: {
        Args: { categories?: string[]; min_specs?: number }
        Returns: {
          brand: string
          category: string
          model: string
          product_id: string
          spec_count: number
        }[]
      }
      get_spec_counts_by_category: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          products_with_6plus_specs: number
          products_with_any_specs: number
          total_products: number
        }[]
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
      product_category:
        | "PANEL"
        | "INVERTER"
        | "BATTERY_MODULE"
        | "BATTERY_STACK"
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
      product_category: [
        "PANEL",
        "INVERTER",
        "BATTERY_MODULE",
        "BATTERY_STACK",
      ],
    },
  },
} as const
