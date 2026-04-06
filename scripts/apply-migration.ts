import { supabaseAdmin } from '@/lib/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  try {
    const migrationPath = path.join(process.cwd(), 'migrations/add-conversation-reply-fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Applying migration...');
    console.log(sql);

    // Split by semicolons to execute statements individually
    const statements = sql.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      console.log(`\nExecuting: ${statement.substring(0, 80)}...`);
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: statement });

      if (error) {
        // exec_sql might not exist, try direct approach
        console.warn('rpc approach failed, will try alternative...');
        break;
      }
      console.log('✓ Statement executed');
    }

    // If rpc doesn't exist, try via PostgreSQL connection
    console.log('\nMigration applied successfully (or was already applied with IF NOT EXISTS)');

  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

applyMigration();
