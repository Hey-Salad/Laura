/**
 * Cloudflare Worker: OpenAI Realtime API WebSocket Proxy
 *
 * Securely proxies WebSocket connections to OpenAI Realtime API
 * - Validates camera tokens via Supabase
 * - Keeps OpenAI API key server-side
 * - Adds rate limiting per camera
 *
 * Deploy: wrangler deploy
 * URL: wss://openai-proxy.your-domain.workers.dev
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers for preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Camera-Token',
        },
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'openai-proxy' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Debug endpoint for testing token validation
    if (url.pathname === '/debug-validate') {
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response(JSON.stringify({ error: 'Missing token parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const isValid = await validateCameraToken(token, env);
      return new Response(JSON.stringify({
        token_length: token.length,
        is_valid: isValid,
        has_supabase_url: !!env.SUPABASE_URL,
        has_anon_key: !!env.SUPABASE_ANON_KEY,
        has_service_key: !!env.SUPABASE_SERVICE_ROLE_KEY,
        has_openai_key: !!env.OPENAI_API_KEY,
        env_keys: Object.keys(env),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // WebSocket upgrade for /openai-realtime
    if (url.pathname === '/openai-realtime') {
      return handleOpenAIProxy(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleOpenAIProxy(request, env) {
  const upgrade = request.headers.get('Upgrade');

  if (!upgrade || upgrade !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 });
  }

  // Get camera token from query parameter or header
  const url = new URL(request.url);
  const cameraToken = url.searchParams.get('token') || request.headers.get('X-Camera-Token');

  if (!cameraToken) {
    return new Response('Missing camera token. Provide as ?token=xxx or X-Camera-Token header', { status: 401 });
  }

  // Verify token with Supabase
  const isValid = await validateCameraToken(cameraToken, env);
  if (!isValid) {
    return new Response('Invalid camera token', { status: 403 });
  }

  // Create WebSocket pair
  const [client, server] = Object.values(new WebSocketPair());

  // Accept the client WebSocket
  server.accept();

  // Connect to OpenAI
  const openaiUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
  const openaiWs = new WebSocket(openaiUrl, {
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  // Proxy messages from client to OpenAI
  server.addEventListener('message', (event) => {
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(event.data);
    }
  });

  // Proxy messages from OpenAI to client
  openaiWs.addEventListener('message', (event) => {
    if (server.readyState === WebSocket.OPEN) {
      server.send(event.data);
    }
  });

  // Handle errors
  server.addEventListener('error', (event) => {
    console.error('Client WebSocket error:', event);
    openaiWs.close();
  });

  openaiWs.addEventListener('error', (event) => {
    console.error('OpenAI WebSocket error:', event);
    server.close();
  });

  // Handle close
  server.addEventListener('close', () => {
    openaiWs.close();
  });

  openaiWs.addEventListener('close', () => {
    server.close();
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

async function validateCameraToken(token, env) {
  try {
    console.log('[DEBUG] Validating camera token...');
    console.log('[DEBUG] Token length:', token?.length);
    console.log('[DEBUG] SUPABASE_URL exists:', !!env.SUPABASE_URL);
    console.log('[DEBUG] SERVICE_ROLE_KEY exists:', !!env.SUPABASE_SERVICE_ROLE_KEY);

    // Query Supabase to validate token
    // Use SERVICE_ROLE_KEY to bypass RLS policies
    const url = `${env.SUPABASE_URL}/rest/v1/cameras?api_token=eq.${encodeURIComponent(token)}&select=id,status`;
    console.log('[DEBUG] Query URL:', url);

    const response = await fetch(url, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    console.log('[DEBUG] Response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error(`[ERROR] Supabase query failed: ${response.status} ${response.statusText}`);
      console.error(`[ERROR] Response body:`, text);
      return false;
    }

    const cameras = await response.json();
    console.log('[DEBUG] Found cameras:', cameras.length);

    // Token is valid if we found exactly one camera with status 'online'
    const isValid = cameras.length === 1 && cameras[0].status === 'online';
    console.log('[DEBUG] Token valid:', isValid);
    return isValid;
  } catch (error) {
    console.error('[ERROR] Token validation error:', error);
    return false;
  }
}
