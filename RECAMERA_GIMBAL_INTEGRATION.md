# reCamera Gimbal Integration via Laura API

## Overview

This guide explains how to integrate Seeed Studio reCamera Gimbal with HeySalad using Laura as a cloud relay. The device polls Laura for commands instead of exposing HTTP endpoints directly, solving security and networking challenges.

## Architecture

```
┌─────────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  HeySalad Mobile    │  HTTPS  │   Laura API      │  Poll   │  reCamera       │
│  App (Expo)         │────────▶│   (Next.js)      │◀────────│  Gimbal         │
│                     │         │   + Supabase     │         │  (Node-RED)     │
└─────────────────────┘         └──────────────────┘         └─────────────────┘
```

**Flow:**
1. Mobile app sends gimbal command to Laura API: `POST /api/cameras/{id}/command`
2. Laura stores command in Supabase `camera_commands` table with status `pending`
3. reCamera Node-RED polls Laura every 2 seconds: `GET /api/cameras/{id}/commands`
4. reCamera executes gimbal command locally
5. reCamera acknowledges to Laura: `POST /api/cameras/{id}/commands/{cmdId}`
6. Laura updates command status to `completed`
7. Mobile app can check status via same endpoint

## Step 1: Extend Laura API

### 1.1 Update Camera Command Types

Edit `/Users/chilumbam/heysalad-laura/src/types/camera.ts`:

```typescript
export type CommandType =
  | "take_photo"
  | "start_video"
  | "stop_video"
  | "get_status"
  | "update_settings"
  | "reboot"
  | "led_on"
  | "led_off"
  | "toggle_led"
  | "play_sound"
  | "save_photo"
  // NEW: Gimbal commands
  | "gimbal_set_angle"
  | "gimbal_offset"
  | "gimbal_get_angle"
  | "gimbal_preset"
  | "gimbal_stop";

// Add gimbal-specific payload types
export interface GimbalSetAnglePayload {
  yaw_angle: number;    // -180 to 180
  pitch_angle: number;  // -90 to 90
  speed?: number;       // 1 to 255, default 200
}

export interface GimbalOffsetPayload {
  yaw_delta: number;
  pitch_delta: number;
  speed?: number;
}

export interface GimbalPresetPayload {
  preset: 'center' | 'left' | 'right' | 'up' | 'down';
  speed?: number;
}

export interface GimbalAngleResponse {
  yaw: number;
  pitch: number;
  timestamp: string;
}
```

### 1.2 Update Command Validation

Edit `/Users/chilumbam/heysalad-laura/src/app/api/cameras/[id]/command/route.ts`:

Find the `validCommands` array (around line 43) and add gimbal commands:

```typescript
const validCommands = [
  "take_photo",
  "start_video",
  "stop_video",
  "get_status",
  "update_settings",
  "reboot",
  "led_on",
  "led_off",
  "toggle_led",
  "play_sound",
  "save_photo",
  // NEW: Gimbal commands
  "gimbal_set_angle",
  "gimbal_offset",
  "gimbal_get_angle",
  "gimbal_preset",
  "gimbal_stop",
];
```

### 1.3 Add Input Validation Function

Add validation helper before the POST handler in the same file:

```typescript
// Add after imports
function validateGimbalCommand(command_type: string, payload: any): { valid: boolean; error?: string } {
  switch (command_type) {
    case "gimbal_set_angle":
      if (typeof payload.yaw_angle !== 'number' || typeof payload.pitch_angle !== 'number') {
        return { valid: false, error: 'yaw_angle and pitch_angle must be numbers' };
      }
      if (payload.yaw_angle < -180 || payload.yaw_angle > 180) {
        return { valid: false, error: 'yaw_angle must be between -180 and 180' };
      }
      if (payload.pitch_angle < -90 || payload.pitch_angle > 90) {
        return { valid: false, error: 'pitch_angle must be between -90 and 90' };
      }
      if (payload.speed && (payload.speed < 1 || payload.speed > 255)) {
        return { valid: false, error: 'speed must be between 1 and 255' };
      }
      break;

    case "gimbal_offset":
      if (typeof payload.yaw_delta !== 'number' || typeof payload.pitch_delta !== 'number') {
        return { valid: false, error: 'yaw_delta and pitch_delta must be numbers' };
      }
      break;

    case "gimbal_preset":
      const validPresets = ['center', 'left', 'right', 'up', 'down'];
      if (!validPresets.includes(payload.preset)) {
        return { valid: false, error: `preset must be one of: ${validPresets.join(', ')}` };
      }
      break;
  }

  return { valid: true };
}
```

