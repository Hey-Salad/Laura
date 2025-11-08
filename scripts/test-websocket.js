#!/usr/bin/env node

/**
 * Test WebSocket connection to Cloudflare Worker
 * Usage: node scripts/test-websocket.js
 */

const WebSocket = require('ws');

const WS_URL = 'wss://heysalad-openai-proxy.heysalad-o.workers.dev/openai-realtime?token=cNf2w6BmZrItVdakHxqUkD7hY/y1swO0NGLBvtI0EXI=';

console.log('🔌 Connecting to WebSocket...');
console.log(`   URL: ${WS_URL.substring(0, 100)}...`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket connected!');

  // Send a test message to OpenAI
  const testMessage = {
    type: 'response.create',
    response: {
      modalities: ['text'],
      instructions: 'You are a helpful assistant for a kitchen camera system.'
    }
  };

  console.log('📤 Sending test message...');
  ws.send(JSON.stringify(testMessage));

  // Close after 5 seconds
  setTimeout(() => {
    console.log('👋 Closing connection...');
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  console.log('📥 Received message:');
  try {
    const parsed = JSON.parse(data);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log(data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  console.error('   Full error:', error);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket closed`);
  console.log(`   Code: ${code}`);
  console.log(`   Reason: ${reason || 'No reason provided'}`);
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('⏱️  Timeout - connection took too long');
  ws.close();
  process.exit(1);
}, 10000);
