import { handleAiRequest, type AiEnv } from '../server/ai';

interface Env extends AiEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/ai') {
      if (request.method === 'POST') return handleAiRequest(request, env);
      return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Allow: 'POST',
        },
      });
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'API route not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
