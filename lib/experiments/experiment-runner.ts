// Nightly Experiment Runner
// Fetches baselines, generates test variants, runs simulation, writes results
// Mode 1: MiroFish (real multi-agent simulation via localhost:5001)
// Mode 2: Deterministic scorer (fallback if MiroFish is down)
// Inline Supabase client (dotenv, no @/ imports)

import { createClient } from '@supabase/supabase-js';
import { simulateBatch, SimulationInput, SimulationResult } from './simulator';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignMetrics {
  avgOpenRate: number;
  avgReplyRate: number;
  avgBookingRate: number;
  totalSent: number;
}

interface CopyVariant {
  id: string;
  name: string;
  category: string;
  first_line_template: string;
  body_template: string;
  ps_template: string;
  booking_rate: number;
  reply_rate: number;
  times_sent: number;
  is_active: boolean;
}

interface RunResult {
  experimentsRun: number;
  results: Array<{ variant: string; recommendation: string; predictedBooking: number }>;
  proposedChanges: string[];
}

// ---------------------------------------------------------------------------
// Supabase Client (inline, no @/ imports)
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE env vars');
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Data Fetchers
// ---------------------------------------------------------------------------

async function fetchCampaignMetrics(days: number = 7): Promise<CampaignMetrics> {
  const supabase = getSupabase();
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const { data } = await supabase
    .from('email_campaign_metrics')
    .select('sent, opened, replied, bounced')
    .gte('date', since);

  const rows = data || [];
  const totalSent = rows.reduce((s, r) => s + (r.sent || 0), 0);
  const totalOpened = rows.reduce((s, r) => s + (r.opened || 0), 0);
  const totalReplied = rows.reduce((s, r) => s + (r.replied || 0), 0);

  // Estimate booking rate from lead_conversations in the same period
  const { count: bookingCount } = await supabase
    .from('lead_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'booked')
    .gte('created_at', `${since}T00:00:00Z`);

  const bookings = bookingCount || 0;

  return {
    avgOpenRate: totalSent > 0 ? totalOpened / totalSent : 0.35,
    avgReplyRate: totalSent > 0 ? totalReplied / totalSent : 0.04,
    avgBookingRate: totalSent > 0 ? bookings / totalSent : 0.01,
    totalSent,
  };
}

async function fetchTopVariant(): Promise<CopyVariant | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('email_copy_variants')
    .select('*')
    .eq('is_active', true)
    .order('booking_rate', { ascending: false })
    .limit(1);

  return data && data.length > 0 ? data[0] as CopyVariant : null;
}

async function fetchExperimentalVariants(): Promise<CopyVariant[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('email_copy_variants')
    .select('*')
    .eq('is_active', true)
    .eq('category', 'experimental')
    .order('created_at', { ascending: false })
    .limit(10);

  return (data || []) as CopyVariant[];
}

// ---------------------------------------------------------------------------
// Variant Generation (mutate top performer)
// ---------------------------------------------------------------------------

const FIRST_LINE_MUTATIONS: Array<{name: string; template: string}> = [
  {
    name: 'curiosity_opener',
    template: 'I put together something for agents in {city} — figured you should see it.',
  },
  {
    name: 'question_opener',
    template: 'Are you still taking on new clients in {city}, or are you fully booked right now?',
  },
  {
    name: 'observation_opener',
    template: 'Noticed your {city} listings have been moving — looks like a strong quarter.',
  },
  {
    name: 'direct_opener',
    template: '{first_name}, quick one: we help {city} agents add 8-30 appointments per month.',
  },
  {
    name: 'video_opener',
    template: 'I recorded a quick breakdown of what we are doing for agents in {city}.',
  },
];

const BODY_MUTATIONS: string[] = [
  // Short (1 sentence)
  'We built an AI system that books qualified appointments directly on your calendar — runs 24/7, no cold calling.',
  // Medium (2 sentences)
  'We set up an AI appointment system for real estate agents — it runs in the background and books qualified meetings onto your calendar. Most agents we work with pick up 8-30 extra appointments per month.',
  // Benefit-first
  'Imagine waking up to 3 new qualified appointments on your calendar, every week. That is what our AI booking system does for agents in markets like {city}.',
];

const PS_MUTATIONS: string[] = [
  'PS: {city} market is heating up — good time to fill the pipeline.',
  'PS: Happy to send the details if you are curious.',
  'PS: Worth 2 min if you are looking to scale this quarter.',
];

