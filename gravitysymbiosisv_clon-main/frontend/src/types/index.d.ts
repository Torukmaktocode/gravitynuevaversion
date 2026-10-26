export interface UserProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  role: "user" | "admin" | "super_admin";
  avatar_url?: string;
}

export interface DailyMetric {
  id?: string;
  user_id: string;
  day: string;
  training_minutes: number;
  closer_count: number;
  quiz_answers: number;
  sessions: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

export interface KnowledgeModule {
  id: string;
  name: string;
  author: string;
  module_key: string;
}

export interface KnowledgeProgress {
  user_id: string;
  module_key: string;
  progress_percent: number;
}

export interface Suggestion {
  text: string;
  timestamp: string;
}

export interface PulseMeasurement {
  date: string;
  bpm: number;
}

export interface AppState {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}
