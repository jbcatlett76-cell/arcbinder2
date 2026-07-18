import type { Beat, Chapter, Scene } from '../types';
import { createId } from './id';

function newBeat(text: string): Beat {
  return { id: createId('beat'), text: text.trim(), completed: false };
}

function newScene(title = 'Scene 1'): Scene {
  return {
    id: createId('scene'),
    title,
    summary: '',
    pov: '',
    location: '',
    status: 'Planned',
    targetWords: 1200,
    beats: [],
    prose: '',
    notes: '',
  };
}

function newChapter(title = 'Chapter 1'): Chapter {
  return {
    id: createId('chapter'),
    title,
    summary: '',
    targetWords: 3000,
    scenes: [],
  };
}

export function parseOutline(rawText: string): Chapter[] {
  const text = rawText.replace(/\r/g, '').trim();
  if (!text) return [];

  const lines = text.split('\n').map((line) => line.trimEnd());
  const chapters: Chapter[] = [];
  let currentChapter: Chapter | null = null;
  let currentScene: Scene | null = null;
  let partLabel = '';

  const ensureChapter = () => {
    if (!currentChapter) {
      currentChapter = newChapter(`Chapter ${chapters.length + 1}`);
      chapters.push(currentChapter);
    }
    return currentChapter;
  };

  const ensureScene = () => {
    const chapter = ensureChapter();
    if (!currentScene) {
      currentScene = newScene(`Scene ${chapter.scenes.length + 1}`);
      chapter.scenes.push(currentScene);
    }
    return currentScene;
  };

  for (const sourceLine of lines) {
    const line = sourceLine.trim();
    if (!line) continue;

    const partMatch = line.match(/^(part|act|section)\s+([\divxlcdm]+)(?:\s*[:.-]\s*(.*))?$/i);
    if (partMatch) {
      partLabel = `${capitalize(partMatch[1])} ${partMatch[2]}${partMatch[3] ? `: ${partMatch[3]}` : ''}`;
      currentChapter = null;
      currentScene = null;
      continue;
    }

    const chapterMatch = line.match(/^(?:#{1,3}\s*)?(chapter|ch\.?|book)\s*([\divxlcdm]+)?\s*(?:[:.-]\s*)?(.*)$/i);
    if (chapterMatch && (chapterMatch[2] || chapterMatch[3])) {
      const number = chapterMatch[2] || String(chapters.length + 1);
      const titleTail = chapterMatch[3]?.trim();
      const base = `Chapter ${number}${titleTail ? `: ${titleTail}` : ''}`;
      currentChapter = newChapter(partLabel ? `${partLabel} · ${base}` : base);
      chapters.push(currentChapter);
      currentScene = null;
      continue;
    }

    const sceneMatch = line.match(/^(?:#{2,4}\s*)?(scene|beat sequence)\s*([\d]+)?\s*(?:[:.-]\s*)?(.*)$/i);
    if (sceneMatch) {
      const chapter = ensureChapter();
      const number = sceneMatch[2] || String(chapter.scenes.length + 1);
      const titleTail = sceneMatch[3]?.trim();
      currentScene = newScene(`Scene ${number}${titleTail ? `: ${titleTail}` : ''}`);
      chapter.scenes.push(currentScene);
      continue;
    }

    const bulletMatch = line.match(/^(?:[-*•]|\d+[.)]|[a-z][.)])\s+(.+)$/i);
    if (bulletMatch) {
      ensureScene().beats.push(newBeat(bulletMatch[1]));
      continue;
    }

    const labeledMatch = line.match(/^(pov|location|setting|summary|goal|conflict|outcome)\s*:\s*(.+)$/i);
    if (labeledMatch) {
      const key = labeledMatch[1].toLowerCase();
      const value = labeledMatch[2].trim();
      if (key === 'summary' && currentChapter && !currentScene) {
        currentChapter.summary = value;
        continue;
      }
      const scene = ensureScene();
      if (key === 'pov') scene.pov = value;
      else if (key === 'location' || key === 'setting') scene.location = value;
      else if (key === 'summary') scene.summary = value;
      else scene.beats.push(newBeat(`${capitalize(key)}: ${value}`));
      continue;
    }

    if (/^#{1,4}\s+/.test(line)) {
      const cleaned = line.replace(/^#{1,4}\s+/, '');
      const chapter = ensureChapter();
      currentScene = newScene(cleaned);
      chapter.scenes.push(currentScene);
      continue;
    }

    const scene = ensureScene();
    if (!scene.summary) scene.summary = line;
    else scene.beats.push(newBeat(line));
  }

  for (const chapter of chapters) {
    if (chapter.scenes.length === 0) chapter.scenes.push(newScene('Scene 1'));
    for (const scene of chapter.scenes) {
      if (scene.beats.length === 0 && scene.summary) scene.beats.push(newBeat(scene.summary));
    }
  }

  return chapters;
}

export function chaptersFromAIJson(input: unknown): Chapter[] {
  if (!input || typeof input !== 'object') throw new Error('The AI response did not contain a valid outline.');
  const value = input as { chapters?: unknown[] };
  if (!Array.isArray(value.chapters)) throw new Error('No chapters were found in the AI response.');

  return value.chapters.map((rawChapter, chapterIndex) => {
    const c = (rawChapter ?? {}) as Record<string, unknown>;
    const rawScenes = Array.isArray(c.scenes) ? c.scenes : [];
    return {
      id: createId('chapter'),
      title: String(c.title || `Chapter ${chapterIndex + 1}`),
      summary: String(c.summary || ''),
      targetWords: Number(c.targetWords || 3000),
      scenes: rawScenes.map((rawScene, sceneIndex) => {
        const s = (rawScene ?? {}) as Record<string, unknown>;
        const rawBeats = Array.isArray(s.beats) ? s.beats : [];
        return {
          id: createId('scene'),
          title: String(s.title || `Scene ${sceneIndex + 1}`),
          summary: String(s.summary || ''),
          pov: String(s.pov || ''),
          location: String(s.location || ''),
          status: 'Planned' as const,
          targetWords: Number(s.targetWords || 1200),
          beats: rawBeats.map((beat) => newBeat(String(beat))),
          prose: '',
          notes: '',
        };
      }),
    };
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
