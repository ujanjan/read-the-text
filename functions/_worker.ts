// Main Worker entry point for routing
// This handles routing between static assets and API functions
// For Cloudflare Workers deployment with [assets] configuration
//
// BUILD PROCESS:
// ==============
// This file contains a placeholder for index.html that gets replaced during build.
// The build script (scripts/inject-index-html.js) copies this entire functions/
// directory to dist/functions/ and injects the built index.html content.
//
// - Source: functions/_worker.ts (this file - keeps placeholder)
// - Output: dist/functions/_worker.ts (has actual HTML with hashed assets)
//
// This ensures SPA routes like /admin work correctly by serving the right
// index.html with current asset paths (e.g., /assets/index-B8-uZEdN.js).
//
// Run: npm run build && npx wrangler deploy

import type { Env } from './types';

// Placeholder for index.html - will be replaced during build
// DO NOT EDIT THIS LINE - it's replaced by scripts/inject-index-html.js
const INDEX_HTML_PLACEHOLDER = '__INDEX_HTML_CONTENT__';

// Import all handlers
import { onRequestPost as sessionsCheckPost } from './api/sessions/check';
import { onRequestPost as sessionsCreatePost } from './api/sessions/index';
import { onRequestGet as sessionGet, onRequestDelete as sessionDelete } from './api/sessions/[id]';
import { onRequestPost as sessionCompletePost } from './api/sessions/[id]/complete';
import { onRequestPut as passageResultPut } from './api/passages/[sessionId]/[passageIndex]';
import { onRequestPost as passageAttemptPost } from './api/passages/[sessionId]/[passageIndex]/attempts';
import { onRequestPost as adminAuthPost } from './api/admin/auth';
import { onRequestGet as adminSessionsGet } from './api/admin/sessions';
import { onRequestGet as adminSessionGet, onRequestDelete as adminSessionDelete, onRequestPatch as adminSessionPatch } from './api/admin/sessions/[id]';
import { onRequestGet as adminAnalyticsGet } from './api/admin/analytics';
import { onRequestGet as adminPassageDetailGet } from './api/admin/passages/[passageId]';
import { onRequestPost as sendLinkPost } from './api/send-link';
import { onRequestPost as sendWelcomePost } from './api/send-welcome';
import { onRequestPost as questionnairePost } from './api/questionnaire/[sessionId]';
import { onRequestGet as reportGet } from './api/report/[id]';


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
      // - Static files (JS, CSS, images, etc.) are served by Cloudflare automatically
      // - The worker is invoked for paths without matching files
      // - We serve index.html for SPA routes (paths without file extensions)

      const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(url.pathname);

      // If path has a file extension, it's requesting a specific file that doesn't exist
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

      // Get index.html content
      let indexHtml = INDEX_HTML_PLACEHOLDER;

      // If placeholder not replaced (dev mode), use a basic template
      if (indexHtml === '__INDEX_HTML_CONTENT__') {
        indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reading Comprehension App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
      }

      return new Response(indexHtml, {
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
    passThroughOnException: () => { },
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
    console.log('Checking admin auth route...');
    console.log('path === "/api/admin/auth":', path === '/api/admin/auth');
    console.log('method === "POST":', method === 'POST');
    if (path === '/api/admin/auth' && method === 'POST') {
      console.log('Auth route matched! Calling handler...');
      console.log('adminAuthPost:', typeof adminAuthPost);
      return await adminAuthPost(createContext());
    }

    if (path === '/api/admin/sessions' && method === 'GET') {
      return await adminSessionsGet(createContext());
    }

    if (path === '/api/admin/analytics' && method === 'GET') {
      return await adminAnalyticsGet(createContext());
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
      if (method === 'PATCH') {
        return await adminSessionPatch(createContext({ id: sessionId }));
      }
    }

    // Admin passage detail route
    const adminPassageMatch = path.match(/^\/api\/admin\/passages\/([^\/]+)$/);
    if (adminPassageMatch && method === 'GET') {
      const passageId = adminPassageMatch[1];
      return await adminPassageDetailGet(createContext({ passageId }));
    }

    // Questionnaire route
    const questionnaireMatch = path.match(/^\/api\/questionnaire\/([^\/]+)$/);
    if (questionnaireMatch && method === 'POST') {
      const sessionId = questionnaireMatch[1];
      return await questionnairePost(createContext({ sessionId }));
    }

    // Report route
    const reportMatch = path.match(/^\/api\/report\/([^\/]+)$/);
    if (reportMatch && method === 'GET') {
      const sessionId = reportMatch[1];
      return await reportGet(createContext({ id: sessionId }));
    }

    // Send link (email) route
    if (path === '/api/send-link' && method === 'POST') {
      return await sendLinkPost(createContext());
    }

    // Send welcome (confirmation email) route
    if (path === '/api/send-welcome' && method === 'POST') {
      return await sendWelcomePost(createContext());
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

