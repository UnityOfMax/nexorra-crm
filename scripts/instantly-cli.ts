#!/usr/bin/env node
/**
 * Instantly CLI — Full control over Instantly campaigns, leads, and accounts.
 *
 * Usage:
 *   npx tsx scripts/instantly-cli.ts <command> [subcommand] [args...]
 *
 * Commands:
 *   campaigns list                          List all campaigns
 *   campaigns get <id>                      Get campaign details (including sequences/copy)
 *   campaigns create <name>                 Create new campaign
 *   campaigns pause <id>                    Pause a campaign
 *   campaigns activate <id>                 Activate/resume a campaign
 *   campaigns delete <id>                   Delete a campaign
 *   campaigns analytics [id]               Campaign analytics (single or all)
 *   campaigns steps <id>                    Per-step analytics
 *   campaigns copy <id>                     Show email copy for all steps/variants
 *   campaigns edit-copy <id> <step> <json>  Update email copy for a step
 *   campaigns update <id> <json>            Update campaign fields (name, schedule, etc.)
 *
 *   leads list <campaign_id> [--status X] [--limit N]
 *   leads get <email>                       Get lead details
 *   leads add <campaign_id> <email> <first> <last> [--vars key=val,...]
 *   leads update <email> --status <status>
 *   leads delete <campaign_id> [--status X] [--limit N]
 *
 *   accounts list                           List sending accounts
 *   accounts get <email>                    Get account details
 *   accounts warmup <email1,email2,...>     Warmup analytics
 *   accounts vitals <email>                 Test account health
 *
 *   emails list <campaign_id> [--limit N]   List emails in campaign
 *
 * Examples:
 *   npx tsx scripts/instantly-cli.ts campaigns list
 *   npx tsx scripts/instantly-cli.ts campaigns pause abc-123
 *   npx tsx scripts/instantly-cli.ts campaigns copy abc-123
 *   npx tsx scripts/instantly-cli.ts campaigns edit-copy abc-123 0 '{"subject":"New subject","body":"New body"}'
 *   npx tsx scripts/instantly-cli.ts leads list abc-123 --limit 10
 *   npx tsx scripts/instantly-cli.ts accounts list
 */

import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { InstantlyClient } from '../lib/instantly/client';

const client = new InstantlyClient();

function usage(msg?: string) {
  if (msg) console.error(`\nError: ${msg}\n`);
  console.log(`
Instantly CLI — Control campaigns, leads, and accounts.

CAMPAIGNS:
  campaigns list                          List all campaigns
  campaigns get <id>                      Get full campaign details
  campaigns create <name>                 Create a new campaign
  campaigns pause <id>                    Pause a running campaign
  campaigns activate <id>                 Resume/activate a paused campaign
  campaigns delete <id>                   Delete a campaign (irreversible)
  campaigns analytics [id]               Show analytics (omit id for all)
  campaigns steps <id>                    Per-step analytics
  campaigns copy <id>                     Display email copy for all steps
  campaigns edit-copy <id> <step> <json>  Update copy for step N (0-indexed)
  campaigns update <id> <json>            Update campaign fields

LEADS:
  leads list <campaign_id> [--status X] [--limit N]
  leads get <email>                       Lookup a lead by email
  leads add <campaign_id> <email> <first> <last> [--vars key=val,key=val]
  leads update <email> --status <status>
  leads delete <campaign_id> [--status X] [--limit N]

ACCOUNTS:
  accounts list                           List all sending accounts
  accounts get <email>                    Get account details
  accounts warmup <email1,email2,...>     Warmup analytics
  accounts vitals <email>                 Test account health

EMAILS:
  emails list <campaign_id> [--limit N]

FIND:
  find <name_fragment>                    Search campaigns by name
`);
  process.exit(msg ? 1 : 0);
}

function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[i + 1];
      i++;
    } else {
      positional.push(args[i]);
    }
  }
  return { positional, flags };
}

