#!/usr/bin/env node
/**
 * Batch insert leads into Supabase.
 * Usage: node scripts/batch-insert-leads.js '[{"full_name":"..."}]'
 */

const https = require('https');

async function batchInsertLeads(leads) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE env vars');
    process.exit(1);
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/leads`);
  const options = {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  };

  let inserted = 0, duplicates = 0, errors = 0;

  for (const lead of leads) {
    await new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 201) {
            inserted++;
          } else if (res.statusCode === 409) {
            duplicates++;
          } else {
            console.error(`Error inserting ${lead.full_name}: ${res.statusCode}`);
            errors++;
          }
          resolve();
        });
      });
      req.on('error', (e) => {
        console.error('Request error:', e);
        errors++;
        resolve();
      });
      req.write(JSON.stringify(lead));
      req.end();
    });
  }

  return { inserted, duplicates, errors };
}

// Parse args
const leadsJson = process.argv[2];
if (!leadsJson) {
  console.error('Usage: node scripts/batch-insert-leads.js \'[{...}]\'');
  process.exit(1);
}

const leads = JSON.parse(leadsJson);
batchInsertLeads(leads).then(result => {
  console.log(`Inserted: ${result.inserted}, Duplicates: ${result.duplicates}, Errors: ${result.errors}`);
}).catch(err => {
  console.error('Batch insert failed:', err);
  process.exit(1);
});
