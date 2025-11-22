// Main Worker entry point for routing
// This handles routing between static assets and API functions

import type { Env } from './types';

// Import all handlers
import { onRequestPost as sessionsCheckPost } from './api/sessions/check';
import { onRequestPost as sessionsCreatePost } from './api/sessions/index';
import { onRequestGet as sessionGet, onRequestDelete as sessionDelete } from './api/sessions/[id]';
import { onRequestPost as sessionCompletePost } from './api/sessions/[id]/complete';
import { onRequestPut as passageResultPut } from './api/passages/[sessionId]/[passageIndex]';
import { onRequestPost as passageAttemptPost } from './api/passages/[sessionId]/[passageIndex]/attempts';
import { onRequestGet as adminSessionsGet } from './api/admin/sessions';
import { onRequestGet as adminSessionGet, onRequestDelete as adminSessionDelete } from './api/admin/sessions/[id]';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Route API requests to Functions
      if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(request, env, ctx);
      }

      // Try to serve static asset
      const assetResponse = await env.ASSETS.fetch(request);

      // If asset not found (404) and it's not a file request (no extension or is an HTML route)
      // serve index.html for SPA client-side routing
      if (assetResponse.status === 404) {
        const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(url.pathname);

        // If no file extension or explicitly an HTML-like path, serve index.html
        if (!hasFileExtension || url.pathname.endsWith('.html')) {
          // Create a simple GET request for index.html
          const indexUrl = new URL('/', url.origin);
          const indexRequest = new Request(indexUrl.toString(), {
            method: 'GET',
            headers: request.headers
          });
          return env.ASSETS.fetch(indexRequest);
        }
      }

      return assetResponse;
    } catch (error: any) {
      console.error('Worker error:', error);
      return new Response(`Internal Server Error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};

// API Router - maps routes to function handlers
async function handleApiRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Create context object compatible with Pages Functions
  const createContext = (params: Record<string, string> = {}): any => ({
    request,
    env,
    params,
    waitUntil: ctx.waitUntil.bind(ctx),
    passThroughOnException: () => {},
    next: async () => new Response('Not Found', { status: 404 }),
    data: {},
    functionPath: path
  });

  try {
    // Sessions routes
    if (path === '/api/sessions/check' && method === 'POST') {
      return await sessionsCheckPost(createContext());
    }
    
    if (path === '/api/sessions' && method === 'POST') {
      return await sessionsCreatePost(createContext());
    }
    
    // Session by ID - GET/DELETE
    const sessionIdMatch = path.match(/^\/api\/sessions\/([^\/]+)$/);
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1];
      if (method === 'GET') {
        return await sessionGet(createContext({ id: sessionId }));
      }
      if (method === 'DELETE') {
        return await sessionDelete(createContext({ id: sessionId }));
      }
    }
    
    // Session complete
    const completeMatch = path.match(/^\/api\/sessions\/([^\/]+)\/complete$/);
    if (completeMatch && method === 'POST') {
      const sessionId = completeMatch[1];
      return await sessionCompletePost(createContext({ id: sessionId }));
    }
    
    // Passage result - PUT
    const passageMatch = path.match(/^\/api\/passages\/([^\/]+)\/(\d+)$/);
    if (passageMatch && method === 'PUT') {
      const [, sessionId, passageIndex] = passageMatch;
      return await passageResultPut(createContext({ sessionId, passageIndex }));
    }
    
    // Passage attempts - POST
    const attemptMatch = path.match(/^\/api\/passages\/([^\/]+)\/(\d+)\/attempts$/);
    if (attemptMatch && method === 'POST') {
      const [, sessionId, passageIndex] = attemptMatch;
      return await passageAttemptPost(createContext({ sessionId, passageIndex }));
    }
    
    // Admin routes
    if (path === '/api/admin/sessions' && method === 'GET') {
      return await adminSessionsGet(createContext());
    }
    
    const adminSessionMatch = path.match(/^\/api\/admin\/sessions\/([^\/]+)$/);
    if (adminSessionMatch) {
      const sessionId = adminSessionMatch[1];
      if (method === 'GET') {
        return await adminSessionGet(createContext({ id: sessionId }));
      }
      if (method === 'DELETE') {
        return await adminSessionDelete(createContext({ id: sessionId }));
      }
    }
    
    // No matching route
    return new Response('Not Found', { status: 404 });
    
  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message, 
      stack: error.stack 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

