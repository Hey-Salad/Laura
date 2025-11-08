# How to Merge AI Integration with Gimbal Dashboard

## Quick Method: Import Both Flows Separately

The easiest way is to import both flows into Node-RED side-by-side:

### Step 1: Import Dashboard Demo
1. Open Node-RED on reCamera
2. Menu (☰) → Import → Select your `gimbal-dashboard-demo.json`
3. Click Import

### Step 2: Import AI Integration
1. Menu (☰) → Import → Select `recamera-ai-integration-flow.json`
2. Click Import
3. This creates a new "HeySalad AI Integration" tab

### Step 3: Add AI Page to Dashboard
1. Double-click any UI node in the Dashboard Demo flow
2. Click the pencil icon next to the Page dropdown
3. Add a new page:
   - Name: "AI Assistant"
   - Path: `/ai-assistant`
   - Icon: `smart_toy`
   - Order: 3
4. Click "Add"

### Step 4: Deploy
Click the **Deploy** button

## Manual Merge Method (Advanced)

If you want a single integrated file:

### 1. Open Both JSON Files

```bash
# View AI Integration
cat recamera-ai-integration-flow.json

# View Dashboard Demo
cat gimbal-dashboard-demo.json
```

### 2. Merge Structure

The JSON structure is:
```json
[
  // Dashboard nodes...
  // AI Integration nodes...
  // Config nodes (at the end)...
]
```

### 3. Copy AI Nodes

From `recamera-ai-integration-flow.json`, copy all nodes EXCEPT the last one (`openai_ws_client`).

### 4. Add to Dashboard

Insert the copied nodes into your dashboard JSON array, before the config nodes (ui-group, ui-page, etc.).

### 5. Add WebSocket Config

At the very end of the array (after all ui-base and ui-theme nodes), add:

```json
{
  "id": "openai_ws_client",
  "type": "websocket-client",
  "path": "wss://heysalad-openai-proxy.heysalad-o.workers.dev/openai-realtime?token=cNf2w6BmZrItVdakHxqUkD7hY/y1swO0NGLBvtI0EXI=",
  "tls": "",
  "wholemsg": "true",
  "hb": "0",
  "subprotocol": ""
}
```

## Dashboard UI Integration

### Create AI Control Panel

Add this UI template node to your dashboard's Default Pages subflow:

```javascript
{
  "id": "ai_dashboard_control",
  "type": "ui-template",
  "z": "f7d5cf3810421cf3",  // Your Default Pages subflow ID
  "group": "YOUR_GROUP_ID",
  "page": "",
  "ui": "",
  "name": "AI Assistant Controls",
  "order": 6,
  "width": "12",
  "height": "6",
  "format": "<!-- Copy from recamera-complete-dashboard.json -->"
}
```

## Testing After Merge

### 1. Check Flow Tab
You should see a new tab: "HeySalad AI Integration"

### 2. Check Dashboard
Navigate to: `http://<recamera-ip>:1880/dashboard`

You should see new pages:
- Security
- Network
- Terminal
- System Update
- Power
- **AI Assistant** (new!)

### 3. Test AI Functions

In the AI Integration tab, click these inject nodes:
- **Test: Ask AI** - Sends mock detection to OpenAI
- **Test: TTS** - Tests speech synthesis
- **Test: Gimbal Left** - Tests gimbal control

### 4. Watch Debug Output

Open the Debug panel (bug icon) to see:
- ✅ AI configuration initialized
- 📍 WebSocket URL messages
- 🤖 AI responses
- 🎮 Gimbal commands

## Troubleshooting

### Issue: AI Tab Not Showing
**Fix**: The tab ID might conflict. Change `"z": "ai_integration_tab"` to a unique ID.

### Issue: WebSocket Not Connecting
**Fix**: Verify the token in the websocket-client node matches your camera token.

### Issue: Gimbal Commands Fail
**Fix**: Ensure `CAMERA_UUID` in the config matches your database UUID: `34236c48-2dae-4fe6-9bae-27e640f84d71`

### Issue: Dashboard Page Missing
**Fix**: Make sure you added the AI Assistant page in the UI configuration.

## File Reference

- **recamera-ai-integration-flow.json** - AI features only
- **recamera-complete-dashboard.json** - Merged starter (add your dashboard nodes)
- **gimbal-dashboard-demo.json** - Your original dashboard

## Configuration Values

Update these in the "Set AI Configuration" node:

```javascript
flow.set('CAMERA_ID', 'recamera-gimbal-001');
flow.set('CAMERA_UUID', '34236c48-2dae-4fe6-9bae-27e640f84d71');
flow.set('LAURA_API_URL', 'https://laura.heysalad.app');
flow.set('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM');
```

## Dashboard Navigation

After merging, your dashboard will have:

1. **Security** - Video feed and security monitoring
2. **Network** - Wi-Fi configuration
3. **AI Assistant** - AI controls (NEW!)
4. **System** - System info and updates
5. **Terminal** - Terminal access
6. **Power** - Power management

## Next Steps

1. Import flows to reCamera
2. Deploy and test
3. Access dashboard: `http://<recamera-ip>:1880/dashboard`
4. Navigate to AI Assistant page
5. Test AI functions

## Support

If you encounter issues:
1. Check Node-RED debug panel for errors
2. Verify all configuration values
3. Test each component separately (OpenAI, TTS, Gimbal)
4. Review [INTEGRATION_STATUS.md](INTEGRATION_STATUS.md) for API endpoints

Your integration is ready! The AI will automatically respond to object detections and control the gimbal based on OpenAI's responses.
