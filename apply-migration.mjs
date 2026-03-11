import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('URL:', supabaseUrl ? 'set' : 'missing')
console.log('Key:', serviceRoleKey ? 'set' : 'missing')

const supabase = createClient(supabaseUrl, serviceRoleKey)

const sql = fs.readFileSync('./migrations/add-conversation-reply-fields.sql', 'utf8')

async function applyMigration() {
  try {
    // Split into individual ALTER TABLE statements
    const statements = sql.split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .filter(s => s.trim())
    
    for (const statement of statements) {
      const stmt = statement.trim() + ';'
      console.log('Executing:', stmt.slice(0, 60))
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt })
      if (error) {
        console.log('  → Error (may already exist):', error.message)
      } else {
        console.log('  → OK')
      }
    }
  } catch (err) {
    console.error('Exception:', err.message)
  }
}

applyMigration()
