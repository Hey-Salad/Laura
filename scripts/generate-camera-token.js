#!/usr/bin/env node

/**
 * Generate API token for camera
 * Usage: node scripts/generate-camera-token.js <camera_id>
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const cameraId = process.argv[2] || 'recamera-gimbal-001';

async function generateToken() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`🔍 Looking up camera: ${cameraId}`);

  // Get camera
  const { data: camera, error: getError } = await supabase
    .from('cameras')
    .select('*')
    .eq('camera_id', cameraId)
    .single();

  if (getError || !camera) {
    console.error(`❌ Camera not found: ${cameraId}`);
    console.error(getError);
    process.exit(1);
  }

  console.log(`✅ Found camera: ${camera.camera_name}`);

  // Check if token already exists
  if (camera.api_token) {
    console.log(`⚠️  Camera already has a token: ${camera.api_token}`);
    console.log('');
    console.log('🎯 WebSocket URL:');
    console.log(`   wss://heysalad-openai-proxy.heysalad-o.workers.dev/openai-realtime?token=${camera.api_token}`);
    return;
  }

  // Generate token using PostgreSQL function
  const { data: tokenData, error: tokenError } = await supabase
    .rpc('generate_camera_token');

  if (tokenError) {
    console.error('❌ Failed to generate token:', tokenError);
    console.log('');
    console.log('⚠️  The generate_camera_token() function might not exist.');
    console.log('   Run the migration first:');
    console.log('   cat supabase/migrations/20251107_add_camera_tokens.sql | psql <your_db_url>');

    // Try to generate a token manually
    console.log('');
    console.log('🔧 Generating token manually...');
    const crypto = require('crypto');
    const manualToken = crypto.randomBytes(32).toString('base64');

    const { data: updated, error: updateError } = await supabase
      .from('cameras')
      .update({ api_token: manualToken })
      .eq('camera_id', cameraId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update camera:', updateError);
      process.exit(1);
    }

    console.log('✅ Token generated and stored!');
    console.log(`   Token: ${manualToken}`);
    console.log('');
    console.log('🎯 WebSocket URL:');
    console.log(`   wss://heysalad-openai-proxy.heysalad-o.workers.dev/openai-realtime?token=${manualToken}`);
    return;
  }

  // Update camera with new token
  const { data: updated, error: updateError } = await supabase
    .from('cameras')
    .update({ api_token: tokenData })
    .eq('camera_id', cameraId)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Failed to update camera:', updateError);
    process.exit(1);
  }

  console.log('✅ Token generated and stored!');
  console.log(`   Token: ${tokenData}`);
  console.log('');
  console.log('🎯 WebSocket URL:');
  console.log(`   wss://heysalad-openai-proxy.heysalad-o.workers.dev/openai-realtime?token=${tokenData}`);
  console.log('');
  console.log('📋 Next steps:');
  console.log('   1. Copy the WebSocket URL above');
  console.log('   2. Update your Node-RED flow with this URL');
  console.log('   3. Test the connection!');
}

generateToken().catch(console.error);
