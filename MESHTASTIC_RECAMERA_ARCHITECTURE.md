# Meshtastic & Recamera Architecture Design

## Overview

This document outlines the integration architecture for Meshtastic IoT devices and Recamera AI-powered video surveillance for the HeySalad Laura logistics platform.

---

## 1. Meshtastic Integration

### What is Meshtastic?
Meshtastic is an open-source, off-grid, decentralized mesh network built for long-range communication using LoRa radios. Perfect for tracking delivery baskets in areas with poor cellular coverage.

### Architecture

```
┌─────────────────┐
│  Meshtastic     │
│  Device (LoRa)  │ ──┐
└─────────────────┘   │
                      │
┌─────────────────┐   │    ┌──────────────────┐
│  Meshtastic     │   │    │  MQTT Broker     │
│  Device (LoRa)  │ ──┼───▶│  (Mosquitto)     │
└─────────────────┘   │    │  Port: 1883      │
                      │    └──────────────────┘
┌─────────────────┐   │             │
│  Meshtastic     │   │             │
│  Device (LoRa)  │ ──┘             │
└─────────────────┘                 │
                                    ▼
                          ┌──────────────────┐
                          │  Laura Backend   │
                          │  MQTT Client     │
                          │  (Node.js)       │
                          └──────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │  Supabase DB     │
                          │  + Realtime      │
                          └──────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │  Laura Frontend  │
                          │  (Next.js)       │
                          └──────────────────┘
```

### Communication Protocol

**Option 1: MQTT Bridge (Recommended)**

Meshtastic devices support MQTT natively. This is the simplest approach.

