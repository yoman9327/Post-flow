export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      posts: {
        Row: {
          caption: string | null;
          created_at: string;
          error_message: string | null;
          fb_post_id: string | null;
          id: string;
          image_paths: string[];
          image_urls: string[];
          published_at: string | null;
          status: string;
          tone_preset_id: string | null;
          uploader_label: string | null;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          error_message?: string | null;
          fb_post_id?: string | null;
          id?: string;
          image_paths?: string[];
          image_urls?: string[];
          published_at?: string | null;
          status?: string;
          tone_preset_id?: string | null;
          uploader_label?: string | null;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          error_message?: string | null;
          fb_post_id?: string | null;
          id?: string;
          image_paths?: string[];
          image_urls?: string[];
          published_at?: string | null;
          status?: string;
          tone_preset_id?: string | null;
          uploader_label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "posts_tone_preset_id_fkey";
            columns: ["tone_preset_id"];
            isOneToOne: false;
            referencedRelation: "tone_presets";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          admin_password_hash: string | null;
          auto_publish: boolean;
          fb_page_access_token: string | null;
          fb_page_id: string | null;
          id: number;
          updated_at: string;
          upload_password_hash: string | null;
        };
        Insert: {
          admin_password_hash?: string | null;
          auto_publish?: boolean;
          fb_page_access_token?: string | null;
          fb_page_id?: string | null;
          id?: number;
          updated_at?: string;
          upload_password_hash?: string | null;
        };
        Update: {
          admin_password_hash?: string | null;
          auto_publish?: boolean;
          fb_page_access_token?: string | null;
          fb_page_id?: string | null;
          id?: number;
          updated_at?: string;
          upload_password_hash?: string | null;
        };
        Relationships: [];
      };
      tone_presets: {
        Row: {
          created_at: string;
          example_text: string;
          id: string;
          is_default: boolean;
          name: string;
          restrictions: string | null;
        };
        Insert: {
          created_at?: string;
          example_text: string;
          id?: string;
          is_default?: boolean;
          name: string;
          restrictions?: string | null;
        };
        Update: {
          created_at?: string;
          example_text?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          restrictions?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
