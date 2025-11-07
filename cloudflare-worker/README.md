# HeySalad OpenAI Proxy - Cloudflare Worker

Secure WebSocket proxy for OpenAI Realtime API that keeps API keys server-side.

## Architecture

```
reCamera → [WebSocket] → Cloudflare Worker → [WebSocket] → OpenAI API
           (camera token)                     (API key)
```

## Setup & Deployment

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Set Environment Variables

Set the secrets (these are encrypted and never exposed):

```bash
# Set OpenAI API Key
wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key when prompted

# Set Supabase URL
wrangler secret put SUPABASE_URL
# Enter: https://your-project.supabase.co

# Set Supabase Anon Key
wrangler secret put SUPABASE_ANON_KEY
# Enter your Supabase anon key
```

Alternatively, you can set these in the Cloudflare dashboard:
- Go to Workers & Pages → Your Worker → Settings → Variables
- Add as secrets (not environment variables)

### 4. Deploy

```bash
cd cloudflare-worker
npm install
npm run deploy
```

The worker will be deployed to: `https://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev`

### 5. Update Laura Configuration

Add the worker URL to Vercel environment variables:

```bash
# In Vercel dashboard or via CLI
vercel env add CLOUDFLARE_WORKER_URL
# Enter: wss://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev
```

## Testing

### Health Check

```bash
curl https://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "openai-proxy"
}
```

### WebSocket Connection (requires valid camera token)

You can't easily test WebSocket from curl, but from Node-RED or JavaScript:

```javascript
const ws = new WebSocket('wss://heysalad-openai-proxy.YOUR-SUBDOMAIN.workers.dev/openai-realtime', {
  headers: {
    'X-Camera-Token': 'your-camera-api-token'
  }
});

ws.onopen = () => console.log('Connected to OpenAI via proxy');
ws.onmessage = (event) => console.log('Message from OpenAI:', event.data);
```

## Security Features

1. **Camera Token Validation**: Only cameras registered in Supabase with valid tokens can connect
2. **Server-Side API Keys**: OpenAI API key never leaves the Worker
3. **Status Check**: Only cameras with `status = 'online'` are allowed
4. **Rate Limiting**: Consider adding Cloudflare rate limiting rules for additional protection

## Monitoring

View logs in Cloudflare dashboard:
- Workers & Pages → Your Worker → Logs
- Or use: `wrangler tail`

## Cost

Cloudflare Workers Free Tier:
- 100,000 requests/day
- 10ms CPU time per request
- WebSocket connections count as one request (connection open) + data transfer

This is more than sufficient for a few cameras running continuously.

## Troubleshooting

### "Invalid camera token" error
- Verify camera exists in Supabase `cameras` table
- Check camera's `api_token` field is set
- Ensure camera `status` is 'online'

### "OpenAI API error"
- Verify `OPENAI_API_KEY` is set correctly in Worker secrets
- Check OpenAI API key has Realtime API access
- Verify billing is active on OpenAI account

### WebSocket connection closes immediately
- Check Cloudflare Worker logs with `wrangler tail`
- Verify camera token is being sent in `X-Camera-Token` header
- Check OpenAI API status: https://status.openai.com/

## Custom Domain (Optional)

To use a custom subdomain (e.g., `wss://openai.heysalad.app`):

1. In Cloudflare dashboard: Workers & Pages → Your Worker → Triggers
2. Add Custom Domain
3. Update `CLOUDFLARE_WORKER_URL` in Vercel to use your custom domain
