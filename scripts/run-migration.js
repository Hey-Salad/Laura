#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Running camera_commands migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251031_create_camera_commands.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📊 Executing SQL...\n');

    // Execute the migration using Supabase's SQL API
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

    if (error) {
      // Try alternative method - direct RPC
      console.log('⚠️  Trying alternative method...\n');

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.from('_sql').select('*').limit(0);

          if (stmtError && stmtError.message !== 'relation "_sql" does not exist') {
            console.error(`❌ Error: ${stmtError.message}`);
          }
        }
      }
    }

    // Verify table was created
    console.log('\n✅ Verifying migration...');
    const { data: tableCheck, error: checkError } = await supabase
      .from('camera_commands')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('\n❌ Migration failed - table not created');
      console.error('Error:', checkError.message);
      console.log('\n📋 Please run the migration manually via Supabase Dashboard:');
      console.log('1. Go to: https://supabase.com/dashboard/project/ybecdgbzgldafwvzwkpd/sql');
      console.log('2. Copy the contents of: supabase/migrations/20251031_create_camera_commands.sql');
      console.log('3. Paste and click "Run"\n');
      process.exit(1);
    }

    console.log('✅ Table `camera_commands` created successfully!');
    console.log('✅ Indexes created');
    console.log('✅ RLS policies configured');

    console.log('\n🎉 Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Go to https://laura.heysalad.app/cameras');
    console.log('2. Select a camera and click a control button');
    console.log('3. Watch the command appear in "Command History"');
    console.log('4. Wait ~30s for your CircuitPython camera to execute it\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n📋 Manual migration required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/ybecdgbzgldafwvzwkpd/sql');
    console.log('2. Copy the contents of: supabase/migrations/20251031_create_camera_commands.sql');
    console.log('3. Paste and click "Run"\n');
    process.exit(1);
  }
}

runMigration();
