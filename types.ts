export enum View {
  DASHBOARD = 'DASHBOARD',
  PREP = 'PREP',
  NOTEBOOK = 'NOTEBOOK',
  FLASHCARDS = 'FLASHCARDS', // Kept for future use
  RAPID_FIRE = 'RAPID_FIRE',
}

export interface Term {
  id: string;
  english: string;
  chinese: string;
  definition: string;
  tags?: string[]; // e.g., topic name
  masteryLevel?: number; // 0 (New) to 5 (Mastered)
  lastReviewed?: number;
}

export interface PrepResult {
  topic: string;
  summary: string[]; // Bullet points
  terms: Term[];
}

export interface Session {
  id: string;
  topic: string;
  summary: string[];
  terms: Term[];
  notes: string; // User's content capture
  createdAt: number;
  lastModified: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface FlashcardConfig {
  source: 'all' | 'topic';
  topicFilter?: string;
}

export interface RapidFireConfig {
  interval: number; // seconds
  terms: Term[];
}