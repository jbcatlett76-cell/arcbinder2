import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Chapter, Project, StoryEntry } from '../types';
import { createId } from '../lib/id';
import { loadProjects, saveProjects } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface NewProjectInput {
  title: string;
  subtitle?: string;
  author: string;
  genre: string;
  premise: string;
  targetWords: number;
}

interface AppContextValue {
  projects: Project[];
  dataLoading: boolean;
  createProject: (input: NewProjectInput) => Project;
  updateProject: (projectId: string, updater: (project: Project) => Project) => void;
  deleteProject: (projectId: string) => void;
  importProject: (project: Project) => void;
  replaceChapters: (projectId: string, chapters: Chapter[]) => void;
  addStoryEntries: (projectId: string, entries: StoryEntry[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function starterChapter(): Chapter {
  return {
    id: createId('chapter'),
    title: 'Chapter 1',
    summary: '',
    targetWords: 3000,
    scenes: [
      {
        id: createId('scene'),
        title: 'Scene 1',
        summary: '',
        pov: '',
        location: '',
        status: 'Planned',
        targetWords: 1200,
        beats: [],
        prose: '',
        notes: '',
      },
    ],
  };
}

function validProjectId(id: string | undefined): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return id;
  return crypto.randomUUID();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const [projects, setProjects] = useState<Project[]>(() => (isDemoMode ? loadProjects() : []));
  const [dataLoading, setDataLoading] = useState(false);
  const initializedUser = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProjects([]);
      initializedUser.current = null;
      return;
    }

    if (isDemoMode || !supabase) {
      setProjects(loadProjects());
      initializedUser.current = user.id;
      return;
    }

    if (initializedUser.current === user.id) return;
    initializedUser.current = user.id;
    setDataLoading(true);
    void supabase
      .from('projects')
      .select('project_data')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Could not load projects', error);
          setProjects([]);
        } else {
          setProjects((data ?? []).map((row) => row.project_data as Project).filter(Boolean));
        }
        setDataLoading(false);
      });
  }, [authLoading, isDemoMode, user]);

  useEffect(() => {
    if (isDemoMode && user) saveProjects(projects);
  }, [isDemoMode, projects, user]);

  const persistProject = useCallback((project: Project) => {
    if (isDemoMode || !supabase || !user) return;
    void supabase
      .from('projects')
      .upsert(
        {
          id: project.id,
          user_id: user.id,
          title: project.title,
          subtitle: project.subtitle,
          author: project.author,
          genre: project.genre,
          status: project.status,
          premise: project.premise,
          target_words: project.targetWords,
          project_data: project,
          created_at: project.createdAt,
          updated_at: project.updatedAt,
        },
        { onConflict: 'id' },
      )
      .then(({ error }) => error && console.error('Could not save project', error));
  }, [isDemoMode, user]);

  const value = useMemo<AppContextValue>(
    () => ({
      projects,
      dataLoading,
      createProject(input) {
        const now = new Date().toISOString();
        const project: Project = {
          id: crypto.randomUUID(),
          title: input.title.trim() || 'Untitled Project',
          subtitle: input.subtitle?.trim() || '',
          author: input.author.trim(),
          genre: input.genre.trim(),
          status: 'Planning',
          premise: input.premise.trim(),
          targetWords: input.targetWords || 80000,
          createdAt: now,
          updatedAt: now,
          chapters: [starterChapter()],
          storyBible: [],
        };
        setProjects((items) => [project, ...items]);
        persistProject(project);
        return project;
      },
      updateProject(projectId, updater) {
        setProjects((items) =>
          items.map((project) => {
            if (project.id !== projectId) return project;
            const next = { ...updater(project), updatedAt: new Date().toISOString() };
            persistProject(next);
            return next;
          }),
        );
      },
      deleteProject(projectId) {
        setProjects((items) => items.filter((project) => project.id !== projectId));
        if (!isDemoMode && supabase && user) {
          void supabase.from('projects').delete().eq('id', projectId).eq('user_id', user.id).then(({ error }) => error && console.error('Could not delete project', error));
        }
      },
      importProject(project) {
        const now = new Date().toISOString();
        const next = { ...project, id: validProjectId(project.id), createdAt: project.createdAt || now, updatedAt: now };
        setProjects((items) => [next, ...items]);
        persistProject(next);
      },
      replaceChapters(projectId, chapters) {
        setProjects((items) =>
          items.map((project) => {
            if (project.id !== projectId) return project;
            const next = { ...project, chapters, updatedAt: new Date().toISOString() };
            persistProject(next);
            return next;
          }),
        );
      },
      addStoryEntries(projectId, entries) {
        setProjects((items) =>
          items.map((project) => {
            if (project.id !== projectId) return project;
            const existing = new Set(project.storyBible.map((entry) => entry.name.toLowerCase()));
            const additions = entries
              .filter((entry) => entry.name && !existing.has(entry.name.toLowerCase()))
              .map((entry) => ({ ...entry, id: entry.id || createId('entry') }));
            const next = { ...project, storyBible: [...project.storyBible, ...additions], updatedAt: new Date().toISOString() };
            persistProject(next);
            return next;
          }),
        );
      },
    }),
    [dataLoading, isDemoMode, persistProject, projects, user],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider.');
  return context;
}
