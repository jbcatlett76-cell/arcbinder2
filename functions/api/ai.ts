import { handleAiRequest, type AiEnv } from '../../server/ai';

export const onRequestPost: PagesFunction<AiEnv> = async ({ request, env }) => handleAiRequest(request, env);
