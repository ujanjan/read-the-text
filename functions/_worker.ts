// Main Worker entry point for routing
// This handles routing between static assets and API functions
// For Cloudflare Workers deployment with [assets] configuration

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

// Index HTML content for SPA routing
// This is the generated index.html from the build
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reading Comprehension App</title>
    <script type="module" crossorigin src="/assets/index-ByuPT1uO.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-Bdzf2QCG.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      console.log('Worker handling:', url.pathname);

      // Route API requests to Functions
      if (url.pathname.startsWith('/api/')) {
        console.log('API request to:', url.pathname);
        return handleApiRequest(request, env, ctx);
      }

      // For Cloudflare Workers with [assets] configuration:
      // - Static files (JS, CSS, images, index.html) are served AUTOMATICALLY by Cloudflare
      // - The worker is ONLY invoked when there's NO matching static file
      // - We handle SPA client-side routing by returning index.html for non-file paths
      
      const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(url.pathname);
      
      // If it has a file extension, it's a request for a specific file that doesn't exist
      // Return 404 instead of index.html (except for .html files)
      if (hasFileExtension && !url.pathname.endsWith('.html')) {
        console.log('File not found:', url.pathname);
        return new Response('Not Found', { 
          status: 404,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // For paths without extensions (SPA routes like /admin, /results/xxx)
      // serve index.html to let React Router handle the routing
      console.log('SPA route, serving index.html for:', url.pathname);
      
      return new Response(INDEX_HTML, {
        status: 200,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'no-cache',
        },
      });
      
    } catch (error: any) {
      console.error('Worker error:', error);
      console.error('Error stack:', error.stack);
      return new Response(`Internal Server Error: ${error.message}\n\nStack: ${error.stack}`, {
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

  console.log('=== API Request ===');
  console.log('Path:', path);
  console.log('Method:', method);

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

