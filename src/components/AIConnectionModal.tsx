import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import type { AIProvider, AISettings } from '../types';
import { Modal } from './Modal';

const defaults: Record<AIProvider, { model: string; baseUrl: string }> = {
  openai: { model: 'gpt-4.1-mini', baseUrl: 'https://api.openai.com/v1' },
  anthropic: { model: 'claude-sonnet-4-20250514', baseUrl: 'https://api.anthropic.com' },
  gemini: { model: 'gemini-2.5-flash', baseUrl: 'https://generativelanguage.googleapis.com' },
  xai: { model: 'grok-3-mini', baseUrl: 'https://api.x.ai/v1' },
  openrouter: { model: 'openai/gpt-4.1-mini', baseUrl: 'https://openrouter.ai/api/v1' },
  custom: { model: '', baseUrl: '' },
};

export function AIConnectionModal({
  settings,
  apiKey,
  onSave,
  onClose,
}: {
  settings: AISettings;
  apiKey: string;
  onSave: (settings: AISettings, apiKey: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [key, setKey] = useState(apiKey);

  const changeProvider = (provider: AIProvider) => {
    const next = defaults[provider];
    setDraft((value) => ({ ...value, provider, model: next.model, baseUrl: next.baseUrl }));
  };

  return (
    <Modal title="AI connection" onClose={onClose}>
      <div className="notice notice-secure"><ShieldCheck size={18} /><span>Your key is kept only for this browser session and sent through the ArcBinder server proxy.</span></div>
      <label className="field-label">Provider</label>
      <select className="field" value={draft.provider} onChange={(event) => changeProvider(event.target.value as AIProvider)}>
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="gemini">Google Gemini</option>
        <option value="xai">xAI</option>
        <option value="openrouter">OpenRouter</option>
        <option value="custom">Custom OpenAI-compatible endpoint</option>
      </select>

      <label className="field-label">Model</label>
      <input className="field" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} placeholder="Model name" />

      <label className="field-label">Base URL</label>
      <input className="field" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder="https://api.example.com/v1" />

      <label className="field-label">API key</label>
      <div className="input-with-icon"><KeyRound size={17} /><input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Paste provider API key" /></div>

      <div className="form-grid two-col">
        <div>
          <label className="field-label">Creativity: {draft.creativity.toFixed(1)}</label>
          <input className="range" type="range" min="0" max="1.2" step="0.1" value={draft.creativity} onChange={(event) => setDraft({ ...draft, creativity: Number(event.target.value) })} />
        </div>
        <div>
          <label className="field-label">Default length</label>
          <select className="field" value={draft.length} onChange={(event) => setDraft({ ...draft, length: event.target.value as AISettings['length'] })}>
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
      </div>

      <div className="modal-actions">
        <button className="button button-ghost" onClick={onClose}>Cancel</button>
        <button className="button button-primary" onClick={() => onSave(draft, key)} disabled={!draft.model || !key}>Save connection</button>
      </div>
    </Modal>
  );
}
