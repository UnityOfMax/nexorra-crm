#!/usr/bin/env node
// Webhook listener — prints all incoming requests, echoes hub.challenge for verification
// Usage: node scripts/webhook-listener.js [port]
// Expose via: cloudflared tunnel --url http://localhost:PORT

const http = require('http');
const { URL } = require('url');

const PORT = parseInt(process.argv[2] || '7777', 10);
const SECRET = process.env.PEOPLES_DM_WEBHOOK_SECRET || '';

const reset  = '\x1b[0m';
const green  = '\x1b[32m';
const cyan   = '\x1b[36m';
const yellow = '\x1b[33m';
const gray   = '\x1b[90m';
const bold   = '\x1b[1m';

function ts() {
  return gray + new Date().toISOString() + reset;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;

  console.log(`\n${ts()} ${bold}${method}${reset} ${cyan}${url.pathname}${reset}`);

  // Print query params
  if (url.searchParams.toString()) {
    console.log(`${gray}Query:${reset}`);
    for (const [k, v] of url.searchParams.entries()) {
      console.log(`  ${yellow}${k}${reset} = ${v}`);
    }
  }

  // Print headers
  console.log(`${gray}Headers:${reset}`);
  for (const [k, v] of Object.entries(req.headers)) {
    if (!['host', 'connection', 'accept-encoding'].includes(k)) {
      console.log(`  ${gray}${k}:${reset} ${v}`);
    }
  }

  // Collect body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    if (body) {
      console.log(`${gray}Body:${reset}`);
      try {
        const parsed = JSON.parse(body);
        console.log(JSON.stringify(parsed, null, 2).split('\n').map(l => '  ' + l).join('\n'));
      } catch {
        console.log('  ' + body);
      }
    }

    // Handle Meta-style GET verification
    if (method === 'GET') {
      const mode      = url.searchParams.get('hub.mode');
      const token     = url.searchParams.get('hub.verify_token')
                     || url.searchParams.get('verify_token')
                     || url.searchParams.get('secret');
      const challenge = url.searchParams.get('hub.challenge')
                     || url.searchParams.get('challenge');

      const secretMatch = !SECRET || token === SECRET;

      if (mode === 'subscribe' || challenge) {
        if (secretMatch) {
          const reply = challenge || 'ok';
          console.log(`${green}✓ Verification OK — echoing challenge: "${reply}"${reset}`);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(reply);
        } else {
          console.log(`\x1b[31m✗ Verification FAILED — token mismatch (got: ${token})${reset}`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Verification failed' }));
        }
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }

    // All other methods — just acknowledge
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true }));
    console.log(`${green}✓ Responded 200${reset}`);
  });
});

server.listen(PORT, () => {
  console.log(`${bold}Webhook listener running on port ${PORT}${reset}`);
  console.log(`${gray}Secret: ${SECRET ? SECRET.slice(0, 8) + '...' : '(none — set PEOPLES_DM_WEBHOOK_SECRET)'}${reset}`);
  console.log(`${cyan}To expose publicly:  cloudflared tunnel --url http://localhost:${PORT}${reset}`);
  console.log(`${gray}Press Ctrl+C to stop\n${reset}`);
});

process.on('SIGINT', () => {
  console.log('\nStopped.');
  process.exit(0);
});