function json(data: any) {
  console.log(JSON.stringify(data, null, 2));
}

function table(rows: Record<string, any>[], columns?: string[]) {
  if (!rows || rows.length === 0) {
    console.log('(no results)');
    return;
  }
  const cols = columns || Object.keys(rows[0]);
  // Header
  const widths = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] ?? '').slice(0, 50).length)));
  const header = cols.map((c, i) => c.padEnd(widths[i])).join('  ');
  const separator = cols.map((_, i) => '─'.repeat(widths[i])).join('──');
  console.log(header);
  console.log(separator);
  for (const row of rows) {
    console.log(cols.map((c, i) => String(row[c] ?? '').slice(0, 50).padEnd(widths[i])).join('  '));
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') usage();

  const [domain, action, ...rest] = args;
  const { positional, flags } = parseFlags(rest);

  switch (domain) {
    // ═══════════════════════════════════════════════
    // CAMPAIGNS
    // ═══════════════════════════════════════════════
    case 'campaigns':
    case 'campaign':
    case 'c': {
      switch (action) {
        case 'list':
        case 'ls': {
          const campaigns = await client.listCampaigns();
          table(campaigns.map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            created: c.created_at?.slice(0, 10) || '',
          })), ['id', 'name', 'status', 'created']);
          console.log(`\n${campaigns.length} campaign(s)`);
          break;
        }

        case 'get': {
          if (!positional[0]) usage('campaigns get <id>');
          const campaign = await client.getCampaign(positional[0]);
          json(campaign);
          break;
        }

        case 'create': {
          if (!positional[0]) usage('campaigns create <name>');
          const result = await client.createCampaign({ name: positional[0] });
          console.log(`Created campaign: ${result.id}`);
          json(result);
          break;
        }

        case 'pause': {
          if (!positional[0]) usage('campaigns pause <id>');
          await client.pauseCampaign(positional[0]);
          console.log(`Paused campaign: ${positional[0]}`);
          break;
        }

        case 'activate':
        case 'resume':
        case 'start': {
          if (!positional[0]) usage('campaigns activate <id>');
          await client.activateCampaign(positional[0]);
          console.log(`Activated campaign: ${positional[0]}`);
          break;
        }

        case 'delete': {
          if (!positional[0]) usage('campaigns delete <id>');
          await client.deleteCampaign(positional[0]);
          console.log(`Deleted campaign: ${positional[0]}`);
          break;
        }

        case 'analytics':
        case 'stats': {
          if (positional[0]) {
            const stats = await client.getCampaignAnalytics(positional[0]);
            console.log(`Campaign: ${positional[0]}\n`);
            table([stats], ['sent', 'opened', 'replied', 'bounced', 'unsubscribed']);
          } else {
            const campaigns = await client.listCampaigns();
            for (const c of campaigns) {
              try {
                const stats = await client.getCampaignAnalytics(c.id);
                console.log(`\n${c.name} (${c.status})`);
                table([stats], ['sent', 'opened', 'replied', 'bounced', 'unsubscribed']);
              } catch (e) {
                console.log(`\n${c.name}: (no analytics)`);
              }
            }
          }
          break;
        }

        case 'steps': {
          if (!positional[0]) usage('campaigns steps <id>');
          const steps = await client.getCampaignStepAnalytics(positional[0]);
          json(steps);
          break;
        }

        case 'copy': {
          if (!positional[0]) usage('campaigns copy <id>');
          const campaign = await client.getCampaign(positional[0]);
          const sequences = campaign.sequences || [];
          if (sequences.length === 0) {
            console.log('No sequences/steps found in this campaign.');
            break;
          }
          for (let si = 0; si < sequences.length; si++) {
            const seq = sequences[si];
            console.log(`\n═══ Sequence ${si} ═══`);
            for (let stepi = 0; stepi < (seq.steps || []).length; stepi++) {
              const step = seq.steps[stepi];
              console.log(`\n── Step ${stepi} (${step.type || 'email'}, delay: ${step.delay || 0} ${step.delay_unit || 'days'}) ──`);
              for (let vi = 0; vi < (step.variants || []).length; vi++) {
                const v = step.variants[vi];
                console.log(`  Variant ${vi}${(step.variants || []).length > 1 ? ` (${v.variant_label || 'A/B'})` : ''}:`);
                console.log(`    Subject: ${v.subject || '(none)'}`);
                console.log(`    Body:\n${(v.body || '').split('\n').map((l: string) => '      ' + l).join('\n')}`);
              }
            }
          }
          break;
        }

        case 'edit-copy': {
          // edit-copy <campaign_id> <step_index> <json>
          // json: {"subject": "...", "body": "..."} or {"variants": [{...}]}
          if (positional.length < 3) usage('campaigns edit-copy <id> <step_index> \'{"subject":"...","body":"..."}\'');
          const campaignId = positional[0];
          const stepIdx = parseInt(positional[1]);
          const copyData = JSON.parse(positional[2]);

          // Fetch current campaign to get sequences
          const current = await client.getCampaign(campaignId);
          const seqs = current.sequences || [];
          if (seqs.length === 0 || !seqs[0].steps || seqs[0].steps.length <= stepIdx) {
            console.error(`Step ${stepIdx} not found. Campaign has ${seqs[0]?.steps?.length || 0} steps.`);
            process.exit(1);
          }

          // Update the step's variant(s)
          if (copyData.variants) {
            seqs[0].steps[stepIdx].variants = copyData.variants;
          } else {
            // Update first variant with subject/body
            if (!seqs[0].steps[stepIdx].variants) seqs[0].steps[stepIdx].variants = [{}];
            if (copyData.subject !== undefined) seqs[0].steps[stepIdx].variants[0].subject = copyData.subject;
            if (copyData.body !== undefined) seqs[0].steps[stepIdx].variants[0].body = copyData.body;
          }

          await client.updateCampaign(campaignId, { sequences: seqs });
          console.log(`Updated step ${stepIdx} copy for campaign ${campaignId}`);

          // Show updated copy
          const v = seqs[0].steps[stepIdx].variants[0];
          console.log(`  Subject: ${v.subject}`);
          console.log(`  Body: ${v.body?.slice(0, 200)}...`);
          break;
        }

        case 'update': {
          if (positional.length < 2) usage('campaigns update <id> \'{"name":"..."}\'');
          const updates = JSON.parse(positional[1]);
          await client.updateCampaign(positional[0], updates);
          console.log(`Updated campaign: ${positional[0]}`);
          break;
        }

        default:
          usage(`Unknown campaigns command: ${action}`);
      }
      break;
    }

    // ═══════════════════════════════════════════════
    // LEADS
    // ═══════════════════════════════════════════════
    case 'leads':
    case 'lead':
    case 'l': {
      switch (action) {
        case 'list':
        case 'ls': {
          if (!positional[0]) usage('leads list <campaign_id>');
          const result = await client.listLeads(positional[0], {
            status: flags.status,
            limit: flags.limit ? parseInt(flags.limit) : 25,
          });
          const leads = result.items || result || [];
          table(leads.map((l: any) => ({
            email: l.email,
            name: `${l.first_name || ''} ${l.last_name || ''}`.trim(),
            status: l.status || l.lead_status || '',
            added: l.created_at?.slice(0, 10) || '',
          })), ['email', 'name', 'status', 'added']);
          console.log(`\n${leads.length} lead(s)`);
          break;
        }

        case 'get': {
          if (!positional[0]) usage('leads get <email>');
          const lead = await client.getLead(positional[0]);
          json(lead);
          break;
        }

        case 'add': {
          if (positional.length < 4) usage('leads add <campaign_id> <email> <first_name> <last_name> [--vars key=val,key=val]');
          const customVars: Record<string, string> = {};
          if (flags.vars) {
            for (const pair of flags.vars.split(',')) {
              const [k, v] = pair.split('=');
              if (k && v) customVars[k] = v;
            }
          }
          const result = await client.addLeads(positional[0], [{
            email: positional[1],
            first_name: positional[2],
            last_name: positional[3],
            custom_variables: Object.keys(customVars).length > 0 ? customVars : undefined,
          }]);
          console.log(`Added lead: ${positional[1]}`);
          json(result);
          break;
        }

        case 'update': {
          if (!positional[0]) usage('leads update <email> --status <status>');
          const updates: any = {};
          if (flags.status) updates.status = flags.status;
          if (flags.tags) updates.tags = flags.tags.split(',');
          await client.updateLead(positional[0], updates);
          console.log(`Updated lead: ${positional[0]}`);
          break;
        }

        case 'delete': {
          if (!positional[0]) usage('leads delete <campaign_id>');
          const result = await client.deleteLeads(positional[0], {
            status: flags.status,
            limit: flags.limit ? parseInt(flags.limit) : undefined,
          });
          console.log('Deleted leads:');
          json(result);
          break;
        }

        default:
          usage(`Unknown leads command: ${action}`);
      }
      break;
    }

    // ═══════════════════════════════════════════════
    // ACCOUNTS
    // ═══════════════════════════════════════════════
    case 'accounts':
    case 'account':
    case 'a': {
      switch (action) {
        case 'list':
        case 'ls': {
          const accounts = await client.listAccounts();
          const items = Array.isArray(accounts) ? accounts : [];
          table(items.map((a: any) => ({
            email: a.email,
            display_name: a.display_name || '',
            warmup: a.warmup_enabled ? 'on' : 'off',
            provider: a.email_service_provider || '',
            status: a.warmup_status || '',
          })), ['email', 'display_name', 'warmup', 'provider', 'status']);
          console.log(`\n${items.length} account(s)`);
          break;
        }

        case 'get': {
          if (!positional[0]) usage('accounts get <email>');
          const account = await client.getAccount(positional[0]);
          json(account);
          break;
        }

        case 'warmup': {
          if (!positional[0]) usage('accounts warmup <email1,email2,...>');
          const emails = positional[0].split(',');
          const result = await client.warmupAnalytics(emails);
          json(result);
          break;
        }

        case 'vitals':
        case 'test': {
          if (!positional[0]) usage('accounts vitals <email>');
          const result = await client.testAccountVitals(positional[0]);
          json(result);
          break;
        }

        default:
          usage(`Unknown accounts command: ${action}`);
      }
      break;
    }

    // ═══════════════════════════════════════════════
    // EMAILS
    // ═══════════════════════════════════════════════
    case 'emails':
    case 'email':
    case 'e': {
      switch (action) {
        case 'list':
        case 'ls': {
          if (!positional[0]) usage('emails list <campaign_id>');
          const emails = await client.listEmails(positional[0], {
            limit: flags.limit ? parseInt(flags.limit) : 20,
          });
          const items = Array.isArray(emails) ? emails : [];
          json(items);
          break;
        }

        default:
          usage(`Unknown emails command: ${action}`);
      }
      break;
    }

    // ═══════════════════════════════════════════════
    // FIND (search campaigns by name)
    // ═══════════════════════════════════════════════
    case 'find':
    case 'search': {
      const query = (action || '').toLowerCase();
      if (!query) usage('find <name_fragment>');
      const campaigns = await client.listCampaigns();
      const matches = campaigns.filter((c: any) =>
        (c.name || '').toLowerCase().includes(query)
      );
      table(matches.map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
      })), ['id', 'name', 'status']);
      console.log(`\n${matches.length} match(es)`);
      break;
    }

    default:
      usage(`Unknown command: ${domain}`);
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
