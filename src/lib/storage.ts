import type { Project } from '../types';

const PROJECTS_KEY = 'arcbinder.projects.v2';
const USER_KEY = 'arcbinder.demo-user.v1';

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function loadDemoUser(): { email: string; name: string } | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDemoUser(user: { email: string; name: string }): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearDemoUser(): void {
  localStorage.removeItem(USER_KEY);
}
