#!/usr/bin/env node

import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');

// Read and parse .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n').filter(l => l && !l.startsWith('#'));

const env = { ...process.env };
for (const line of envLines) {
  const [key, ...valueParts] = line.split('=');
  let value = valueParts.join('=').trim();
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key.trim()] = value;
}

// Run the script with the loaded env
try {
  execSync('npx tsx scripts/process-client-replies.ts', {
    stdio: 'inherit',
    env,
    cwd: path.join(__dirname, '..'),
  });
} catch (e) {
  process.exit(1);
}
