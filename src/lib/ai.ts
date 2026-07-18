import type { AISettings, Chapter, Project, Scene, StoryEntry } from '../types';

interface AIRequest {
  settings: AISettings;
  apiKey: string;
  system: string;
  prompt: string;
  jsonMode?: boolean;
}

async function requestAI(payload: AIRequest): Promise<string> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!response.ok) throw new Error(data.error || 'The AI request failed.');
  if (!data.text) throw new Error('The AI provider returned no text.');
  return data.text;
}

export async function generateSceneProse(args: {
  project: Project;
  chapter: Chapter;
  scene: Scene;
  settings: AISettings;
  apiKey: string;
  extraInstructions: string;
}): Promise<string> {
  const { project, chapter, scene, settings, apiKey, extraInstructions } = args;
  const relevantBible = project.storyBible
    .filter((entry) => {
      const haystack = `${scene.summary} ${scene.beats.map((b) => b.text).join(' ')}`.toLowerCase();
      return haystack.includes(entry.name.toLowerCase());
    })
    .slice(0, 12);

  const system = [
    'You are ArcBinder, a professional fiction-writing collaborator.',
    'Write polished original prose while following the author\'s outline exactly.',
    'Do not include commentary, headings, analysis, or notes unless requested.',
    'Maintain viewpoint, tense, continuity, characterization, and setting details.',
  ].join(' ');

  const prompt = `PROJECT\nTitle: ${project.title}\nGenre: ${project.genre}\nPremise: ${project.premise}\n\nCHAPTER\n${chapter.title}\n${chapter.summary}\n\nSCENE\nTitle: ${scene.title}\nPOV: ${scene.pov || 'Use the project default'}\nLocation: ${scene.location || 'Not specified'}\nSummary: ${scene.summary}\nTarget length: approximately ${scene.targetWords} words\n\nBEATS\n${scene.beats.map((beat, index) => `${index + 1}. ${beat.text}`).join('\n')}\n\nRELEVANT STORY BIBLE\n${formatBible(relevantBible)}\n\nAUTHOR INSTRUCTIONS\n${extraInstructions || 'Write immersive, natural prose with strong scene momentum.'}`;

  return requestAI({ settings, apiKey, system, prompt });
}

export async function structureOutlineWithAI(args: {
  text: string;
  settings: AISettings;
  apiKey: string;
}): Promise<unknown> {
  const system = 'You convert book outlines into strict JSON. Return JSON only, with no markdown fences.';
  const prompt = `Analyze the outline below and return this exact shape:\n{"chapters":[{"title":"Chapter 1: Title","summary":"...","targetWords":3000,"scenes":[{"title":"Scene 1: Title","summary":"...","pov":"","location":"","targetWords":1200,"beats":["beat one","beat two"]}]}]}\n\nPreserve the author's intent and wording. Infer divisions only when useful.\n\nOUTLINE:\n${args.text}`;
  const text = await requestAI({ ...args, system, prompt, jsonMode: true });
  return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

export async function extractBibleWithAI(args: {
  project: Project;
  settings: AISettings;
  apiKey: string;
}): Promise<StoryEntry[]> {
  const outline = args.project.chapters
    .map((chapter) => `${chapter.title}\n${chapter.summary}\n${chapter.scenes.map((scene) => `${scene.title}: ${scene.summary}\n${scene.beats.map((b) => `- ${b.text}`).join('\n')}`).join('\n')}`)
    .join('\n\n');
  const system = 'You extract story-bible records from outlines. Return JSON only, with no markdown fences.';
  const prompt = `Return an array of important entities in this exact shape:\n[{"type":"Character|Location|Organization|Object|Lore|Research|Theme|Custom","name":"","summary":"","details":"","tags":[]}]\nDo not invent facts. Merge duplicates.\n\n${outline}`;
  const text = await requestAI({ settings: args.settings, apiKey: args.apiKey, system, prompt, jsonMode: true });
  return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()) as StoryEntry[];
}

function formatBible(entries: StoryEntry[]): string {
  if (!entries.length) return 'No directly matched entries.';
  return entries.map((entry) => `${entry.type}: ${entry.name}\n${entry.summary}\n${entry.details}`).join('\n\n');
}
