export type PostStatus =
  | "pending"
  | "generating"
  | "generated"
  | "publishing"
  | "published"
  | "failed";

export interface TonePreset {
  id: string;
  name: string;
  example_text: string;
  is_default: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  image_paths: string[];
  image_urls: string[];
  tone_preset_id: string | null;
  caption: string | null;
  status: PostStatus;
  fb_post_id: string | null;
  error_message: string | null;
  uploader_label: string | null;
  created_at: string;
  published_at: string | null;
}

export interface Settings {
  id: number;
  fb_page_id: string | null;
  fb_page_access_token: string | null;
  auto_publish: boolean;
  upload_password_hash: string | null;
  admin_password_hash: string | null;
  updated_at: string;
}
