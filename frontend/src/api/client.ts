import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

export interface Story {
  id: string;
  title: string;
  genre: string;
  total_chapters: number;
  created_at: string;
}

export interface Character {
  id: string;
  story_id: string;
  name: string;
  aliases: string[];
  age: string;
  gender: string;
  physical_traits: Record<string, any>;
  personality: string[];
  goals: string[];
  backstory: string;
  first_appearance: string;
  chapters_appeared: string[];
  status: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  significance: string;
  first_mentioned: string;
}

export interface StoryEvent {
  id: string;
  name: string;
  description: string;
  chapter: string;
  characters_involved: string[];
  location: string;
  event_type: string;
}

export interface Relationship {
  id: string;
  entity_a: string;
  entity_b: string;
  relationship_type: string;
  description: string;
  established_in_chapter: string;
}

export interface UniverseRule {
  id: string;
  story_id: string;
  rule: string;
  source_chapter: string;
}

export interface CreativeInsight {
  title: string;
  description: string;
  evidence: string[];
}

export interface CharacterArc {
  character: string;
  status: string;
  chapters: string[];
  emotional_state: string;
  motivation: string;
  growth_opportunity: string;
}

export interface StyleProfile {
  voice_summary: string;
  tone_markers: string[];
  pacing: string;
  dialogue_style: string;
  keep_consistent: string[];
}

export interface CreativeGuidance {
  character_arcs: CharacterArc[];
  style_profile: StyleProfile;
  scene_suggestions: CreativeInsight[];
  foreshadowing: CreativeInsight[];
  universe_rules: UniverseRule[];
}

export interface ContinuityError {
  id: string;
  chapter: string;
  error_type: string;
  description: string;
  conflicting_fact: string;
  original_fact: string;
  severity: 'high' | 'medium' | 'low';
  resolved: boolean;
}

export interface GraphData {
  nodes: { id: string; label: string; node_type: string; data: Record<string, any> }[];
  edges: { source: string; target: string; label: string }[];
}

export interface StorySummary {
  id: string;
  title: string;
  genre: string;
  total_chapters: number;
  characters: number;
  locations: number;
  events: number;
  relationships: number;
  universe_rules?: number;
}

// ── Stories ───────────────────────────────────────────────────
export const createStory = (title: string, genre: string) =>
  api.post<Story>('/api/upload/story', { title, genre });

export const getStories = () =>
  api.get<Story[]>('/api/upload/stories');

// ── Upload ────────────────────────────────────────────────────
export const uploadChapter = (formData: FormData) =>
  api.post('/api/upload/chapter', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ── Bible ─────────────────────────────────────────────────────
export const getCharacters = (storyId: string) =>
  api.get<Character[]>(`/api/bible/${storyId}/characters`);

export const getLocations = (storyId: string) =>
  api.get<Location[]>(`/api/bible/${storyId}/locations`);

export const getEvents = (storyId: string) =>
  api.get<StoryEvent[]>(`/api/bible/${storyId}/events`);

export const getRelationships = (storyId: string) =>
  api.get<Relationship[]>(`/api/bible/${storyId}/relationships`);

export const getUniverseRules = (storyId: string) =>
  api.get<UniverseRule[]>(`/api/bible/${storyId}/rules`);

export const getChapters = (storyId: string) =>
  api.get(`/api/bible/${storyId}/chapters`);

export const getStorySummary = (storyId: string) =>
  api.get<StorySummary>(`/api/bible/${storyId}/summary`);

// ── Graph ─────────────────────────────────────────────────────
export const getGraph = (storyId: string) =>
  api.get<GraphData>(`/api/graph/${storyId}`);

export const getGraphStats = (storyId: string) =>
  api.get(`/api/graph/${storyId}/stats`);

// ── Continuity ────────────────────────────────────────────────
export const checkContinuity = (data: {
  story_id: string;
  chapter_number: number;
  chapter_title: string;
  content: string;
}) => api.post('/api/continuity/check', data);

export const getContinuityErrors = (storyId: string) =>
  api.get<ContinuityError[]>(`/api/continuity/${storyId}/errors`);

export const resolveError = (errorId: string) =>
  api.patch(`/api/continuity/errors/${errorId}/resolve`);

// Creative guidance
export const getCreativeGuidance = (storyId: string) =>
  api.get<CreativeGuidance>(`/api/creative/${storyId}/guidance`);

export const getSceneSuggestions = (data: {
  story_id: string;
  draft_context: string;
  goal: string;
}) => api.post<CreativeInsight[]>('/api/creative/scene-suggestions', data);

// ── Chat ──────────────────────────────────────────────────────
export const sendChatMessage = (data: {
  story_id: string;
  message: string;
  history: { user: string; assistant: string }[];
}) => api.post('/api/chat', data);

export default api;
