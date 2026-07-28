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
      articles: {
        Row: {
          author: string | null
          content: string | null
          cover: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          content?: string | null
          cover?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          content?: string | null
          cover?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          package_category: string | null
          package_id: string | null
          package_title: string | null
          passport_path: string | null
          people: number
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          package_category?: string | null
          package_id?: string | null
          package_title?: string | null
          passport_path?: string | null
          people?: number
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          package_category?: string | null
          package_id?: string | null
          package_title?: string | null
          passport_path?: string | null
          people?: number
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          city: string
          created_at: string
          email: string | null
          google_maps_url: string | null
          id: string
          image: string | null
          is_active: boolean
          is_main_branch: boolean
          latitude: number
          longitude: number
          name: string
          phone: string | null
          sort_order: number
          updated_at: string
          working_hours: string | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          email?: string | null
          google_maps_url?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          is_main_branch?: boolean
          latitude: number
          longitude: number
          name: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
          working_hours?: string | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          email?: string | null
          google_maps_url?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          is_main_branch?: boolean
          latitude?: number
          longitude?: number
          name?: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
          working_hours?: string | null
        }
        Relationships: []
      }
      contact_info: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          key: string
          label: string | null
          sort_order: number | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          key: string
          label?: string | null
          sort_order?: number | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          key?: string
          label?: string | null
          sort_order?: number | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          handled: boolean
          id: string
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          handled?: boolean
          id?: string
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          handled?: boolean
          id?: string
          message?: string
          name?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          active: boolean
          answer: string
          category: string | null
          created_at: string
          id: string
          question: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          question: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          question?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      features: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          id: string
          image: string
          sort_order: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          id?: string
          image: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          id?: string
          image?: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          airline: string | null
          brochure_pdf: string | null
          category: Database["public"]["Enums"]["package_category"]
          city: string | null
          country: string | null
          cover: string | null
          created_at: string
          currency: string
          departure_date: string | null
          description: string | null
          destination: string | null
          discount: number | null
          discount_price: number | null
          duration: string | null
          excluded: Json | null
          featured: boolean
          gallery: Json | null
          hotel: string | null
          hotel_rating: number | null
          id: string
          included: Json | null
          meeting_point: string | null
          price: number
          required_documents: Json | null
          return_date: string | null
          seats: number | null
          seo_description: string | null
          seo_keywords: Json | null
          seo_title: string | null
          short_description: string | null
          slug: string
          sort_order: number | null
          status: Database["public"]["Enums"]["package_status"]
          timeline: Json | null
          title: string
          total_seats: number | null
          transport: string | null
          updated_at: string
        }
        Insert: {
          airline?: string | null
          brochure_pdf?: string | null
          category: Database["public"]["Enums"]["package_category"]
          city?: string | null
          country?: string | null
          cover?: string | null
          created_at?: string
          currency?: string
          departure_date?: string | null
          description?: string | null
          destination?: string | null
          discount?: number | null
          discount_price?: number | null
          duration?: string | null
          excluded?: Json | null
          featured?: boolean
          gallery?: Json | null
          hotel?: string | null
          hotel_rating?: number | null
          id?: string
          included?: Json | null
          meeting_point?: string | null
          price?: number
          required_documents?: Json | null
          return_date?: string | null
          seats?: number | null
          seo_description?: string | null
          seo_keywords?: Json | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["package_status"]
          timeline?: Json | null
          title: string
          total_seats?: number | null
          transport?: string | null
          updated_at?: string
        }
        Update: {
          airline?: string | null
          brochure_pdf?: string | null
          category?: Database["public"]["Enums"]["package_category"]
          city?: string | null
          country?: string | null
          cover?: string | null
          created_at?: string
          currency?: string
          departure_date?: string | null
          description?: string | null
          destination?: string | null
          discount?: number | null
          discount_price?: number | null
          duration?: string | null
          excluded?: Json | null
          featured?: boolean
          gallery?: Json | null
          hotel?: string | null
          hotel_rating?: number | null
          id?: string
          included?: Json | null
          meeting_point?: string | null
          price?: number
          required_documents?: Json | null
          return_date?: string | null
          seats?: number | null
          seo_description?: string | null
          seo_keywords?: Json | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["package_status"]
          timeline?: Json | null
          title?: string
          total_seats?: number | null
          transport?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          cover: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          slug: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cover?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cover?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          body: string | null
          created_at: string
          cta_href: string | null
          cta_label: string | null
          data: Json | null
          id: string
          image: string | null
          key: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          data?: Json | null
          id?: string
          image?: string | null
          key: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          data?: Json | null
          id?: string
          image?: string | null
          key?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_stats: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          label: string
          sort_order: number | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          sort_order?: number | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          sort_order?: number | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          active: boolean
          avatar: string | null
          content: string
          created_at: string
          id: string
          name: string
          rating: number
          role: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar?: string | null
          content: string
          created_at?: string
          id?: string
          name: string
          rating?: number
          role?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar?: string | null
          content?: string
          created_at?: string
          id?: string
          name?: string
          rating?: number
          role?: string | null
          sort_order?: number | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "staff"
      package_category: "umrah" | "trip" | "flight" | "visa"
      package_status: "draft" | "published" | "archived" | "sold_out"
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
      app_role: ["super_admin", "admin", "staff"],
      package_category: ["umrah", "trip", "flight", "visa"],
      package_status: ["draft", "published", "archived", "sold_out"],
    },
  },
} as const
