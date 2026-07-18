interface Env {
  AI_PROXY_ALLOWED_ORIGIN?: string;
}

interface RequestBody {
  settings?: {
    provider?: string;
    model?: string;
    baseUrl?: string;
    creativity?: number;
    length?: 'short' | 'medium' | 'long';
  };
  apiKey?: string;
  system?: string;
  prompt?: string;
  jsonMode?: boolean;
}

const lengthTokens = { short: 900, medium: 2200, long: 4200 } as const;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('Origin') || '';
  if (env.AI_PROXY_ALLOWED_ORIGIN && origin && origin !== env.AI_PROXY_ALLOWED_ORIGIN) {
    return json({ error: 'Origin not allowed.' }, 403);
  }

  let body: RequestBody;
  try {
    body = await request.json<RequestBody>();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const provider = body.settings?.provider || 'openai';
  const model = body.settings?.model?.trim();
  const apiKey = body.apiKey?.trim();
  const system = body.system?.trim();
  const prompt = body.prompt?.trim();
  const temperature = clamp(body.settings?.creativity ?? 0.7, 0, 1.5);
  const maxTokens = lengthTokens[body.settings?.length || 'medium'];

  if (!apiKey || !model || !prompt) return json({ error: 'API key, model, and prompt are required.' }, 400);
  if (prompt.length > 300_000) return json({ error: 'The request context is too large.' }, 413);

  try {
    if (provider === 'anthropic') {
      return await callAnthropic({ apiKey, model, system: system || '', prompt, temperature, maxTokens });
    }
    if (provider === 'gemini') {
      return await callGemini({ apiKey, model, system: system || '', prompt, temperature, maxTokens, jsonMode: Boolean(body.jsonMode) });
    }
    return await callOpenAICompatible({
      apiKey,
      model,
      system: system || '',
      prompt,
      temperature,
      maxTokens,
      jsonMode: Boolean(body.jsonMode),
      baseUrl: resolveBaseUrl(provider, body.settings?.baseUrl),
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'AI provider request failed.' }, 502);
  }
};

async function callOpenAICompatible(args: { apiKey: string; model: string; system: string; prompt: string; temperature: number; maxTokens: number; jsonMode: boolean; baseUrl: string }) {
  const response = await fetch(`${args.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
      ...(args.baseUrl.includes('openrouter.ai') ? { 'HTTP-Referer': 'https://arcbinder.app', 'X-Title': 'ArcBinder' } : {}),
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        ...(args.system ? [{ role: 'system', content: args.system }] : []),
        { role: 'user', content: args.prompt },
      ],
      temperature: args.temperature,
      max_tokens: args.maxTokens,
      ...(args.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  const data = await response.json<Record<string, unknown>>().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(data, response.status));
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  const text = choices?.[0]?.message?.content;
  if (!text) throw new Error('The provider returned an empty response.');
  return json({ text });
}

async function callAnthropic(args: { apiKey: string; model: string; system: string; prompt: string; temperature: number; maxTokens: number }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      system: args.system,
      messages: [{ role: 'user', content: args.prompt }],
    }),
  });
  const data = await response.json<Record<string, unknown>>().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(data, response.status));
  const content = data.content as Array<{ type?: string; text?: string }> | undefined;
  const text = content?.filter((item) => item.type === 'text').map((item) => item.text || '').join('\n');
  if (!text) throw new Error('Anthropic returned an empty response.');
  return json({ text });
}

async function callGemini(args: { apiKey: string; model: string; system: string; prompt: string; temperature: number; maxTokens: number; jsonMode: boolean }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: args.system ? { parts: [{ text: args.system }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: args.prompt }] }],
      generationConfig: {
        temperature: args.temperature,
        maxOutputTokens: args.maxTokens,
        ...(args.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  const data = await response.json<Record<string, unknown>>().catch(() => ({}));
  if (!response.ok) throw new Error(providerError(data, response.status));
  const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  const text = candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
  if (!text) throw new Error('Gemini returned an empty response.');
  return json({ text });
}

function resolveBaseUrl(provider: string, supplied = ''): string {
  if (provider === 'xai') return 'https://api.x.ai/v1';
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
  if (provider === 'openai') return 'https://api.openai.com/v1';
  if (provider === 'custom' && supplied.startsWith('https://')) return supplied;
  if (supplied.startsWith('https://')) return supplied;
  return 'https://api.openai.com/v1';
}

function providerError(data: Record<string, unknown>, status: number): string {
  const error = data.error as { message?: string } | string | undefined;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return `AI provider returned HTTP ${status}.`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
