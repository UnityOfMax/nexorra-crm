import 'dotenv/config';
import { InstantlyClient } from '../lib/instantly/client';
import { syncInstantlyStatuses } from '../lib/instantly/sync';

async function main() {
  console.log(`[instantly-sync] Starting at ${new Date().toISOString()}`);

  const client = new InstantlyClient();

  // Get campaign ID
  const campaigns = await client.listCampaigns();
  if (!campaigns || campaigns.length === 0) {
    console.log('[instantly-sync] No campaigns found');
    return;
  }

  for (const campaign of campaigns) {
    console.log(`[instantly-sync] Syncing campaign: ${campaign.name || campaign.id}`);
    const result = await syncInstantlyStatuses(client, campaign.id);
    console.log(`[instantly-sync] Synced ${result.synced} leads`);
  }

  console.log(`[instantly-sync] Done`);
}

main().catch(e => { console.error(e); process.exit(1); });