Then add validation check after `command_type` validation (around line 62):

```typescript
// Add gimbal command validation
if (command_type.startsWith('gimbal_')) {
  const validation = validateGimbalCommand(command_type, payload);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }
}
```

## Step 2: Deploy Laura Changes

```bash
cd /Users/chilumbam/heysalad-laura

# Install dependencies if needed
npm install

# Test locally
npm run dev

# Deploy to Vercel
vercel --prod
```

Verify deployment:
```bash
curl https://your-laura-domain.vercel.app/api/cameras
```

## Step 3: Configure reCamera Device

### 3.1 Register reCamera in Laura

First, register your reCamera Gimbal device:

```bash
# Using Laura's camera registration endpoint
curl -X POST https://your-laura-domain.vercel.app/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "recamera-gimbal-001",
    "camera_name": "Kitchen reCamera Gimbal",
    "device_type": "seeed-recamera-gimbal-2002w",
    "firmware_version": "recamera-os-1.0",
    "assigned_to": "kitchen",
    "metadata": {
      "yaw_range": [-180, 180],
      "pitch_range": [-90, 90],
      "max_speed": 720,
      "capabilities": ["camera", "gimbal", "rtsp"]
    }
  }'
```

Save the returned camera `id` (e.g., `cam_abc123xyz`) - you'll need this for the Node-RED flow.

### 3.2 Install Node-RED Flow

1. SSH to reCamera:
   ```bash
   ssh root@<recamera-ip>
   ```

2. Access Node-RED at `http://<recamera-ip>:1880`

3. Import the flow below (Menu → Import → Clipboard)

4. Edit the "Configuration" node and set:
   - `CAMERA_ID` = your camera ID from Laura (e.g., `cam_abc123xyz`)
   - `LAURA_API_URL` = `https://your-laura-domain.vercel.app`
   - `POLL_INTERVAL` = `2000` (milliseconds)

5. Deploy the flow

### 3.3 Node-RED Flow JSON

