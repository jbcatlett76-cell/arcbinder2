export type ProjectStatus =
  | 'Idea'
  | 'Planning'
  | 'Outlining'
  | 'First draft'
  | 'Revision'
  | 'Editing'
  | 'Formatting'
  | 'Published'
  | 'Archived';

export type SceneStatus = 'Planned' | 'Drafting' | 'Drafted' | 'Revising' | 'Complete';

export interface Beat {
  id: string;
  text: string;
  completed: boolean;
}

export interface Scene {
  id: string;
  title: string;
  summary: string;
  pov: string;
  location: string;
  status: SceneStatus;
  targetWords: number;
  beats: Beat[];
  prose: string;
  notes: string;
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  targetWords: number;
  scenes: Scene[];
}

export type StoryEntryType =
  | 'Character'
  | 'Location'
  | 'Organization'
  | 'Object'
  | 'Lore'
  | 'Research'
  | 'Theme'
  | 'Custom';

export interface StoryEntry {
  id: string;
  type: StoryEntryType;
  name: string;
  summary: string;
  details: string;
  tags: string[];
}

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  genre: string;
  status: ProjectStatus;
  premise: string;
  targetWords: number;
  createdAt: string;
  updatedAt: string;
  chapters: Chapter[];
  storyBible: StoryEntry[];
}

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'xai' | 'openrouter' | 'custom';

export interface AISettings {
  provider: AIProvider;
  model: string;
  baseUrl: string;
  creativity: number;
  length: 'short' | 'medium' | 'long';
}

export interface UserIdentity {
  id: string;
  email: string;
  name: string;
}