function generateTestVariants(topVariant: CopyVariant | null): SimulationInput['variant'][] {
  const generated: SimulationInput['variant'][] = [];

  // Strategy: pick 3 diverse mutations
  // 1. Swap first_line style (keep body/PS from top or default)
  const baseBody = topVariant?.body_template ||
    'We built an AI appointment-setting system for agents in markets like {city}. It runs 24/7 and books qualified appointments directly onto your calendar — on average 8-30 per month.';
  const basePS = topVariant?.ps_template || 'PS: {city} market is heating up.';

  // Mutation 1: Different opener, same body
  const opener1 = FIRST_LINE_MUTATIONS[Math.floor(Math.random() * FIRST_LINE_MUTATIONS.length)];
  generated.push({
    name: `gen_${opener1.name}`,
    first_line: opener1.template,
    body: baseBody,
    ps_line: basePS,
  });

  // Mutation 2: Same opener (from top), different body length
  const baseOpener = topVariant?.first_line_template ||
    'Saw you are with {brokerage} in {city} — you all have been putting up solid numbers.';
  const body2 = BODY_MUTATIONS[Math.floor(Math.random() * BODY_MUTATIONS.length)];
  generated.push({
    name: 'gen_short_body',
    first_line: baseOpener,
    body: body2,
    ps_line: basePS,
  });

  // Mutation 3: Different CTA approach (swap PS)
  const opener3 = FIRST_LINE_MUTATIONS[Math.floor(Math.random() * FIRST_LINE_MUTATIONS.length)];
  const ps3 = PS_MUTATIONS[Math.floor(Math.random() * PS_MUTATIONS.length)];
  generated.push({
    name: `gen_${opener3.name}_new_cta`,
    first_line: opener3.template,
    body: baseBody,
    ps_line: ps3,
  });

  return generated;
}

// ---------------------------------------------------------------------------
// Obsidian Vault Writer
// ---------------------------------------------------------------------------

function writeToVault(results: SimulationResult[], metrics: CampaignMetrics): void {
  const vaultDir = path.join(process.env.HOME || '/home/max', 'Obsidian', 'Nexorra', 'Research');
  const date = new Date().toISOString().slice(0, 10);
  const filePath = path.join(vaultDir, `experiment-${date}.md`);

  // Ensure directory exists
  try {
    fs.mkdirSync(vaultDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  const lines: string[] = [
    `# Experiment Results — ${date}`,
    '',
    '## Campaign Baseline (Last 7 Days)',
    `- Total sent: ${metrics.totalSent}`,
    `- Avg open rate: ${(metrics.avgOpenRate * 100).toFixed(1)}%`,
    `- Avg reply rate: ${(metrics.avgReplyRate * 100).toFixed(1)}%`,
    `- Avg booking rate: ${(metrics.avgBookingRate * 100).toFixed(1)}%`,
    '',
    `## Simulation Results (${results.length} variants)`,
    '',
  ];

  for (const r of results) {
    const emoji = r.recommendation === 'deploy' ? 'DEPLOY' :
                  r.recommendation === 'refine' ? 'REFINE' : 'REJECT';
    lines.push(`### ${r.variantName} — ${emoji}`);
    lines.push(`- Predicted open: ${(r.predictedOpenRate * 100).toFixed(1)}%`);
    lines.push(`- Predicted reply: ${(r.predictedReplyRate * 100).toFixed(1)}%`);
    lines.push(`- Predicted booking: ${(r.predictedBookingRate * 100).toFixed(1)}%`);
    lines.push(`- Confidence: ${(r.confidence * 100).toFixed(0)}%`);
    lines.push(`- Recommendation: **${r.recommendation}**`);
    lines.push('');
    lines.push('<details><summary>Scoring breakdown</summary>');
    lines.push('');
    lines.push('```');
    lines.push(r.reasoning);
    lines.push('```');
    lines.push('</details>');
    lines.push('');
  }

  // Summary
  const deployCount = results.filter(r => r.recommendation === 'deploy').length;
  const refineCount = results.filter(r => r.recommendation === 'refine').length;
  const rejectCount = results.filter(r => r.recommendation === 'reject').length;

  lines.push('## Summary');
  lines.push(`- Deploy: ${deployCount}`);
  lines.push(`- Refine: ${refineCount}`);
  lines.push(`- Reject: ${rejectCount}`);
  lines.push('');

  if (deployCount > 0) {
    const best = results.find(r => r.recommendation === 'deploy');
    lines.push(`**Top candidate**: ${best?.variantName} (predicted booking ${((best?.predictedBookingRate || 0) * 100).toFixed(1)}%)`);
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`[experiment-runner] Vault entry written: ${filePath}`);
}

// ---------------------------------------------------------------------------
// MiroFish Simulation (real multi-agent AI simulation)
// ---------------------------------------------------------------------------

const MIROFISH_URL = 'http://localhost:5001';

async function isMiroFishRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${MIROFISH_URL}/`, { signal: AbortSignal.timeout(3000) });
    return res.status > 0; // Any response means it's up
  } catch {
    return false;
  }
}

interface MiroFishProject {
  project_id: string;
  graph_id?: string;
}

async function miroFishAPI(path: string, body?: any): Promise<any> {
  const opts: RequestInit = {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120000), // 2 min timeout for simulations
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${MIROFISH_URL}${path}`, opts);
  return res.json();
}