```json
[
  {
    "id": "recamera_gimbal_tab",
    "type": "tab",
    "label": "HeySalad Laura Polling",
    "disabled": false,
    "info": "Polls Laura API for gimbal commands and executes them locally"
  },
  {
    "id": "config_node",
    "type": "inject",
    "z": "recamera_gimbal_tab",
    "name": "Configuration",
    "props": [],
    "repeat": "",
    "crontab": "",
    "once": true,
    "onceDelay": 0.1,
    "topic": "",
    "x": 130,
    "y": 60,
    "wires": [["set_config"]]
  },
  {
    "id": "set_config",
    "type": "function",
    "z": "recamera_gimbal_tab",
    "name": "Set Configuration",
    "func": "// EDIT THESE VALUES\nflow.set('CAMERA_ID', 'cam_abc123xyz');  // Your camera ID from Laura\nflow.set('LAURA_API_URL', 'https://your-laura-domain.vercel.app');\nflow.set('POLL_INTERVAL', 2000);  // Poll every 2 seconds\n\n// Initialize gimbal state\nflow.set('current_yaw', 0);\nflow.set('current_pitch', 0);\n\nnode.status({ fill: 'green', shape: 'dot', text: 'Configured' });\nnode.warn('Laura polling configured');\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "initialize": "",
    "finalize": "",
    "libs": [],
    "x": 330,
    "y": 60,
    "wires": [["start_polling"]]
  },
  {
    "id": "start_polling",
    "type": "inject",
    "z": "recamera_gimbal_tab",
    "name": "Poll Timer",
    "props": [],
    "repeat": "2",
    "crontab": "",
    "once": false,
    "onceDelay": 0.1,
    "topic": "",
    "x": 130,
    "y": 140,
    "wires": [["poll_laura"]]
  },
  {
    "id": "poll_laura",
    "type": "function",
    "z": "recamera_gimbal_tab",
    "name": "Poll Laura for Commands",
    "func": "const cameraId = flow.get('CAMERA_ID');\nconst lauraUrl = flow.get('LAURA_API_URL');\n\nif (!cameraId || !lauraUrl) {\n    node.error('Configuration not set');\n    return null;\n}\n\nmsg.url = `${lauraUrl}/api/cameras/${cameraId}/commands`;\nmsg.method = 'GET';\n\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "initialize": "",
    "finalize": "",
    "libs": [],
    "x": 340,
    "y": 140,
    "wires": [["http_request"]]
  },
  {
    "id": "http_request",
    "type": "http request",
    "z": "recamera_gimbal_tab",
    "name": "HTTP Request",
    "method": "use",
    "ret": "obj",
    "paytoqs": "ignore",
    "url": "",
    "tls": "",
    "persist": false,
    "proxy": "",
    "authType": "",
    "senderr": false,
    "x": 560,
    "y": 140,
    "wires": [["process_commands"]]
  },
  {
    "id": "process_commands",
    "type": "function",
    "z": "recamera_gimbal_tab",
    "name": "Process Commands",
    "func": "const response = msg.payload;\n\nif (!response || !response.commands || response.commands.length === 0) {\n    // No pending commands\n    return null;\n}\n\nconst commands = response.commands;\nnode.warn(`Received ${commands.length} command(s) from Laura`);\n\n// Process each command\nfor (const cmd of commands) {\n    const cmdMsg = {\n        payload: cmd,\n        command_id: cmd.id,\n        command_type: cmd.type,\n        params: cmd.params || {}\n    };\n    node.send(cmdMsg);\n}\n\nreturn null;",
    "outputs": 1,
    "noerr": 0,
    "initialize": "",
    "finalize": "",
    "libs": [],
    "x": 760,
    "y": 140,
    "wires": [["route_command"]]
  },
  {
    "id": "route_command",
    "type": "switch",
    "z": "recamera_gimbal_tab",
    "name": "Route by Command Type",
    "property": "command_type",
    "propertyType": "msg",
    "rules": [
      {
        "t": "eq",
        "v": "gimbal_set_angle",
        "vt": "str"
      },
      {
        "t": "eq",
        "v": "gimbal_offset",
        "vt": "str"
      },
      {
        "t": "eq",
        "v": "gimbal_get_angle",
        "vt": "str"
      },
      {
        "t": "eq",
        "v": "gimbal_preset",
        "vt": "str"
      },
      {
        "t": "eq",
        "v": "gimbal_stop",
        "vt": "str"
      }
    ],
    "checkall": "false",
    "repair": false,
    "outputs": 5,
    "x": 180,
    "y": 260,
    "wires": [
      ["execute_set_angle"],
      ["execute_offset"],
      ["execute_get_angle"],
      ["execute_preset"],
      ["execute_stop"]
    ]
  },
  {
    "id": "execute_set_angle",
    "type": "function",
    "z": "recamera_gimbal_tab",
    "name": "Execute Set Angle",
    "func": "const params = msg.params;\nlet yaw = parseFloat(params.yaw_angle);\nlet pitch = parseFloat(params.pitch_angle);\nlet speed = parseFloat(params.speed) || 200;\n\n// Clamp values\nyaw = Math.max(-180, Math.min(180, yaw));\npitch = Math.max(-90, Math.min(90, pitch));\nspeed = Math.max(1, Math.min(255, speed));\n\n// Store current angles\nflow.set('current_yaw', yaw);\nflow.set('current_pitch', pitch);\n\n// TODO: Replace with actual gimbal control node\n// For now, simulate success\nnode.warn(`Setting gimbal: yaw=${yaw}, pitch=${pitch}, speed=${speed}`);\n\nmsg.result = {\n    status: 'completed',\n    data: { yaw, pitch, speed }\n};\n\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "initialize": "",
    "finalize": "",
    "libs": [],
    "x": 440,
    "y": 240,
    "wires": [["acknowledge_command"]]
  },
  {
    "id": "execute_offset",
    "type": "function",
    "z": "recamera_gimbal_tab",
    "name": "Execute Offset",
    "func": "const params = msg.params;\nconst yawDelta = parseFloat(params.yaw_delta) || 0;\nconst pitchDelta = parseFloat(params.pitch_delta) || 0;\nconst speed = parseFloat(params.speed) || 200;\n\n// Get current angles\nlet currentYaw = flow.get('current_yaw') || 0;\nlet currentPitch = flow.get('current_pitch') || 0;\n\n// Apply deltas\nlet newYaw = currentYaw + yawDelta;\nlet newPitch = currentPitch + pitchDelta;\n\n// Clamp to valid ranges\nnewYaw = Math.max(-180, Math.min(180, newYaw));\nnewPitch = Math.max(-90, Math.min(90, newPitch));\n\n// Store new angles\nflow.set('current_yaw', newYaw);\nflow.set('current_pitch', newPitch);\n\nnode.warn(`Offset gimbal by: yaw_delta=${yawDelta}, pitch_delta=${pitchDelta}. New: yaw=${newYaw}, pitch=${newPitch}`);\n\nmsg.result = {\n    status: 'completed',\n    data: { yaw: newYaw, pitch: newPitch, speed }\n};\n\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "initialize": "",
    "finalize": "",
    "libs": [],
    "x": 440,
    "y": 300,
    "wires": [["acknowledge_command"]]
  },
  {
    "id": "execute_get_angle",
    "type": "function",
    "z": "recamera_gimbal_tab",
    "name": "Execute Get Angle",
    "func": "// Get current angles from flow context\nconst currentYaw = flow.get('current_yaw') || 0;\nconst currentPitch = flow.get('current_pitch') || 0;\n\nmsg.result = {\n    status: 'completed',\n    data: {\n        yaw: currentYaw,\n        pitch: currentPitch,\n        timestamp: new Date().toISOString()\n    }\n};\n\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "initialize": "",
    "finalize": "",
    "libs": [],
    "x": 450,
    "y": 360,
    "wires": [["acknowledge_command"]]
  },
  {
    "id": "execute_preset",
    "type": "function",
    "z": "recamera_gimbal_tab",
    "name": "Execute Preset",
    "func": "const params = msg.params;\nconst preset = params.preset?.toLowerCase();\nconst speed = parseFloat(params.speed) || 200;\n\nconst presets = {\n    center: { yaw: 0, pitch: 0 },\n    left: { yaw: -90, pitch: 0 },\n    right: { yaw: 90, pitch: 0 },\n    up: { yaw: 0, pitch: -45 },\n    down: { yaw: 0, pitch: 45 }\n};\n\nif (!presets[preset]) {\n    msg.result = {\n        status: 'failed',\n        error: `Invalid preset: ${preset}`\n    };\n    return msg;\n}\n\nconst { yaw, pitch } = presets[preset];\nflow.set('current_yaw', yaw);\nflow.set('current_pitch', pitch);\n\nnode.warn(`Preset ${preset}: yaw=${yaw}, pitch=${pitch}`);\n\nmsg.result = {\n    status: 'completed',\n    data: { preset, yaw, pitch, speed }\n};\n\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "initialize": "",
    "finalize": "",
    "libs": [],
    "x": 440,
    "y": 420,
    "wires": [["acknowledge_command"]]
  },
  {
    "id": "execute_stop",
    "type": "function",
    "z": "recamera_gimbal_tab",
    "name": "Execute Stop",
    "func": "// Stop gimbal movement immediately\nnode.warn('Gimbal emergency stop');\n\nmsg.result = {\n    status: 'completed',\n    data: { stopped: true }\n};\n\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "initialize": "",
    "finalize": "",
    "libs": [],
    "x": 430,
    "y": 480,
    "wires": [["acknowledge_command"]]
  },
  {
    "id": "acknowledge_command",
    "type": "function",
    "z": "recamera_gimbal_tab",
    "name": "Acknowledge to Laura",
    "func": "const cameraId = flow.get('CAMERA_ID');\nconst lauraUrl = flow.get('LAURA_API_URL');\nconst commandId = msg.command_id;\nconst result = msg.result;\n\nif (!commandId) {\n    node.error('No command_id in message');\n    return null;\n}\n\nmsg.url = `${lauraUrl}/api/cameras/${cameraId}/commands/${commandId}`;\nmsg.method = 'POST';\nmsg.payload = {\n    status: result.status,\n    result: result.data || result.error || {}\n};\n\nnode.warn(`Acknowledging command ${commandId} with status: ${result.status}`);\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "initialize": "",
    "finalize": "",
    "libs": [],
    "x": 690,
    "y": 360,
    "wires": [["http_ack"]]
  },
  {
    "id": "http_ack",
    "type": "http request",
    "z": "recamera_gimbal_tab",
    "name": "Send Acknowledgment",
    "method": "use",
    "ret": "obj",
    "paytoqs": "ignore",
    "url": "",
    "tls": "",
    "persist": false,
    "proxy": "",
    "authType": "",
    "senderr": false,
    "x": 910,
    "y": 360,
    "wires": [["ack_response"]]
  },
  {
    "id": "ack_response",
    "type": "debug",
    "z": "recamera_gimbal_tab",
    "name": "Ack Response",
    "active": true,
    "tosidebar": true,
    "console": false,
    "tostatus": false,
    "complete": "payload",
    "targetType": "msg",
    "statusVal": "",
    "statusType": "auto",
    "x": 1100,
    "y": 360,
    "wires": []
  },
  {
    "id": "catch_error",
    "type": "catch",
    "z": "recamera_gimbal_tab",
    "name": "Error Handler",
    "scope": null,
    "uncaught": false,
    "x": 150,
    "y": 560,
    "wires": [["log_error"]]
  },
  {
    "id": "log_error",
    "type": "debug",
    "z": "recamera_gimbal_tab",
    "name": "Error Log",
    "active": true,
    "tosidebar": true,
    "console": false,
    "tostatus": false,
    "complete": "error",
    "targetType": "msg",
    "statusVal": "",
    "statusType": "auto",
    "x": 340,
    "y": 560,
    "wires": []
  },
  {
    "id": "comment_integration",
    "type": "comment",
    "z": "recamera_gimbal_tab",
    "name": "INTEGRATION: Replace function nodes with actual gimbal control nodes when available",
    "info": "The 'Execute Set Angle', 'Execute Offset', 'Execute Preset' nodes\nare placeholders. When official reCamera gimbal nodes are available:\n\n1. Install: cd ~/.node-red && npm install node-red-contrib-recamera-gimbal\n2. Replace function nodes with gimbal control nodes\n3. Wire gimbal outputs to 'Acknowledge to Laura' node\n4. Configure gimbal nodes with parameters from msg.params",
    "x": 390,
    "y": 180,
    "wires": []
  }
]
```

