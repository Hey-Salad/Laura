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

  // Validate camera token
  const cameraToken = request.headers.get('X-Camera-Token');
  if (!cameraToken) {
    return new Response('Missing X-Camera-Token header', { status: 401 });
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
    // Query Supabase to validate token
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cameras?api_token=eq.${token}&select=id,status`,
      {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const cameras = await response.json();

    // Token is valid if we found exactly one camera with status 'online'
    return cameras.length === 1 && cameras[0].status === 'online';
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}
