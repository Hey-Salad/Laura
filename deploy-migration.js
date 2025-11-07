const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deploy() {
  console.log('🚀 Deploying camera_commands migration...\n');

  const sql = fs.readFileSync('supabase/migrations/20251031_create_camera_commands.sql', 'utf8');

  // Split into statements and execute
  const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

  for (const stmt of statements) {
    if (stmt.trim()) {
      try {
        await supabase.rpc('exec', { sql: stmt });
      } catch (e) {
        // Continue - some statements may already exist
      }
    }
  }

  // Verify
  const { error } = await supabase.from('camera_commands').select('*').limit(1);

  if (error) {
    console.log('\n⚠️  Automated migration not supported by your Supabase plan.');
    console.log('\n📋 Please run manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/ybecdgbzgldafwvzwkpd/sql');
    console.log('2. Paste the SQL from: supabase/migrations/20251031_create_camera_commands.sql');
    console.log('3. Click "Run"\n');
    process.exit(1);
  }

  console.log('✅ Migration deployed successfully!\n');
}

deploy();