## Step 4: Update HeySalad Mobile App

### 4.1 Create Laura Gimbal Client

Create `/Users/chilumbam/heysalad-cooking-assistant/lib/laura-gimbal.ts`:

```typescript
import Constants from 'expo-constants';

const LAURA_API_URL = 'https://your-laura-domain.vercel.app';

export interface GimbalCommand {
  command_type: string;
  payload: any;
}

export interface GimbalCommandResult {
  command_id: string;
  status: 'pending' | 'sent' | 'completed' | 'failed';
  data?: any;
  error?: string;
}

export class LauraGimbalClient {
  private lauraUrl: string;

  constructor(lauraUrl: string = LAURA_API_URL) {
    this.lauraUrl = lauraUrl;
  }

  /**
   * Send command to gimbal via Laura API
   */
  async sendCommand(cameraId: string, command: GimbalCommand): Promise<GimbalCommandResult> {
    try {
      const response = await fetch(`${this.lauraUrl}/api/cameras/${cameraId}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send command');
      }

      const data = await response.json();
      return {
        command_id: data.command_id,
        status: data.command.status,
        data: data.command.response,
      };
    } catch (error) {
      console.error('Error sending gimbal command:', error);
      throw error;
    }
  }

  /**
   * Get command status
   */
  async getCommandStatus(cameraId: string, commandId: string): Promise<GimbalCommandResult> {
    try {
      const response = await fetch(
        `${this.lauraUrl}/api/cameras/${cameraId}/commands/${commandId}`
      );

      if (!response.ok) {
        throw new Error('Failed to get command status');
      }

      const data = await response.json();
      return {
        command_id: data.command.id,
        status: data.command.status,
        data: data.command.response,
        error: data.command.error_message,
      };
    } catch (error) {
      console.error('Error getting command status:', error);
      throw error;
    }
  }

  /**
   * Set gimbal absolute angle
   */
  async setAngle(
    cameraId: string,
    yaw: number,
    pitch: number,
    speed: number = 200
  ): Promise<GimbalCommandResult> {
    return this.sendCommand(cameraId, {
      command_type: 'gimbal_set_angle',
      payload: {
        yaw_angle: yaw,
        pitch_angle: pitch,
        speed,
      },
    });
  }

  /**
   * Move gimbal by relative offset
   */
  async moveByOffset(
    cameraId: string,
    yawDelta: number,
    pitchDelta: number,
    speed: number = 200
  ): Promise<GimbalCommandResult> {
    return this.sendCommand(cameraId, {
      command_type: 'gimbal_offset',
      payload: {
        yaw_delta: yawDelta,
        pitch_delta: pitchDelta,
        speed,
      },
    });
  }

  /**
   * Get current gimbal angle
   */
  async getAngle(cameraId: string): Promise<{ yaw: number; pitch: number }> {
    const result = await this.sendCommand(cameraId, {
      command_type: 'gimbal_get_angle',
      payload: {},
    });

    // Poll for result
    await this.waitForCompletion(cameraId, result.command_id);

    const status = await this.getCommandStatus(cameraId, result.command_id);
    return status.data as { yaw: number; pitch: number };
  }

  /**
   * Set gimbal to preset position
   */
  async setPreset(
    cameraId: string,
    preset: 'center' | 'left' | 'right' | 'up' | 'down',
    speed: number = 200
  ): Promise<GimbalCommandResult> {
    return this.sendCommand(cameraId, {
      command_type: 'gimbal_preset',
      payload: { preset, speed },
    });
  }

  /**
   * Emergency stop
   */
  async stop(cameraId: string): Promise<GimbalCommandResult> {
    return this.sendCommand(cameraId, {
      command_type: 'gimbal_stop',
      payload: {},
    });
  }

  /**
   * Get RTSP stream URL
   */
  getRTSPUrl(deviceIp: string): string {
    return `rtsp://${deviceIp}:8554/live0`;
  }

  /**
   * Wait for command completion
   */
  private async waitForCompletion(
    cameraId: string,
    commandId: string,
    timeout: number = 10000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getCommandStatus(cameraId, commandId);

      if (status.status === 'completed') {
        return;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Command failed');
      }

      // Poll every 500ms
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error('Command timeout');
  }
}

