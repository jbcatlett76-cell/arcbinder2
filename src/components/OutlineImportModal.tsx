import { useMemo, useState } from 'react';
import { FileText, Sparkles, Upload } from 'lucide-react';
import type { AISettings, Chapter } from '../types';
import { chaptersFromAIJson, parseOutline } from '../lib/outlineParser';
import { structureOutlineWithAI } from '../lib/ai';
import { Modal } from './Modal';

export function OutlineImportModal({
  settings,
  apiKey,
  onImport,
  onClose,
}: {
  settings: AISettings;
  apiKey: string;
  onImport: (chapters: Chapter[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const counts = useMemo(() => ({ chapters: chapters.length, scenes: chapters.reduce((sum, c) => sum + c.scenes.length, 0), beats: chapters.reduce((sum, c) => sum + c.scenes.reduce((s, scene) => s + scene.beats.length, 0), 0) }), [chapters]);

  const analyzeLocally = () => {
    setError('');
    const result = parseOutline(text);
    if (!result.length) setError('Paste or upload an outline first.');
    setChapters(result);
  };

  const analyzeWithAI = async () => {
    if (!apiKey) {
      setError('Connect an AI provider before using AI structure detection. Local detection still works without a key.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      const json = await structureOutlineWithAI({ text, settings, apiKey });
      setChapters(chaptersFromAIJson(json));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI analysis failed.');
    } finally {
      setWorking(false);
    }
  };

  const readFile = async (file: File) => {
    setError('');
    try {
      if (file.name.toLowerCase().endsWith('.docx')) {
        const buffer = await file.arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        setText(result.value);
      } else {
        setText(await file.text());
      }
    } catch {
      setError('That file could not be read. Use DOCX, TXT, or Markdown.');
    }
  };

  return (
    <Modal title="Import and structure outline" onClose={onClose} wide>
      <div className="import-layout">
        <div>
          <label className="upload-box">
            <Upload size={20} />
            <span><strong>Upload outline</strong><small>DOCX, TXT, or Markdown</small></span>
            <input type="file" accept=".docx,.txt,.md,.markdown" onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])} />
          </label>
          <label className="field-label">Or paste the outline</label>
          <textarea className="outline-input" value={text} onChange={(event) => setText(event.target.value)} placeholder={'Chapter 1: The Arrival\nScene 1: At the station\n- Mara steps off the train\n- She recognizes the abandoned hotel'} />
          {error && <p className="error-text">{error}</p>}
          <div className="button-row">
            <button className="button button-secondary" onClick={analyzeLocally}><FileText size={17} /> Detect structure</button>
            <button className="button button-primary" onClick={() => void analyzeWithAI()} disabled={working || !text.trim()}><Sparkles size={17} /> {working ? 'Analyzing…' : 'AI structure'}</button>
          </div>
        </div>

        <div className="import-preview">
          <div className="preview-summary"><span>{counts.chapters} chapters</span><span>{counts.scenes} scenes</span><span>{counts.beats} beats</span></div>
          {chapters.length === 0 ? (
            <div className="empty-state compact"><FileText size={32} /><h3>No structure detected yet</h3><p>ArcBinder will preserve your outline while organizing it into an editable hierarchy.</p></div>
          ) : (
            <div className="outline-preview-tree">
              {chapters.map((chapter) => (
                <div className="preview-chapter" key={chapter.id}>
                  <strong>{chapter.title}</strong>
                  {chapter.scenes.map((scene) => (
                    <div className="preview-scene" key={scene.id}><span>{scene.title}</span><small>{scene.beats.length} beats</small></div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <button className="button button-primary full-width" disabled={!chapters.length} onClick={() => onImport(chapters)}>Use this structure</button>
        </div>
      </div>
    </Modal>
  );
}