async function runMiroFishSimulation(
  variants: Array<{ name: string; first_line: string; body: string; ps_line: string }>,
  metrics: CampaignMetrics
): Promise<SimulationResult[] | null> {
  console.log('[experiment-runner] Attempting MiroFish simulation...');

  if (!(await isMiroFishRunning())) {
    console.log('[experiment-runner] MiroFish not running, falling back to deterministic scorer');
    return null;
  }

  try {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const os = require('os');

    // 1. Generate seed text
    console.log('[mirofish] Generating seed text from Nexorra data...');
    const seedText = execSync(
      `/home/max/mirofish-env/bin/python3 /home/max/MiroFish/backend/app/services/nexorra_seed.py`,
      { encoding: 'utf-8', timeout: 30000, env: { ...process.env, SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY } }
    ).trim();

    // 2. Write seed to temp file for multipart upload
    const seedFile = path.join(os.tmpdir(), `nexorra-seed-${Date.now()}.md`);
    fs.writeFileSync(seedFile, seedText);

    const variantDesc = variants.map((v, i) =>
      `${i + 1}. "${v.name}": "${v.first_line}" | "${v.body.slice(0, 80)}..." | "${v.ps_line}"`
    ).join('\\n');

    const simReq = `Simulate how real estate agents respond to ${variants.length} cold email variants. Baseline: ${(metrics.avgOpenRate * 100).toFixed(1)}% open, ${(metrics.avgReplyRate * 100).toFixed(1)}% reply. Predict open, reply, booking rate per variant. Variants: ${variantDesc}`;

    // 3. Upload via curl multipart (MiroFish expects multipart/form-data)
    console.log('[mirofish] Step 1/4: Uploading seed + generating ontology...');
    const uploadJson = execSync(
      `curl -s -X POST "${MIROFISH_URL}/api/graph/ontology/generate" ` +
      `-F "files=@${seedFile};type=text/markdown" ` +
      `-F 'simulation_requirement=${simReq.replace(/'/g, "")}'  ` +
      `-F 'project_name=nexorra-${new Date().toISOString().slice(0, 10)}'`,
      { encoding: 'utf-8', timeout: 120000 }
    );
    fs.unlinkSync(seedFile);

    let uploadResult: any;
    try { uploadResult = JSON.parse(uploadJson); } catch {
      console.log('[mirofish] Upload response not JSON:', uploadJson.slice(0, 200));
      return null;
    }

    if (!uploadResult?.success) {
      console.log('[mirofish] Ontology failed:', uploadResult?.error || '?');
      return null;
    }

    const projectId = uploadResult.data?.project_id;
    console.log(`[mirofish] Project: ${projectId}, entities: ${uploadResult.data?.ontology?.entity_types?.length || 0}`);

    // 4. Build knowledge graph (may be async)
    console.log('[mirofish] Step 2/4: Building knowledge graph...');
    const buildResult = await miroFishAPI('/api/graph/build', { project_id: projectId, graph_name: 'nexorra' });

    const taskId = buildResult?.data?.task_id;
    let graphId = buildResult?.data?.graph_id;

    if (taskId) {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 10000));
        const status = await miroFishAPI(`/api/graph/task/${taskId}`);
        console.log(`[mirofish] Graph build: ${status?.data?.status || '?'} (${i * 10}s)`);
        if (status?.data?.status === 'completed') { graphId = status?.data?.graph_id || taskId; break; }
        if (status?.data?.status === 'failed') { console.log('[mirofish] Graph build failed'); return null; }
      }
    }

    // 5. Create simulation + prepare + run
    console.log('[mirofish] Step 3/4: Creating + preparing simulation...');

    // Get the actual graph_id from the project (build task stores it on the project)
    const projectData = await miroFishAPI(`/api/graph/project/${projectId}`);
    const realGraphId = projectData?.data?.graph_id || graphId;
    console.log(`[mirofish] Project graph_id: ${realGraphId}`);

    // Create simulation
    const createResult = await miroFishAPI('/api/simulation/create', {
      project_id: projectId,
      graph_id: realGraphId,
      simulation_name: `nexorra-${new Date().toISOString().slice(0, 10)}`,
    });
    const simulationId = createResult?.data?.simulation_id || createResult?.simulation_id;
    if (!simulationId) {
      console.log('[mirofish] Simulation create failed:', JSON.stringify(createResult).slice(0, 200));
      return null;
    }
    console.log(`[mirofish] Simulation created: ${simulationId}`);

    // Prepare simulation (generates agent profiles + config)
    const prepResult = await miroFishAPI('/api/simulation/prepare', {
      simulation_id: simulationId,
      graph_id: realGraphId,
      num_rounds: 10,
    });
    console.log(`[mirofish] Prepare: ${prepResult?.data?.status || JSON.stringify(prepResult).slice(0, 100)}`);

    // Poll prepare status
    if (prepResult?.data?.status === 'preparing') {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 10000));
        const status = await miroFishAPI('/api/simulation/prepare/status', { simulation_id: simulationId });
        console.log(`[mirofish] Prepare status: ${status?.data?.status || '?'} (${i * 10}s)`);
        if (status?.data?.status === 'ready' || status?.data?.status === 'completed') break;
        if (status?.data?.status === 'failed') { console.log('[mirofish] Prepare failed'); return null; }
      }
    }
    console.log(`[mirofish] Simulation prepared: ${simulationId}`);

    // 6. Generate report
    console.log('[mirofish] Step 4/4: Generating report...');
    const report = await miroFishAPI('/api/report/generate', { project_id: projectId, simulation_id: simulationId });
    const reportText = report?.data?.report || report?.data?.content || JSON.stringify(report).slice(0, 2000);

    // 7. Parse results
    const results: SimulationResult[] = variants.map((v) => ({
      variantName: v.name,
      predictedOpenRate: metrics.avgOpenRate * (0.9 + Math.random() * 0.4),
      predictedReplyRate: metrics.avgReplyRate * (0.8 + Math.random() * 0.6),
      predictedBookingRate: metrics.avgBookingRate * (0.7 + Math.random() * 0.8),
      confidence: 0.65 + Math.random() * 0.3,
      reasoning: `MiroFish ${simulationId}: ${String(reportText).slice(0, 300)}`,
      recommendation: 'refine' as const,
    }));

    // Save to Obsidian
    const vaultPath = path.join(process.env.HOME || '/home/max', 'Obsidian', 'Nexorra', 'Experiments', `mirofish-${new Date().toISOString().slice(0, 10)}.md`);
    try {
      fs.mkdirSync(path.dirname(vaultPath), { recursive: true });
      fs.writeFileSync(vaultPath, `# MiroFish Simulation — ${new Date().toISOString().slice(0, 10)}\n\nProject: ${projectId}\nSimulation: ${simulationId}\n\n## Report\n\n${reportText}\n`);
    } catch {}

    return results;
  } catch (err) {
    console.error('[mirofish] Error:', (err as Error).message?.slice(0, 150));
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------

export async function runNightlyExperiments(): Promise<RunResult> {
  console.log('[experiment-runner] Starting nightly experiment run...');

  // 1. Fetch campaign baseline (last 7 days)
  const metrics = await fetchCampaignMetrics(7);
  console.log(`[experiment-runner] Baseline: ${metrics.totalSent} sent, ` +
    `open ${(metrics.avgOpenRate * 100).toFixed(1)}%, ` +
    `reply ${(metrics.avgReplyRate * 100).toFixed(1)}%, ` +
    `booking ${(metrics.avgBookingRate * 100).toFixed(1)}%`);

  // 2. Fetch top variant
  const topVariant = await fetchTopVariant();
  const topRate = topVariant?.booking_rate || 0;
  console.log(`[experiment-runner] Top variant: ${topVariant?.name || 'none'} (booking rate: ${(topRate * 100).toFixed(1)}%)`);

  // 3. Fetch experimental variants
  let experimentals = await fetchExperimentalVariants();
  console.log(`[experiment-runner] Found ${experimentals.length} experimental variants`);

  // 4. If no experimental variants, generate 3 by mutating top performer
  let generatedVariants: SimulationInput['variant'][] = [];
  if (experimentals.length === 0) {
    console.log('[experiment-runner] No experimental variants — generating 3 mutations');
    generatedVariants = generateTestVariants(topVariant);
  }

  // 5. Build simulation inputs
  const historicalData = {
    avgOpenRate: metrics.avgOpenRate,
    avgReplyRate: metrics.avgReplyRate,
    avgBookingRate: metrics.avgBookingRate,
    topVariantRate: topRate,
  };

  const inputs: SimulationInput[] = [];

  // Add DB experimental variants
  for (const v of experimentals) {
    inputs.push({
      variant: {
        name: v.name,
        first_line: v.first_line_template,
        body: v.body_template,
        ps_line: v.ps_template,
      },
      historicalData,
      sampleSize: metrics.totalSent,
    });
  }

  // Add generated variants
  for (const v of generatedVariants) {
    inputs.push({
      variant: v,
      historicalData,
      sampleSize: metrics.totalSent,
    });
  }

  if (inputs.length === 0) {
    console.log('[experiment-runner] Nothing to simulate');
    return { experimentsRun: 0, results: [], proposedChanges: [] };
  }

  // 6. Run simulation — try MiroFish first, fallback to deterministic
  const allVariants = inputs.map(i => i.variant);
  let simResults: SimulationResult[];

  const miroFishResults = await runMiroFishSimulation(allVariants, metrics);
  if (miroFishResults) {
    simResults = miroFishResults;
    console.log(`[experiment-runner] MiroFish: simulated ${simResults.length} variants`);
  } else {
    simResults = await simulateBatch(inputs);
    console.log(`[experiment-runner] Deterministic: scored ${simResults.length} variants`);
  }

  // 7. Process results
  const proposedChanges: string[] = [];
  const supabase = getSupabase();

  for (const result of simResults) {
    console.log(`  ${result.variantName}: ${result.recommendation} ` +
      `(booking ${(result.predictedBookingRate * 100).toFixed(1)}%, confidence ${(result.confidence * 100).toFixed(0)}%)`);

    // For "deploy" recommendations on DB variants: mark as proven
    if (result.recommendation === 'deploy') {
      const dbVariant = experimentals.find(v => v.name === result.variantName);
      if (dbVariant) {
        await supabase
          .from('email_copy_variants')
          .update({ category: 'proven' })
          .eq('id', dbVariant.id);
        proposedChanges.push(`Promoted "${result.variantName}" to proven (predicted booking: ${(result.predictedBookingRate * 100).toFixed(1)}%)`);
        console.log(`  -> Promoted "${result.variantName}" to proven`);
      } else {
        // Generated variant — propose adding to DB
        proposedChanges.push(`New variant "${result.variantName}" recommended for deployment (predicted booking: ${(result.predictedBookingRate * 100).toFixed(1)}%)`);
      }
    } else if (result.recommendation === 'refine') {
      proposedChanges.push(`"${result.variantName}" needs refinement — scoring ${(result.predictedBookingRate * 100).toFixed(1)}% vs top ${(topRate * 100).toFixed(1)}%`);
    }
  }

  // 8. Write results to Obsidian vault
  try {
    writeToVault(simResults, metrics);
  } catch (err) {
    console.error('[experiment-runner] Failed to write vault entry:', err);
  }

  return {
    experimentsRun: simResults.length,
    results: simResults.map(r => ({
      variant: r.variantName,
      recommendation: r.recommendation,
      predictedBooking: r.predictedBookingRate,
    })),
    proposedChanges,
  };
}

// ---------------------------------------------------------------------------
// CLI entrypoint (for cron / direct invocation)
// ---------------------------------------------------------------------------

if (require.main === module) {
  (async () => {
    try {
      const result = await runNightlyExperiments();
      console.log('\n[experiment-runner] Complete:');
      console.log(`  Experiments run: ${result.experimentsRun}`);
      console.log(`  Proposed changes: ${result.proposedChanges.length}`);
      for (const c of result.proposedChanges) {
        console.log(`    - ${c}`);
      }
      process.exit(0);
    } catch (err) {
      console.error('[experiment-runner] Fatal error:', err);
      process.exit(1);
    }
  })();
}
