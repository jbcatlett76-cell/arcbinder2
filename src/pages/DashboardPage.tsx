import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, BookOpen, FilePlus2, LogOut, Plus, Search, Trash2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Modal } from '../components/Modal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { projectWordCount } from '../lib/wordStats';

export function DashboardPage() {
  const { projects, createProject, deleteProject, importProject } = useApp();
  const { user, signOut, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'active' | 'archived'>('active');
  const importInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({ title: '', author: user?.name || '', genre: 'Fiction', premise: '', targetWords: 80000 });
  const filtered = useMemo(() => projects.filter((project) => (view === 'archived' ? project.status === 'Archived' : project.status !== 'Archived') && `${project.title} ${project.author} ${project.genre}`.toLowerCase().includes(search.toLowerCase())), [projects, search, view]);
  const totalWords = projects.reduce((sum, project) => sum + projectWordCount(project), 0);

  const handleImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || !parsed.title || !Array.isArray(parsed.chapters)) throw new Error('Not an ArcBinder backup');
      importProject(parsed);
    } catch {
      alert('That file is not a valid ArcBinder JSON backup.');
    } finally {
      if (importInput.current) importInput.current.value = '';
    }
  };

  const submit = () => {
    const project = createProject(draft);
    setCreating(false);
    navigate(`/app/project/${project.id}`);
  };

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <Logo />
        <nav><button className={view === 'active' ? 'active' : ''} onClick={() => setView('active')}><BookOpen size={18} /> Projects</button><button className={view === 'archived' ? 'active' : ''} onClick={() => setView('archived')}><Archive size={18} /> Archived</button></nav>
        <div className="sidebar-bottom"><div className="user-chip"><span>{user?.name?.slice(0, 1).toUpperCase()}</span><div><strong>{user?.name}</strong><small>{isDemoMode ? 'Local workspace' : user?.email}</small></div></div><button className="icon-button" title="Sign out" onClick={() => void signOut()}><LogOut size={18} /></button></div>
      </aside>
      <section className="dashboard-main">
        <header className="dashboard-header">
          <div><p className="eyebrow">Author workspace</p><h1>{view === 'archived' ? 'Archived books' : 'Your books'}</h1><p className="muted">{projects.length} projects · {totalWords.toLocaleString()} manuscript words</p></div>
          <button className="button button-primary" onClick={() => setCreating(true)}><Plus size={18} /> New project</button>
        </header>
        <div className="dashboard-toolbar"><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" /></div><button className="button button-secondary" onClick={() => importInput.current?.click()}><FilePlus2 size={17} /> Import backup</button><input ref={importInput} type="file" accept=".json,application/json" hidden onChange={(event) => event.target.files?.[0] && void handleImport(event.target.files[0])} /></div>
        {filtered.length === 0 ? (
          <div className="empty-state"><BookOpen size={44} /><h2>{projects.length ? 'No matching projects' : 'Begin your first book'}</h2><p>{projects.length ? 'Try a different title, author, or genre.' : 'Create a project, import your outline, and ArcBinder will turn it into a working manuscript structure.'}</p><button className="button button-primary" onClick={() => setCreating(true)}><Plus size={18} /> Create project</button></div>
        ) : (
          <div className="project-grid">
            {filtered.map((project) => {
              const words = projectWordCount(project);
              const progress = Math.min(100, Math.round((words / Math.max(1, project.targetWords)) * 100));
              return (
                <article className="project-card" key={project.id}>
                  <Link to={`/app/project/${project.id}`} className="project-card-link">
                    <div className="project-cover"><span>{project.genre}</span><strong>{project.title}</strong><small>{project.author}</small></div>
                    <div className="project-card-body"><div><span className="status-pill">{project.status}</span><h3>{project.title}</h3><p>{project.premise || 'No premise added yet.'}</p></div><div className="progress-row"><div><span style={{ width: `${progress}%` }} /></div><small>{words.toLocaleString()} / {project.targetWords.toLocaleString()}</small></div></div>
                  </Link>
                  <div className="project-card-menu"><button className="icon-button danger" title="Delete project" onClick={() => confirm(`Delete ${project.title}?`) && deleteProject(project.id)}><Trash2 size={17} /></button></div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {creating && (
        <Modal title="Create a new project" onClose={() => setCreating(false)}>
          <label className="field-label">Book title</label><input className="field" autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Untitled novel" />
          <div className="form-grid two-col"><div><label className="field-label">Author or pen name</label><input className="field" value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} /></div><div><label className="field-label">Genre</label><input className="field" value={draft.genre} onChange={(event) => setDraft({ ...draft, genre: event.target.value })} /></div></div>
          <label className="field-label">Premise</label><textarea className="field textarea" value={draft.premise} onChange={(event) => setDraft({ ...draft, premise: event.target.value })} placeholder="What is this book about?" />
          <label className="field-label">Target word count</label><input className="field" type="number" min="1000" step="5000" value={draft.targetWords} onChange={(event) => setDraft({ ...draft, targetWords: Number(event.target.value) })} />
          <div className="modal-actions"><button className="button button-ghost" onClick={() => setCreating(false)}>Cancel</button><button className="button button-primary" disabled={!draft.title.trim()} onClick={submit}>Create project</button></div>
        </Modal>
      )}
    </main>
  );
}
