const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkPendingMessages() {
  try {
    // Step 1: Get all enabled AI agent configs
    const configsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_agent_configs?enabled=eq.true&select=account_id`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      }
    );
    
    if (!configsRes.ok) {
      console.error(`Supabase error: ${configsRes.status}`, await configsRes.text());
      return;
    }
    
    const configs = await configsRes.json();
    console.log(`Found ${configs.length} enabled AI agent accounts`);
    
    if (configs.length === 0) {
      console.log('No enabled AI agent configs found. Exiting.');
      return;
    }
    
    // Step 2: For each account, check for unreplied inbound messages
    let totalPending = 0;
    
    for (const config of configs) {
      const accountId = config.account_id;
      
      const messagesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?account_id=eq.${accountId}&direction=eq.inbound&is_ai_generated=is.null&select=id,contact_id,type,content,created_at,metadata&order=created_at.desc&limit=10`,
        {
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
          }
        }
      );
      
      if (!messagesRes.ok) {
        console.error(`Error fetching messages for account ${accountId}:`, await messagesRes.text());
        continue;
      }
      
      const messages = await messagesRes.json();
      console.log(`Account ${accountId}: ${messages.length} unreplied inbound messages`);
      
      if (messages.length > 0) {
        messages.forEach(msg => {
          console.log(`  - [${msg.type.toUpperCase()}] Contact ${msg.contact_id}: "${msg.content.substring(0, 50)}..."`);
        });
        totalPending += messages.length;
      }
    }
    
    console.log(`\nTotal pending messages: ${totalPending}`);
    
    if (totalPending === 0) {
      console.log('No pending messages. Agent idle.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPendingMessages();
