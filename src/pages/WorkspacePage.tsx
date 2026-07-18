import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  BookOpenText,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Download,
  FileInput,
  FileText,
  KeyRound,
  LibraryBig,
  ListTree,
  MapPin,
  PanelRightClose,
  Plus,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react';
import type { AISettings, Chapter, Project, Scene, StoryEntry, StoryEntryType } from '../types';
import { Logo } from '../components/Logo';
import { Modal } from '../components/Modal';
import { AIConnectionModal } from '../components/AIConnectionModal';
import { OutlineImportModal } from '../components/OutlineImportModal';
import { useApp } from '../context/AppContext';
import { createId } from '../lib/id';
import { downloadDocx, downloadText, printManuscript } from '../lib/exporters';
import { extractBibleWithAI, generateSceneProse } from '../lib/ai';
import { chapterWordCount, countWords, projectWordCount, repeatedPhrases } from '../lib/wordStats';

const defaultAISettings: AISettings = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  baseUrl: 'https://api.openai.com/v1',
  creativity: 0.7,
  length: 'medium',
};

type WorkspaceMode = 'plan' | 'write' | 'bible' | 'review' | 'publish';

export function WorkspacePage() {
  const { projectId } = useParams();
  const { projects, updateProject, replaceChapters, addStoryEntries } = useApp();
  const project = projects.find((item) => item.id === projectId);
  const [mode, setMode] = useState<WorkspaceMode>('plan');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedSceneId, setSelectedSceneId] = useState('');
  const [importing, setImporting] = useState(false);
  const [structureQuery, setStructureQuery] = useState('');
  const [connectingAI, setConnectingAI] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [aiSettings, setAISettings] = useState<AISettings>(() => {
    try {
      const raw = localStorage.getItem('arcbinder.ai-settings.v1');
      return raw ? { ...defaultAISettings, ...JSON.parse(raw) } : defaultAISettings;
    } catch {
      return defaultAISettings;
    }
  });
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('arcbinder.ai-key') || '');
  const [aiInstructions, setAIInstructions] = useState('Write immersive, natural prose. Follow every beat while avoiding rushed summary.');
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [generationError, setGenerationError] = useState('');
  const [addingBibleEntry, setAddingBibleEntry] = useState(false);
  const [extractingBible, setExtractingBible] = useState(false);

  useEffect(() => {
    if (!project) return;
    const firstChapter = project.chapters[0];
    if (!selectedChapterId || !project.chapters.some((chapter) => chapter.id === selectedChapterId)) {
      setSelectedChapterId(firstChapter?.id || '');
      setSelectedSceneId(firstChapter?.scenes[0]?.id || '');
    }
  }, [project, selectedChapterId]);

  if (!project) return <Navigate to="/app" replace />;

  const selectedChapter = project.chapters.find((chapter) => chapter.id === selectedChapterId) || project.chapters[0];
  const selectedScene = selectedChapter?.scenes.find((scene) => scene.id === selectedSceneId) || selectedChapter?.scenes[0];

  const selectScene = (chapterId: string, sceneId: string) => {
    setSelectedChapterId(chapterId);
    setSelectedSceneId(sceneId);
    setMode('write');
  };

  const updateCurrentProject = (updater: (value: Project) => Project) => updateProject(project.id, updater);

  const updateChapter = (chapterId: string, patch: Partial<Chapter>) => {
    updateCurrentProject((value) => ({ ...value, chapters: value.chapters.map((chapter) => chapter.id === chapterId ? { ...chapter, ...patch } : chapter) }));
  };

  const updateScene = (chapterId: string, sceneId: string, patch: Partial<Scene>) => {
    updateCurrentProject((value) => ({
      ...value,
      chapters: value.chapters.map((chapter) => chapter.id === chapterId
        ? { ...chapter, scenes: chapter.scenes.map((scene) => scene.id === sceneId ? { ...scene, ...patch } : scene) }
        : chapter),
    }));
  };

  const addChapter = () => {
    const chapterId = createId('chapter');
    const sceneId = createId('scene');
    updateCurrentProject((value) => ({
      ...value,
      chapters: [...value.chapters, {
        id: chapterId,
        title: `Chapter ${value.chapters.length + 1}`,
        summary: '',
        targetWords: 3000,
        scenes: [{ id: sceneId, title: 'Scene 1', summary: '', pov: '', location: '', status: 'Planned', targetWords: 1200, beats: [], prose: '', notes: '' }],
      }],
    }));
    setSelectedChapterId(chapterId);
    setSelectedSceneId(sceneId);
  };

  const addScene = (chapterId: string) => {
    const chapter = project.chapters.find((item) => item.id === chapterId);
    if (!chapter) return;
    const sceneId = createId('scene');
    updateChapter(chapterId, {
      scenes: [...chapter.scenes, { id: sceneId, title: `Scene ${chapter.scenes.length + 1}`, summary: '', pov: '', location: '', status: 'Planned', targetWords: 1200, beats: [], prose: '', notes: '' }],
    });
    setSelectedChapterId(chapterId);
    setSelectedSceneId(sceneId);
  };

  const removeScene = (chapterId: string, sceneId: string) => {
    const chapter = project.chapters.find((item) => item.id === chapterId);
    if (!chapter || chapter.scenes.length <= 1) return;
    const nextScenes = chapter.scenes.filter((scene) => scene.id !== sceneId);
    updateChapter(chapterId, { scenes: nextScenes });
    setSelectedSceneId(nextScenes[0].id);
  };

  const saveAIConnection = (settings: AISettings, key: string) => {
    setAISettings(settings);
    setApiKey(key);
    localStorage.setItem('arcbinder.ai-settings.v1', JSON.stringify(settings));
    sessionStorage.setItem('arcbinder.ai-key', key);
    setConnectingAI(false);
  };

  const generate = async () => {
    if (!selectedChapter || !selectedScene) return;
    if (!apiKey) {
      setConnectingAI(true);
      return;
    }
    setGenerating(true);
    setGenerationError('');
    setGeneratedText('');
    try {
      const result = await generateSceneProse({ project, chapter: selectedChapter, scene: selectedScene, settings: aiSettings, apiKey, extraInstructions: aiInstructions });
      setGeneratedText(result);
    } catch (cause) {
      setGenerationError(cause instanceof Error ? cause.message : 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const extractBible = async () => {
    if (!apiKey) {
      setConnectingAI(true);
      return;
    }
    setExtractingBible(true);
    try {
      const entries = await extractBibleWithAI({ project, settings: aiSettings, apiKey });
      addStoryEntries(project.id, entries.map((entry) => ({ ...entry, id: createId('entry') })));
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'Story-bible extraction failed.');
    } finally {
      setExtractingBible(false);
    }
  };

  const modes: Array<{ id: WorkspaceMode; label: string; icon: typeof ListTree }> = [
    { id: 'plan', label: 'Plan', icon: ListTree },
    { id: 'write', label: 'Write', icon: BookOpenText },
    { id: 'bible', label: 'Story Bible', icon: LibraryBig },
    { id: 'review', label: 'Review', icon: BarChart3 },
    { id: 'publish', label: 'Publish', icon: Download },
  ];

  return (
    <main className="workspace-page">
      <aside className="workspace-rail">
        <Link to="/app" className="rail-logo"><Logo compact /></Link>
        <nav>{modes.map(({ id, label, icon: Icon }) => <button key={id} className={mode === id ? 'active' : ''} onClick={() => setMode(id)} title={label}><Icon size={20} /><span>{label}</span></button>)}</nav>
        <button className="rail-bottom" onClick={() => setConnectingAI(true)} title="AI connection"><Bot size={20} /><span>AI</span><i className={apiKey ? 'online' : ''} /></button>
      </aside>

      <aside className="structure-sidebar">
        <header><Link to="/app" className="icon-button"><ArrowLeft size={18} /></Link><div><small>{project.genre || 'Project'}</small><strong>{project.title}</strong></div><span /></header>
        <div className="structure-actions"><button onClick={() => setImporting(true)}><FileInput size={16} /> Import outline</button><button onClick={addChapter}><Plus size={16} /> Chapter</button></div>
        <div className="structure-search"><Search size={15} /><input value={structureQuery} onChange={(event) => setStructureQuery(event.target.value)} placeholder="Search structure" /></div>
        <div className="chapter-tree">
          {project.chapters.filter((chapter) => !structureQuery.trim() || `${chapter.title} ${chapter.scenes.map((scene) => scene.title).join(' ')}`.toLowerCase().includes(structureQuery.toLowerCase())).map((chapter) => (
            <ChapterTreeItem key={chapter.id} chapter={chapter} selectedSceneId={selectedScene?.id || ''} onSelectScene={(sceneId) => selectScene(chapter.id, sceneId)} onAddScene={() => addScene(chapter.id)} />
          ))}
        </div>
        <div className="sidebar-wordcount"><div><span>{projectWordCount(project).toLocaleString()}</span><small>of {project.targetWords.toLocaleString()} words</small></div><div className="mini-progress"><span style={{ width: `${Math.min(100, (projectWordCount(project) / Math.max(1, project.targetWords)) * 100)}%` }} /></div></div>
      </aside>

      <section className={`workspace-main ${mode === 'write' && showInspector ? 'with-inspector' : ''}`}>
        <header className="workspace-topbar">
          <div><span className="save-indicator"><Save size={14} /> Saved automatically</span></div>
          <div className="topbar-actions"><button className="button button-secondary compact" onClick={() => setConnectingAI(true)}><KeyRound size={15} /> {apiKey ? aiSettings.model : 'Connect AI'}</button>{mode === 'write' && <button className="icon-button" title="Toggle scene inspector" onClick={() => setShowInspector(!showInspector)}><PanelRightClose size={18} /></button>}</div>
        </header>

        {mode === 'plan' && <PlanView project={project} onImport={() => setImporting(true)} onSelectScene={selectScene} onUpdateProject={updateCurrentProject} onUpdateChapter={updateChapter} />}
        {mode === 'write' && selectedChapter && selectedScene && <WriteView project={project} chapter={selectedChapter} scene={selectedScene} showInspector={showInspector} aiInstructions={aiInstructions} setAIInstructions={setAIInstructions} onUpdateScene={(patch) => updateScene(selectedChapter.id, selectedScene.id, patch)} onGenerate={() => void generate()} onRemoveScene={() => removeScene(selectedChapter.id, selectedScene.id)} generating={generating} apiConnected={Boolean(apiKey)} />}
        {mode === 'bible' && <BibleView project={project} onAdd={() => setAddingBibleEntry(true)} onExtract={() => void extractBible()} extracting={extractingBible} onUpdateProject={updateCurrentProject} />}
        {mode === 'review' && <ReviewView project={project} />}
        {mode === 'publish' && <PublishView project={project} />}
      </section>

      {importing && <OutlineImportModal settings={aiSettings} apiKey={apiKey} onClose={() => setImporting(false)} onImport={(chapters) => { replaceChapters(project.id, chapters); setSelectedChapterId(chapters[0]?.id || ''); setSelectedSceneId(chapters[0]?.scenes[0]?.id || ''); setImporting(false); }} />}
      {connectingAI && <AIConnectionModal settings={aiSettings} apiKey={apiKey} onSave={saveAIConnection} onClose={() => setConnectingAI(false)} />}
      {generatedText && selectedChapter && selectedScene && (
        <Modal title="AI scene draft" onClose={() => setGeneratedText('')} wide>
          <div className="generation-review"><div className="generation-meta"><span>{aiSettings.model}</span><span>{countWords(generatedText).toLocaleString()} words</span><span>{selectedScene.title}</span></div><textarea value={generatedText} onChange={(event) => setGeneratedText(event.target.value)} /></div>
          <div className="modal-actions"><button className="button button-ghost" onClick={() => setGeneratedText('')}>Reject</button><button className="button button-secondary" onClick={() => { updateScene(selectedChapter.id, selectedScene.id, { prose: `${selectedScene.prose}${selectedScene.prose ? '\n\n' : ''}${generatedText}`, status: 'Drafting' }); setGeneratedText(''); }}>Append</button><button className="button button-primary" onClick={() => { updateScene(selectedChapter.id, selectedScene.id, { prose: generatedText, status: 'Drafted' }); setGeneratedText(''); }}><Check size={17} /> Accept draft</button></div>
        </Modal>
      )}
      {(generating || generationError) && !generatedText && (
        <div className={`generation-toast ${generationError ? 'error' : ''}`}>{generating ? <><Sparkles size={17} className="spin-slow" /> ArcBinder is drafting the scene…</> : <><X size={17} /> {generationError}<button onClick={() => setGenerationError('')}>Dismiss</button></>}</div>
      )}
      {addingBibleEntry && <NewBibleEntryModal onClose={() => setAddingBibleEntry(false)} onAdd={(entry) => { addStoryEntries(project.id, [entry]); setAddingBibleEntry(false); }} />}
    </main>
  );
}

function ChapterTreeItem({ chapter, selectedSceneId, onSelectScene, onAddScene }: { chapter: Chapter; selectedSceneId: string; onSelectScene: (sceneId: string) => void; onAddScene: () => void }) {
  const [open, setOpen] = useState(true);
  return <div className="chapter-tree-item"><div className="chapter-row"><button className="tree-chevron" onClick={() => setOpen(!open)}>{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button><button className="chapter-name" onClick={() => setOpen(true)}>{chapter.title}</button><button className="tree-add" onClick={onAddScene}><Plus size={14} /></button></div>{open && <div className="scene-tree">{chapter.scenes.map((scene) => <button key={scene.id} className={selectedSceneId === scene.id ? 'active' : ''} onClick={() => onSelectScene(scene.id)}><span className={`scene-dot ${scene.status.toLowerCase().replace(' ', '-')}`} /> <span>{scene.title}</span><small>{countWords(scene.prose) || scene.beats.length}</small></button>)}</div>}</div>;
}

function PlanView({ project, onImport, onSelectScene, onUpdateProject, onUpdateChapter }: { project: Project; onImport: () => void; onSelectScene: (chapterId: string, sceneId: string) => void; onUpdateProject: (updater: (project: Project) => Project) => void; onUpdateChapter: (chapterId: string, patch: Partial<Chapter>) => void }) {
  return (
    <div className="mode-page plan-page">
      <div className="mode-heading"><div><p className="eyebrow">Project plan</p><h1>{project.title}</h1><p>Shape the book from premise to scene-level beats.</p></div><button className="button button-primary" onClick={onImport}><FileInput size={17} /> Import outline</button></div>
      <section className="premise-card"><div><span className="section-icon"><Target size={19} /></span><div><h2>Story foundation</h2><p>The high-level context ArcBinder uses throughout the project.</p></div></div><label className="field-label">Premise</label><textarea value={project.premise} onChange={(event) => onUpdateProject((value) => ({ ...value, premise: event.target.value }))} placeholder="Describe the central premise, conflict, and stakes." /><div className="form-grid three-col"><div><label className="field-label">Genre</label><input className="field" value={project.genre} onChange={(event) => onUpdateProject((value) => ({ ...value, genre: event.target.value }))} /></div><div><label className="field-label">Project status</label><select className="field" value={project.status} onChange={(event) => onUpdateProject((value) => ({ ...value, status: event.target.value as Project['status'] }))}>{['Idea','Planning','Outlining','First draft','Revision','Editing','Formatting','Published','Archived'].map((status) => <option key={status}>{status}</option>)}</select></div><div><label className="field-label">Target words</label><input className="field" type="number" value={project.targetWords} onChange={(event) => onUpdateProject((value) => ({ ...value, targetWords: Number(event.target.value) }))} /></div></div></section>
      <div className="section-heading"><div><h2>Chapter map</h2><p>{project.chapters.length} chapters · {project.chapters.reduce((sum, c) => sum + c.scenes.length, 0)} scenes</p></div></div>
      <div className="chapter-map">
        {project.chapters.map((chapter, index) => <article className="chapter-card" key={chapter.id}><header><span>{String(index + 1).padStart(2, '0')}</span><input value={chapter.title} onChange={(event) => onUpdateChapter(chapter.id, { title: event.target.value })} /><small>{chapterWordCount(project, chapter.id).toLocaleString()} words</small></header><textarea value={chapter.summary} onChange={(event) => onUpdateChapter(chapter.id, { summary: event.target.value })} placeholder="Chapter purpose and turning point…" /><div className="scene-card-list">{chapter.scenes.map((scene) => <button key={scene.id} onClick={() => onSelectScene(chapter.id, scene.id)}><span><b>{scene.title}</b><small>{scene.summary || scene.beats[0]?.text || 'Add scene summary and beats'}</small></span><i>{scene.beats.length} beats</i></button>)}</div></article>)}
      </div>
    </div>
  );
}

function WriteView({ project, chapter, scene, showInspector, aiInstructions, setAIInstructions, onUpdateScene, onGenerate, onRemoveScene, generating, apiConnected }: { project: Project; chapter: Chapter; scene: Scene; showInspector: boolean; aiInstructions: string; setAIInstructions: (value: string) => void; onUpdateScene: (patch: Partial<Scene>) => void; onGenerate: () => void; onRemoveScene: () => void; generating: boolean; apiConnected: boolean }) {
  const [tab, setTab] = useState<'beats' | 'details'>('beats');
  const updateBeat = (beatId: string, text: string) => onUpdateScene({ beats: scene.beats.map((beat) => beat.id === beatId ? { ...beat, text } : beat) });
  const addBeat = () => onUpdateScene({ beats: [...scene.beats, { id: createId('beat'), text: '', completed: false }] });
  const removeBeat = (beatId: string) => onUpdateScene({ beats: scene.beats.filter((beat) => beat.id !== beatId) });

  return (
    <div className="write-layout">
      <article className="editor-area">
        <div className="editor-heading"><p>{chapter.title}</p><input value={scene.title} onChange={(event) => onUpdateScene({ title: event.target.value })} /><div><span>{countWords(scene.prose).toLocaleString()} words</span><span>{scene.status}</span></div></div>
        <div className="editor-toolbar"><button onClick={onGenerate} className="toolbar-ai"><WandSparkles size={16} /> Draft this scene from its beats</button></div>
        <textarea className="manuscript-editor" value={scene.prose} onChange={(event) => onUpdateScene({ prose: event.target.value, status: event.target.value.trim() ? 'Drafting' : 'Planned' })} placeholder={`Begin ${scene.title} here, or ask ArcBinder to draft it from your scene beats…`} spellCheck />
        <footer className="editor-footer"><span>{project.title}</span><span>{countWords(scene.prose).toLocaleString()} words · {scene.targetWords.toLocaleString()} target</span></footer>
      </article>
      {showInspector && <aside className="scene-inspector"><div className="inspector-tabs"><button className={tab === 'beats' ? 'active' : ''} onClick={() => setTab('beats')}>Beats</button><button className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}>Details</button></div>{tab === 'beats' ? <><div className="inspector-section-heading"><div><h3>Scene beats</h3><p>The actions ArcBinder must follow.</p></div><button className="icon-button" onClick={addBeat}><Plus size={17} /></button></div><div className="beats-list">{scene.beats.length === 0 && <button className="empty-beats" onClick={addBeat}><CirclePlus size={21} /> Add the first story beat</button>}{scene.beats.map((beat, index) => <div className="beat-row" key={beat.id}><span>{index + 1}</span><textarea value={beat.text} onChange={(event) => updateBeat(beat.id, event.target.value)} placeholder="What happens next?" /><button onClick={() => removeBeat(beat.id)}><X size={14} /></button></div>)}</div><div className="ai-instructions"><div><Sparkles size={17} /><strong>AI drafting instructions</strong></div><textarea value={aiInstructions} onChange={(event) => setAIInstructions(event.target.value)} /><button className="button button-primary full-width" disabled={generating || scene.beats.length === 0} onClick={onGenerate}><Sparkles size={17} /> {generating ? 'Drafting scene…' : apiConnected ? 'Generate scene prose' : 'Connect AI and generate'}</button></div></> : <div className="details-form"><label className="field-label">Scene summary</label><textarea className="field textarea" value={scene.summary} onChange={(event) => onUpdateScene({ summary: event.target.value })} /><label className="field-label"><UserRound size={14} /> POV character</label><input className="field" value={scene.pov} onChange={(event) => onUpdateScene({ pov: event.target.value })} /><label className="field-label"><MapPin size={14} /> Location</label><input className="field" value={scene.location} onChange={(event) => onUpdateScene({ location: event.target.value })} /><div className="form-grid two-col"><div><label className="field-label">Status</label><select className="field" value={scene.status} onChange={(event) => onUpdateScene({ status: event.target.value as Scene['status'] })}>{['Planned','Drafting','Drafted','Revising','Complete'].map((status) => <option key={status}>{status}</option>)}</select></div><div><label className="field-label">Target words</label><input className="field" type="number" value={scene.targetWords} onChange={(event) => onUpdateScene({ targetWords: Number(event.target.value) })} /></div></div><label className="field-label">Private notes</label><textarea className="field textarea" value={scene.notes} onChange={(event) => onUpdateScene({ notes: event.target.value })} /><button className="button button-danger" onClick={onRemoveScene}><Trash2 size={16} /> Delete scene</button></div>}</aside>}
    </div>
  );
}

function BibleView({ project, onAdd, onExtract, extracting, onUpdateProject }: { project: Project; onAdd: () => void; onExtract: () => void; extracting: boolean; onUpdateProject: (updater: (project: Project) => Project) => void }) {
  const [filter, setFilter] = useState('All');
  const types = ['All', ...new Set(project.storyBible.map((entry) => entry.type))];
  const entries = filter === 'All' ? project.storyBible : project.storyBible.filter((entry) => entry.type === filter);
  return <div className="mode-page"><div className="mode-heading"><div><p className="eyebrow">Living reference</p><h1>Story Bible</h1><p>Keep the people, places, objects, and rules of the book connected.</p></div><div className="button-row"><button className="button button-secondary" onClick={onExtract} disabled={extracting}><Sparkles size={17} /> {extracting ? 'Extracting…' : 'Extract from outline'}</button><button className="button button-primary" onClick={onAdd}><Plus size={17} /> New entry</button></div></div><div className="filter-tabs">{types.map((type) => <button key={type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{type}</button>)}</div>{entries.length === 0 ? <div className="empty-state"><LibraryBig size={42} /><h2>Your story bible is ready to grow</h2><p>Add entries manually or let ArcBinder extract named characters, places, objects, and organizations from the outline.</p><button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add first entry</button></div> : <div className="bible-grid">{entries.map((entry) => <article className="bible-card" key={entry.id}><header><span>{entry.type.slice(0, 1)}</span><div><small>{entry.type}</small><h3>{entry.name}</h3></div><button className="icon-button" onClick={() => onUpdateProject((value) => ({ ...value, storyBible: value.storyBible.filter((item) => item.id !== entry.id) }))}><Trash2 size={15} /></button></header><p>{entry.summary || 'No summary yet.'}</p><div>{entry.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div>}</div>;
}

function ReviewView({ project }: { project: Project }) {
  const words = projectWordCount(project);
  const scenes = project.chapters.flatMap((chapter) => chapter.scenes);
  const drafted = scenes.filter((scene) => scene.prose.trim()).length;
  const phrases = repeatedPhrases(project);
  const chapterCounts = project.chapters.map((chapter) => ({ title: chapter.title, count: chapterWordCount(project, chapter.id), target: chapter.targetWords }));
  const max = Math.max(1, ...chapterCounts.map((item) => Math.max(item.count, item.target)));
  return <div className="mode-page"><div className="mode-heading"><div><p className="eyebrow">Manuscript intelligence</p><h1>Review</h1><p>See what is written, what is missing, and where the draft needs attention.</p></div></div><div className="stats-grid"><StatCard label="Manuscript words" value={words.toLocaleString()} note={`${Math.round((words / Math.max(1, project.targetWords)) * 100)}% of target`} /><StatCard label="Drafted scenes" value={`${drafted}/${scenes.length}`} note={`${scenes.filter((s) => s.status === 'Complete').length} marked complete`} /><StatCard label="Story-bible entries" value={project.storyBible.length.toString()} note="Available to AI context" /><StatCard label="Remaining words" value={Math.max(0, project.targetWords - words).toLocaleString()} note="Based on project target" /></div><section className="review-panel"><div className="section-heading"><div><h2>Chapter balance</h2><p>Actual words compared with chapter targets.</p></div></div><div className="chapter-bars">{chapterCounts.map((item) => <div key={item.title}><label><span>{item.title}</span><small>{item.count.toLocaleString()} / {item.target.toLocaleString()}</small></label><div><span className="target-marker" style={{ left: `${(item.target / max) * 100}%` }} /><i style={{ width: `${(item.count / max) * 100}%` }} /></div></div>)}</div></section><div className="review-columns"><section className="review-panel"><h2>Draft warnings</h2><div className="finding-list">{scenes.filter((scene) => !scene.summary || !scene.beats.length || !scene.prose.trim()).slice(0, 12).map((scene) => <div key={scene.id}><span className="warning-dot" /><div><strong>{scene.title}</strong><p>{!scene.summary ? 'Missing scene summary' : !scene.beats.length ? 'No scene beats' : 'Scene has not been drafted'}</p></div></div>)}{scenes.every((scene) => scene.summary && scene.beats.length && scene.prose.trim()) && <p className="muted">No structural warnings found.</p>}</div></section><section className="review-panel"><h2>Repeated three-word phrases</h2><div className="phrase-list">{phrases.length ? phrases.map((item) => <div key={item.phrase}><span>{item.phrase}</span><b>{item.count}×</b></div>) : <p className="muted">Write more manuscript prose to analyze repetition.</p>}</div></section></div></div>;
}

function PublishView({ project }: { project: Project }) {
  return <div className="mode-page"><div className="mode-heading"><div><p className="eyebrow">PageBinder publishing</p><h1>Prepare and export</h1><p>Take the manuscript out of ArcBinder without losing your project structure.</p></div></div><section className="publish-hero"><div><span className="section-icon"><FileText size={23} /></span><h2>{project.title}</h2><p>{projectWordCount(project).toLocaleString()} words · {project.chapters.length} chapters · {project.author}</p></div><button className="button button-primary" onClick={() => printManuscript(project)}><BookOpenText size={17} /> Print or save PDF</button></section><div className="export-grid"><ExportCard title="Microsoft Word" detail="A real DOCX manuscript with chapter headings and page breaks." action="Export DOCX" onClick={() => void downloadDocx(project)} /><ExportCard title="Markdown" detail="Clean, portable text for publishing systems and version control." action="Export Markdown" onClick={() => downloadText(project, 'md')} /><ExportCard title="Plain text" detail="A universal manuscript file with no proprietary formatting." action="Export TXT" onClick={() => downloadText(project, 'txt')} /><ExportCard title="ArcBinder backup" detail="The complete project, including outline, beats, bible, and prose." action="Export JSON" onClick={() => downloadText(project, 'json')} /></div><section className="pagebinder-card"><div><p className="eyebrow">Coming next in this rebuild</p><h2>Full PageBinder layout studio</h2><p>Trim sizes, mirrored margins, front matter, chapter-opening designs, EPUB, and print-ready PDF will connect here.</p></div><div className="page-preview"><span>ARC BINDER</span><h3>{project.chapters[0]?.title || 'Chapter One'}</h3><p>{project.chapters[0]?.scenes[0]?.prose.slice(0, 190) || 'Your formatted manuscript preview will appear here as the draft develops.'}</p></div></section></div>;
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) { return <article className="stat-card"><small>{label}</small><strong>{value}</strong><span>{note}</span></article>; }
function ExportCard({ title, detail, action, onClick }: { title: string; detail: string; action: string; onClick: () => void }) { return <article className="export-card"><Download size={21} /><h3>{title}</h3><p>{detail}</p><button className="button button-secondary" onClick={onClick}>{action}</button></article>; }

function NewBibleEntryModal({ onClose, onAdd }: { onClose: () => void; onAdd: (entry: StoryEntry) => void }) {
  const [draft, setDraft] = useState<{ type: StoryEntryType; name: string; summary: string; details: string; tags: string }>({ type: 'Character', name: '', summary: '', details: '', tags: '' });
  return <Modal title="New story-bible entry" onClose={onClose}><label className="field-label">Entry type</label><select className="field" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as StoryEntryType })}>{['Character','Location','Organization','Object','Lore','Research','Theme','Custom'].map((type) => <option key={type}>{type}</option>)}</select><label className="field-label">Name</label><input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} autoFocus /><label className="field-label">Summary</label><textarea className="field textarea" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /><label className="field-label">Details</label><textarea className="field textarea tall" value={draft.details} onChange={(event) => setDraft({ ...draft, details: event.target.value })} /><label className="field-label">Tags</label><input className="field" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="protagonist, harbor, secret" /><div className="modal-actions"><button className="button button-ghost" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={!draft.name.trim()} onClick={() => onAdd({ id: createId('entry'), type: draft.type, name: draft.name.trim(), summary: draft.summary.trim(), details: draft.details.trim(), tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean) })}>Add entry</button></div></Modal>;
}
