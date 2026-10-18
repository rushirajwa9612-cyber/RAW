export type Plan = 'free' | 'starter' | 'pro' | 'ultimate';

export type GenerationType = 'image' | 'video' | 'edit';

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  plan: Plan;
  credits_balance: number;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  type: GenerationType;
  prompt: string;
  negative_prompt: string | null;
  model: string | null;
  aspect_ratio: string;
  resolution: string | null;
  style_preset: string | null;
  num_images: number;
  status: GenerationStatus;
  result_url: string | null;
  result_urls: string[] | null;
  thumbnail_url: string | null;
  error_message: string | null;
  provider_job_id: string | null;
  metadata: Record<string, unknown>;
  credits_used: number;
  is_favorite: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  generation_id: string | null;
  user_id: string;
  created_at: string;
}

export interface CreditsLedgerEntry {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
  negative_prompt: string | null;
  type: GenerationType;
  model: string | null;
  aspect_ratio: string;
  style_preset: string | null;
  preview_url: string | null;
  settings: Record<string, unknown>;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
}
