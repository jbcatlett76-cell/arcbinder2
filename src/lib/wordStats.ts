import type { Project } from '../types';

export function countWords(text: string): number {
  const clean = text.trim();
  return clean ? clean.split(/\s+/).length : 0;
}

export function projectWordCount(project: Project): number {
  return project.chapters.reduce(
    (total, chapter) => total + chapter.scenes.reduce((sum, scene) => sum + countWords(scene.prose), 0),
    0,
  );
}

export function chapterWordCount(project: Project, chapterId: string): number {
  const chapter = project.chapters.find((item) => item.id === chapterId);
  return chapter ? chapter.scenes.reduce((sum, scene) => sum + countWords(scene.prose), 0) : 0;
}

export function repeatedPhrases(project: Project): Array<{ phrase: string; count: number }> {
  const prose = project.chapters.flatMap((c) => c.scenes.map((s) => s.prose)).join(' ').toLowerCase();
  const words = prose.match(/[a-z']+/g) ?? [];
  const counts = new Map<string, number>();
  for (let i = 0; i < words.length - 2; i += 1) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase, count]) => ({ phrase, count }));
}