```javascript
// Backend MQTT Client (Node.js)
// File: src/services/meshtastic-mqtt.ts

import mqtt from 'mqtt';
import { createClient } from '@supabase/supabase-js';

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_TOPIC = 'msh/+/json/#'; // Subscribe to all Meshtastic JSON messages

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

class MeshtasticService {
  private client: mqtt.MqttClient;

  constructor() {
    this.client = mqtt.connect(MQTT_BROKER, {
      clientId: `laura-${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      this.client.subscribe(MQTT_TOPIC, (err) => {
        if (err) console.error('MQTT subscription error:', err);
      });
    });

    this.client.on('message', this.handleMessage.bind(this));
  }

  private async handleMessage(topic: string, message: Buffer) {
    try {
      const data = JSON.parse(message.toString());
      console.log('Meshtastic message:', { topic, data });

      // Extract device info from topic
      // Topic format: msh/{deviceId}/json/{messageType}
      const parts = topic.split('/');
      const deviceId = parts[1];
      const messageType = parts[3];

      // Handle different message types
      switch (messageType) {
        case 'position':
          await this.handlePositionUpdate(deviceId, data);
          break;
        case 'telemetry':
          await this.handleTelemetry(deviceId, data);
          break;
        case 'nodeinfo':
          await this.handleNodeInfo(deviceId, data);
          break;
      }
    } catch (error) {
      console.error('Error processing Meshtastic message:', error);
    }
  }

  private async handlePositionUpdate(deviceId: string, data: any) {
    const { latitude, longitude, altitude, time } = data.payload;

    // Find device by device_id
    const { data: device } = await supabase
      .from('devices')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (!device) {
      console.warn(`Device ${deviceId} not found in database`);
      return;
    }

    // Update device location
    await supabase
      .from('devices')
      .update({
        location_lat: latitude,
        location_lon: longitude,
        last_seen: new Date().toISOString(),
      })
      .eq('id', device.id);

    // Insert telemetry record
    await supabase.from('device_telemetry').insert({
      device_id: device.id,
      location_lat: latitude,
      location_lon: longitude,
      altitude,
      timestamp: new Date(time * 1000).toISOString(),
    });
  }

  private async handleTelemetry(deviceId: string, data: any) {
    const { batteryLevel, voltage, temperature, airUtilTx } = data.payload;

    const { data: device } = await supabase
      .from('devices')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (!device) return;

    // Post to our telemetry API endpoint
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/devices/${device.id}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        battery_level: batteryLevel,
        voltage,
        temperature,
        signal_strength: airUtilTx,
      }),
    });
  }

  private async handleNodeInfo(deviceId: string, data: any) {
    const { longname, hardware, firmware } = data.payload;

    const { data: device } = await supabase
      .from('devices')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (!device) {
      // Create new device if doesn't exist
      await supabase.from('devices').insert({
        device_id: deviceId,
        device_name: longname || deviceId,
        hardware_model: hardware,
        firmware_version: firmware,
        status: 'active',
      });
    }
  }

  // Send command to device
  async sendCommand(deviceId: string, command: any) {
    const topic = `msh/${deviceId}/json/command`;
    return new Promise((resolve, reject) => {
      this.client.publish(topic, JSON.stringify(command), (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }
}

export const meshtasticService = new MeshtasticService();
```

**Option 2: Serial/USB Gateway**

If you have a Meshtastic device connected via USB to your server:

```javascript
// Serial connection to Meshtastic device
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const port = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 115200,
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

parser.on('data', (line) => {
  try {
    const data = JSON.parse(line);
    // Process Meshtastic message
  } catch (error) {
    console.error('Error parsing serial data:', error);
  }
});
```

### Deployment

**Docker Compose Setup**

```yaml
# docker-compose.yml
version: '3.8'

services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log

  laura-backend:
    build: .
    environment:
      - MQTT_BROKER_URL=mqtt://mosquitto:1883
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    depends_on:
      - mosquitto
    restart: unless-stopped
```

**Mosquitto Config**

```conf
# mosquitto/config/mosquitto.conf
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
```

### Environment Variables

Add to `.env.local`:

```bash
# Meshtastic MQTT Configuration
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=          # Optional
MQTT_PASSWORD=          # Optional
MESHTASTIC_GATEWAY_ID=  # Your gateway device ID
```

---

## 2. Recamera Integration

### What is Recamera?
AI-powered camera system for monitoring delivery baskets, driver behavior, and warehouse operations using computer vision.

### Architecture

```
┌─────────────────┐
│  Recamera       │
│  (IP Camera)    │
│  RTSP Stream    │
└─────────────────┘
         │
         │ RTSP://camera-ip:554/stream
         ▼
┌─────────────────────────┐
│  FFmpeg Transcoder      │
│  (Converts RTSP → HLS)  │
└─────────────────────────┘
         │
         │ WebSocket (video chunks)
         ▼
┌─────────────────────────┐
│  Socket.IO Server       │
│  (Laura Backend)        │
└─────────────────────────┘
         │
         │ Socket.IO
         ▼
┌─────────────────────────┐
│  Laura Frontend         │
│  (Video Player)         │
└─────────────────────────┘

         ┌────────────────────────────┐
         │  AI Model Inference        │
         │  (Object Detection)        │
         │  - YOLOv8                  │
         │  - TensorFlow.js           │
         └────────────────────────────┘
                    │
                    │ API POST (model results)
                    ▼
         ┌─────────────────────┐
         │  /api/recamera/     │
         │  inference          │
         └─────────────────────┘
```

### Backend Implementation

#### Install Dependencies

```bash
npm install socket.io fluent-ffmpeg @tensorflow/tfjs-node
```

#### Socket.IO Server

```typescript
// src/services/recamera-socket.ts

import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import ffmpeg from 'fluent-ffmpeg';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class RecameraService {
  private io: Server;
  private streams: Map<string, any> = new Map();

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        methods: ['GET', 'POST'],
      },
      path: '/socket.io',
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Client requests to start streaming from a camera
      socket.on('start-stream', async ({ cameraId, rtspUrl }) => {
        console.log(`Starting stream for camera ${cameraId}`);

        // Verify camera exists and user has permission
        const { data: camera } = await supabase
          .from('cameras')
          .select('*')
          .eq('id', cameraId)
          .single();

        if (!camera) {
          socket.emit('error', { message: 'Camera not found' });
          return;
        }

        this.startVideoStream(socket, cameraId, rtspUrl || camera.rtsp_url);
      });

      socket.on('stop-stream', ({ cameraId }) => {
        this.stopVideoStream(cameraId);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Clean up streams
        this.streams.forEach((stream, cameraId) => {
          if (stream.socketId === socket.id) {
            this.stopVideoStream(cameraId);
          }
        });
      });
    });
  }

  private startVideoStream(socket: any, cameraId: string, rtspUrl: string) {
    // Stop existing stream if any
    if (this.streams.has(cameraId)) {
      this.stopVideoStream(cameraId);
    }

    // Use FFmpeg to transcode RTSP to WebSocket-friendly format
    const stream = ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-analyzeduration', '1000000',
        '-probesize', '1000000',
      ])
      .outputOptions([
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-b:v', '1000k',
        '-r', '30',
        '-codec:a', 'mp2',
        '-ar', '44100',
        '-ac', '1',
        '-b:a', '128k',
      ])
      .on('start', () => {
        console.log(`FFmpeg started for camera ${cameraId}`);
      })
      .on('error', (err) => {
        console.error(`FFmpeg error for camera ${cameraId}:`, err);
        socket.emit('stream-error', { cameraId, error: err.message });
        this.streams.delete(cameraId);
      })
      .on('end', () => {
        console.log(`FFmpeg ended for camera ${cameraId}`);
        this.streams.delete(cameraId);
      });

    // Pipe video data to socket
    const outputStream = stream.pipe();
    outputStream.on('data', (chunk: Buffer) => {
      socket.emit('video-data', {
        cameraId,
        data: chunk.toString('base64'),
      });
    });

    this.streams.set(cameraId, {
      socketId: socket.id,
      stream,
      outputStream,
    });
  }

  private stopVideoStream(cameraId: string) {
    const streamData = this.streams.get(cameraId);
    if (streamData) {
      streamData.stream.kill('SIGKILL');
      streamData.outputStream.destroy();
      this.streams.delete(cameraId);
      console.log(`Stopped stream for camera ${cameraId}`);
    }
  }
}
```

#### API Endpoint for Model Inference

```typescript
// src/app/api/recamera/inference/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * POST /api/recamera/inference
 * Receives AI model inference results from frontend or edge device
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await request.json();
    const {
      camera_id,
      frame_timestamp,
      detections, // Array of detected objects
      metadata,
    } = body;

    // Validate required fields
    if (!camera_id || !detections) {
      return NextResponse.json(
        { error: 'camera_id and detections are required' },
        { status: 400 }
      );
    }

    // Store inference results
    const { data, error } = await supabase
      .from('recamera_inferences')
      .insert({
        camera_id,
        frame_timestamp: frame_timestamp || new Date().toISOString(),
        detections,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing inference:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check for alerts based on detections
    await checkForAlerts(supabase, camera_id, detections);

    return NextResponse.json({ success: true, inference: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function checkForAlerts(supabase: any, cameraId: string, detections: any[]) {
  // Example: Check for person detected in restricted area
  const personDetections = detections.filter((d) => d.class === 'person');

  if (personDetections.length > 0) {
    // Create alert
    await supabase.from('camera_alerts').insert({
      camera_id: cameraId,
      alert_type: 'person_detected',
      severity: 'warning',
      message: `${personDetections.length} person(s) detected`,
      metadata: { detections: personDetections },
    });
  }

  // Add more custom alert logic here
  // - Package tampering detection
  // - Driver behavior monitoring
  // - Basket left unattended
}
```

### Frontend Implementation

#### Video Player Component

```typescript
// src/components/recamera/VideoPlayer.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type VideoPlayerProps = {
  cameraId: string;
  rtspUrl: string;
};

export const VideoPlayer = ({ cameraId, rtspUrl }: VideoPlayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Connect to Socket.IO server
    socketRef.current = io(process.env.NEXT_PUBLIC_APP_URL || '', {
      path: '/socket.io',
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);
      // Request stream
      socketRef.current?.emit('start-stream', { cameraId, rtspUrl });
    });

    socketRef.current.on('video-data', ({ data }) => {
      // Decode base64 and render to canvas
      const videoData = atob(data);
      // Use jsmpeg or similar library to decode MPEG-TS
      // and render to canvas
    });

    socketRef.current.on('stream-error', ({ error }) => {
      setError(error);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socketRef.current?.emit('stop-stream', { cameraId });
      socketRef.current?.disconnect();
    };
  }, [cameraId, rtspUrl]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full h-auto bg-black rounded-lg" />
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <p className="text-white">Connecting...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
};
```

#### AI Model Inference (Client-Side)

```typescript
// src/utils/ai-inference.ts
import * as tf from '@tensorflow/tfjs';

let model: tf.GraphModel | null = null;

export async function loadModel() {
  if (!model) {
    model = await tf.loadGraphModel('/models/yolov8/model.json');
  }
  return model;
}

export async function detectObjects(imageData: ImageData) {
  const model = await loadModel();

  // Preprocess image
  const tensor = tf.browser
    .fromPixels(imageData)
    .resizeNearestNeighbor([640, 640])
    .toFloat()
    .div(255.0)
    .expandDims();

  // Run inference
  const predictions = await model.predict(tensor) as tf.Tensor;
  const detections = await predictions.array();

  // Post-process detections
  return processDetections(detections);
}

function processDetections(detections: any) {
  // Parse YOLO output format
  // Return array of { class, confidence, bbox }
  return [];
}
```

### Database Schema

```sql
-- Add to supabase/recamera_schema.sql

-- Cameras table
create table if not exists cameras (
  id uuid primary key default uuid_generate_v4(),
  camera_name text not null,
  rtsp_url text not null,
  location text,
  status text not null check (status in ('active', 'inactive', 'maintenance')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Inference results table
create table if not exists recamera_inferences (
  id uuid primary key default uuid_generate_v4(),
  camera_id uuid references cameras(id) on delete cascade not null,
  frame_timestamp timestamptz not null default now(),
  detections jsonb not null default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Camera alerts table
create table if not exists camera_alerts (
  id uuid primary key default uuid_generate_v4(),
  camera_id uuid references cameras(id) on delete cascade not null,
  alert_type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')) default 'warning',
  message text not null,
  is_resolved boolean default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

-- Indexes
create index if not exists idx_cameras_status on cameras(status);
create index if not exists idx_recamera_inferences_camera_id on recamera_inferences(camera_id);
create index if not exists idx_recamera_inferences_timestamp on recamera_inferences(frame_timestamp desc);
create index if not exists idx_camera_alerts_camera_id on camera_alerts(camera_id);
create index if not exists idx_camera_alerts_resolved on camera_alerts(is_resolved);

-- Enable RLS
alter table cameras enable row level security;
alter table recamera_inferences enable row level security;
alter table camera_alerts enable row level security;

-- RLS Policies
create policy "public read cameras" on cameras
  for select using (true);

create policy "service role manage cameras" on cameras
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "public read inferences" on recamera_inferences
  for select using (true);

create policy "service role manage inferences" on recamera_inferences
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "public read camera alerts" on camera_alerts
  for select using (true);

create policy "service role manage camera alerts" on camera_alerts
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

### Environment Variables

```bash
# Recamera Configuration
RTSP_USERNAME=admin
RTSP_PASSWORD=password123
RECAMERA_MODEL_PATH=/models/yolov8
```

---

## 3. Data Flow Summary

### Meshtastic → Laura

1. **Device sends position/telemetry** via LoRa mesh
2. **Gateway device publishes to MQTT** broker
3. **Laura backend subscribes** to MQTT topics
4. **Backend processes** and stores in Supabase
5. **Supabase realtime** pushes to frontend
6. **Dashboard updates** with live positions

### Recamera → Laura

1. **Camera streams RTSP** video
2. **FFmpeg transcodes** to WebSocket format
3. **Socket.IO broadcasts** to connected clients
4. **Frontend runs AI inference** (YOLOv8/TensorFlow.js)
5. **Detections posted** to `/api/recamera/inference`
6. **Backend stores results** and generates alerts
7. **Alerts displayed** on dashboard

---

## 4. Scalability Considerations

### Meshtastic
- **Multiple gateways**: Load balance across MQTT topics
- **Message queuing**: Use Redis for buffering
- **Database optimization**: Partition telemetry by date

### Recamera
- **Edge processing**: Run inference on edge devices (NVIDIA Jetson, Coral TPU)
- **CDN for streams**: Use CloudFlare Stream or AWS MediaLive
- **Frame sampling**: Process every Nth frame instead of all
- **Batch inference**: Process multiple frames at once

---

## 5. Security Considerations

- **MQTT auth**: Enable username/password or TLS certificates
- **RTSP auth**: Use digest authentication
- **API rate limiting**: Prevent abuse of inference endpoint
- **Encrypt video streams**: Use SRTP or TLS
- **Access control**: RLS policies on camera/device tables

---

## Next Steps

1. Set up MQTT broker (Mosquitto)
2. Deploy Meshtastic MQTT service
3. Add Socket.IO to Next.js server
4. Implement video streaming endpoints
5. Train/deploy AI models for Recamera
6. Build camera management UI

---

Generated: 2025-10-28
Author: Claude (HeySalad Engineering)
