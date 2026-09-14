// Serves /llms.txt from the derivation in src/lib/llmsTxt.js.
//
// A route rather than a file in public/ so that the version and the listing
// name come from the same generated record every other surface reads. The
// header of that module records what went wrong while this was static.
import type { APIRoute } from 'astro';
import { buildLlmsTxt } from '../lib/llmsTxt.js';

export const GET: APIRoute = () =>
  new Response(buildLlmsTxt(), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
