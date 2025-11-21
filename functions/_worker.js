// Main Worker entry point for routing
// This handles routing between static assets and API functions

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Route API requests to Functions
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env, ctx);
    }
    
    // Serve static assets from /dist
    return env.ASSETS.fetch(request);
  }
};

// API Router - maps routes to function handlers
async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Create context object compatible with Pages Functions
  const createContext = (params = {}) => ({
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
      const { onRequestPost } = await import('./api/sessions/check.ts');
      return await onRequestPost(createContext());
    }
    
    if (path === '/api/sessions' && method === 'POST') {
      const { onRequestPost } = await import('./api/sessions/index.ts');
      return await onRequestPost(createContext());
    }
    
    // Session by ID - GET/DELETE
    const sessionIdMatch = path.match(/^\/api\/sessions\/([^\/]+)$/);
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1];
      if (method === 'GET') {
        const { onRequestGet } = await import('./api/sessions/[id].ts');
        return await onRequestGet(createContext({ id: sessionId }));
      }
      if (method === 'DELETE') {
        const { onRequestDelete } = await import('./api/sessions/[id].ts');
        return await onRequestDelete(createContext({ id: sessionId }));
      }
    }
    
    // Session complete
    const completeMatch = path.match(/^\/api\/sessions\/([^\/]+)\/complete$/);
    if (completeMatch && method === 'POST') {
      const sessionId = completeMatch[1];
      const { onRequestPost } = await import('./api/sessions/[id]/complete.ts');
      return await onRequestPost(createContext({ id: sessionId }));
    }
    
    // Passage result - PUT
    const passageMatch = path.match(/^\/api\/passages\/([^\/]+)\/(\d+)$/);
    if (passageMatch && method === 'PUT') {
      const [, sessionId, passageIndex] = passageMatch;
      const { onRequestPut } = await import('./api/passages/[sessionId]/[passageIndex].ts');
      return await onRequestPut(createContext({ sessionId, passageIndex }));
    }
    
    // Passage attempts - POST
    const attemptMatch = path.match(/^\/api\/passages\/([^\/]+)\/(\d+)\/attempts$/);
    if (attemptMatch && method === 'POST') {
      const [, sessionId, passageIndex] = attemptMatch;
      const { onRequestPost } = await import('./api/passages/[sessionId]/[passageIndex]/attempts.ts');
      return await onRequestPost(createContext({ sessionId, passageIndex }));
    }
    
    // Admin routes
    if (path === '/api/admin/sessions' && method === 'GET') {
      const { onRequestGet } = await import('./api/admin/sessions.ts');
      return await onRequestGet(createContext());
    }
    
    const adminSessionMatch = path.match(/^\/api\/admin\/sessions\/([^\/]+)$/);
    if (adminSessionMatch) {
      const sessionId = adminSessionMatch[1];
      if (method === 'GET') {
        const { onRequestGet } = await import('./api/admin/sessions/[id].ts');
        return await onRequestGet(createContext({ id: sessionId }));
      }
      if (method === 'DELETE') {
        const { onRequestDelete } = await import('./api/admin/sessions/[id].ts');
        return await onRequestDelete(createContext({ id: sessionId }));
      }
    }
    
    // No matching route
    return new Response('Not Found', { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