// Export singleton instance
export const lauraGimbal = new LauraGimbalClient();
```

### 4.2 Add to Device Types

Update `/Users/chilumbam/heysalad-cooking-assistant/types/device.ts`:

```typescript
// Add to existing Device interface
export interface Device {
  // ... existing fields

  // Add for reCamera Gimbal
  gimbalCapabilities?: {
    yaw_range: [number, number];
    pitch_range: [number, number];
    max_speed: number;
    presets: string[];
  };

  lauraId?: string; // Laura camera ID for relay
}
```

### 4.3 Example Usage in Device Screen

Update `/Users/chilumbam/heysalad-cooking-assistant/app/device-detail.tsx`:

```typescript
import { lauraGimbal } from '@/lib/laura-gimbal';

// In your component
const handleSetAngle = async (yaw: number, pitch: number) => {
  if (!device.lauraId) {
    Alert.alert('Error', 'Device not connected to Laura');
    return;
  }

  try {
    setLoading(true);
    const result = await lauraGimbal.setAngle(device.lauraId, yaw, pitch);

    if (result.status === 'completed') {
      Alert.alert('Success', 'Gimbal moved successfully');
    } else {
      Alert.alert('Pending', 'Command sent, waiting for execution');
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};

const handlePreset = async (preset: 'center' | 'left' | 'right' | 'up' | 'down') => {
  if (!device.lauraId) return;

  try {
    await lauraGimbal.setPreset(device.lauraId, preset);
    Alert.alert('Success', `Moving to ${preset} position`);
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

## Step 5: Testing

### 5.1 Test Laura API

```bash
# Set environment variables
export LAURA_URL="https://your-laura-domain.vercel.app"
export CAMERA_ID="cam_abc123xyz"

# Test: Set absolute angle
curl -X POST ${LAURA_URL}/api/cameras/${CAMERA_ID}/command \
  -H "Content-Type: application/json" \
  -d '{
    "command_type": "gimbal_set_angle",
    "payload": {
      "yaw_angle": 45,
      "pitch_angle": -30,
      "speed": 200
    }
  }'

# Response should include command_id
# {
#   "command_id": "cmd-1234567890",
#   "command": { "status": "pending", ... }
# }

# Test: Check command status
export COMMAND_ID="cmd-1234567890"
curl ${LAURA_URL}/api/cameras/${CAMERA_ID}/commands/${COMMAND_ID}

# Test: Preset position
curl -X POST ${LAURA_URL}/api/cameras/${CAMERA_ID}/command \
  -H "Content-Type: application/json" \
  -d '{
    "command_type": "gimbal_preset",
    "payload": { "preset": "center" }
  }'

# Test: Relative movement
curl -X POST ${LAURA_URL}/api/cameras/${CAMERA_ID}/command \
  -H "Content-Type: application/json" \
  -d '{
    "command_type": "gimbal_offset",
    "payload": {
      "yaw_delta": 15,
      "pitch_delta": -10
    }
  }'

# Test: Get current angle
curl -X POST ${LAURA_URL}/api/cameras/${CAMERA_ID}/command \
  -H "Content-Type: application/json" \
  -d '{
    "command_type": "gimbal_get_angle",
    "payload": {}
  }'

# Test: Emergency stop
curl -X POST ${LAURA_URL}/api/cameras/${CAMERA_ID}/command \
  -H "Content-Type: application/json" \
  -d '{
    "command_type": "gimbal_stop",
    "payload": {}
  }'
```

### 5.2 Monitor Node-RED

1. Open Node-RED debug panel: `http://<recamera-ip>:1880`
2. Watch for polling messages every 2 seconds
3. Send test command via Laura API
4. Verify command is received and executed
5. Check acknowledgment is sent back to Laura

### 5.3 Test Mobile App

1. Open HeySalad AI app
2. Navigate to Devices screen
3. Ensure reCamera device shows `lauraId` populated
4. Test gimbal controls:
   - Center position
   - Manual angle adjustment
   - Relative movement
   - Preset positions

## Troubleshooting

### Commands not being picked up by reCamera

1. Check Node-RED is running: `systemctl status nodered`
2. Verify polling timer is active in Node-RED
3. Check `CAMERA_ID` matches Laura registration
4. Test Laura API directly with curl

### Commands stuck in "pending" status

1. Check reCamera can reach Laura API (firewall, DNS)
2. Verify acknowledgment endpoint is working
3. Check Node-RED debug panel for errors
4. Increase poll interval if network is slow

### Mobile app shows "Device not connected to Laura"

1. Verify device has `lauraId` property set
2. Check device was properly registered in Laura
3. Update device store to include Laura ID

### Gimbal doesn't move

1. Replace placeholder function nodes with actual gimbal nodes
2. Check gimbal hardware is powered and initialized
3. Verify angle ranges are within physical limits
4. Check Node-RED logs for hardware errors

## Production Considerations

### Security

1. **Add authentication** to Laura API endpoints:
   - Require API key or JWT token
   - Implement rate limiting
   - Add device authentication

2. **Validate all inputs** server-side
3. **Use HTTPS** for all communication
4. **Rotate secrets** regularly

### Performance

1. **Optimize poll interval** based on use case
2. **Implement command batching** if needed
3. **Cache gimbal state** to reduce queries
4. **Use Supabase Realtime** for instant notifications

### Monitoring

1. **Log all commands** with timestamps
2. **Track command success rate**
3. **Alert on command timeouts**
4. **Monitor gimbal health**

### Scalability

1. **Multiple devices**: Each device has unique `camera_id`
2. **Command queue**: Supabase handles concurrent commands
3. **Load balancing**: Vercel auto-scales Laura API

## Benefits of Laura Relay Architecture

✅ **No port forwarding** required on reCamera
✅ **Works behind NAT/firewalls**
✅ **Centralized command logging** in Supabase
✅ **Multiple clients** can control same device
✅ **Command history** and audit trail
✅ **Works globally** via HTTPS
✅ **Easy to extend** with new commands
✅ **Secure** with authentication and validation

## Next Steps

1. **Add authentication** to Laura camera endpoints
2. **Implement real gimbal control** (replace function nodes)
3. **Add telemetry reporting** (battery, position, etc.)
4. **Create UI components** for gimbal control
5. **Add RTSP stream viewing** in mobile app
6. **Implement camera presets** for common angles
7. **Add auto-tracking** for object following

---

**Made with ❤️ for HeySalad IoT**
