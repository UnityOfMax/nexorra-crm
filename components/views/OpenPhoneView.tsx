'use client';
import React, { useState, useEffect } from 'react';
import { Card, Avatar, Badge } from '../ui/primitives';
import { Icons } from '../Icons';
import type { SubAccount } from '../Sidebar';
import TextingAnalytics from '../TextingAnalytics';

interface OpenPhoneViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
  userRole?: string;
}

const STEP_STATUS: Array<'pending' | 'done' | 'action'> = ['action', 'pending', 'pending', 'pending', 'pending'];

function Step({ num, title, status, children }: {
  num: number; title: string; status: 'pending' | 'done' | 'action'; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(status === 'action');
  return (
    <div style={{
      border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden',
      background: status === 'done' ? 'var(--paper-2)' : 'var(--paper)',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 999, flexShrink: 0,
          background: status === 'done' ? 'var(--green)' : status === 'action' ? 'var(--blue)' : 'var(--paper-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: status === 'pending' ? 'var(--ink-3)' : '#fff',
          fontSize: 12, fontWeight: 700, fontFamily: 'Geist Mono, monospace',
        }}>
          {status === 'done' ? <Icons.check size={14} /> : num}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: status === 'pending' ? 'var(--ink-3)' : 'var(--ink)' }}>{title}</div>
        </div>
        <Badge tone={status === 'done' ? 'green' : status === 'action' ? 'blue' : 'neutral'}>
          {status === 'done' ? 'Done' : status === 'action' ? 'Do this now' : 'Pending'}
        </Badge>
        <span style={{ color: 'var(--ink-3)' }}>
          {open ? <Icons.chev size={14} /> : <Icons.chevR size={14} />}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--line)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: 'relative', marginTop: 10, marginBottom: 10 }}>
      <pre style={{
        background: 'var(--paper-3)', border: '1px solid var(--line)', borderRadius: 8,
        padding: '12px 16px', fontSize: 12.5, fontFamily: 'Geist Mono, monospace',
        overflowX: 'auto', margin: 0, color: 'var(--ink-2)', lineHeight: 1.6,
      }}>{children}</pre>
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        style={{
          position: 'absolute', top: 8, right: 8, padding: '3px 8px', fontSize: 11,
          background: copied ? 'var(--green)' : 'var(--paper-2)', border: '1px solid var(--line)',
          borderRadius: 5, cursor: 'pointer', color: copied ? '#fff' : 'var(--ink-3)',
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function OpenPhoneView({ sub }: OpenPhoneViewProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch('/api/texting/settings')
      .then(r => r.json())
      .then((d: { texting_enabled?: boolean }) => {
        if (typeof d.texting_enabled === 'boolean') setEnabled(d.texting_enabled);
      })
      .catch(() => {/* silently ignore */});
  }, []);

  async function toggle() {
    if (enabled === null || toggling) return;
    const next = !enabled;
    setEnabled(next);
    setToggling(true);
    try {
      await fetch('/api/texting/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texting_enabled: next }),
      });
    } catch {
      setEnabled(!next);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 860, margin: '0 auto' }} className="nx-pad-mobile">
      {/* Texting toggle */}
      {enabled !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500,
            background: enabled ? 'var(--green-soft)' : 'var(--rose-soft)',
            color: enabled ? 'var(--green)' : 'var(--red)',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: enabled ? 'var(--green)' : 'var(--red)' }} />
            Texting {enabled ? 'ON' : 'OFF'}
          </span>
          <button onClick={toggle} style={{
            padding: '4px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: enabled ? 'var(--rose-soft)' : 'var(--green-soft)',
            color: enabled ? 'var(--red)' : 'var(--green)',
            border: '1px solid currentColor', cursor: 'pointer',
          }}>
            {toggling ? '...' : enabled ? 'Turn off' : 'Turn on'}
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar tag={sub.tag} color={sub.color} size={16} /> {sub.name} <Icons.chevR size={12} /> OpenPhone Outreach
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>OpenPhone Outreach</h1>
        <div style={{ color: 'var(--ink-3)', fontSize: 13.5, marginTop: 4 }}>
          AT-SPI automation of the Quo desktop client — no screenshots, no Anthropic API calls
        </div>
      </div>

      {/* Status strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }} className="nx-2col-mobile">
        {[
          { l: 'Texts sent', v: '0', d: 'not configured yet' },
          { l: 'Replies received', v: '0', d: 'not configured yet' },
          { l: 'Reply rate', v: '—', d: 'not configured yet' },
          { l: 'Quo status', v: 'Not installed', d: 'install below', warn: true },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Geist Mono, monospace' }}>{k.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, color: k.warn ? 'var(--amber)' : 'var(--ink)', fontFamily: 'Geist Mono, monospace' }}>{k.v}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{k.d}</div>
          </div>
        ))}
      </div>

      {/* Setup steps */}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Setup</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        <Step num={1} title="Install Quo (OpenPhone desktop app)" status="action">
          <div style={{ paddingTop: 14, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            Quo is the OpenPhone desktop client for Linux. Download the AppImage:
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
            1. Go to <strong>openphone.com</strong>, download the Linux AppImage<br />
            2. Move it somewhere permanent (e.g. <code style={{ fontFamily: 'Geist Mono, monospace', background: 'var(--paper-3)', padding: '1px 5px', borderRadius: 4 }}>~/apps/quo.AppImage</code>)<br />
            3. Make it executable and create a launcher:
          </div>
          <Code>{`chmod +x ~/apps/quo.AppImage

# Create launcher script
cat > ~/bin/quo << 'EOF'
#!/bin/bash
~/apps/quo.AppImage "$@"
EOF
chmod +x ~/bin/quo`}</Code>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>
            Verify it launches: <code style={{ fontFamily: 'Geist Mono, monospace', background: 'var(--paper-3)', padding: '1px 5px', borderRadius: 4 }}>DISPLAY=:0 quo &</code>
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--amber-soft, rgba(245,158,11,0.08))', borderRadius: 8, fontSize: 12.5, color: 'var(--amber)' }}>
            Once installed, tell me "quo is installed" and I will continue with the next steps.
          </div>
        </Step>

        <Step num={2} title="Install AT-SPI accessibility tools" status="pending">
          <div style={{ paddingTop: 14, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            AT-SPI is Linux's built-in accessibility bus. It exposes every UI element in every running app as a tree — no screenshots, no AI vision, just direct O(1) element access.
          </div>
          <Code>{`sudo apt install at-spi2-core python3-pyatspi accerciser`}</Code>
        </Step>

        <Step num={3} title="Inspect Quo's UI tree with Accerciser" status="pending">
          <div style={{ paddingTop: 14, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            Launch Quo and run Accerciser (the AT-SPI inspector) to find the exact names of the 4 UI elements we need to automate:
          </div>
          <Code>{`# Terminal 1: launch Quo on your display
DISPLAY=:0 quo &
sleep 3

# Terminal 2: launch Accerciser inspector
DISPLAY=:0 accerciser`}</Code>
          <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.7 }}>
            In Accerciser, expand the tree to find Quo's window. Look for these 4 elements and note their <strong>accessible name</strong> (the text shown in the "Name" column):
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'New Message button', hint: 'Usually a compose/pencil icon button in the top bar' },
              { label: 'Phone number input', hint: 'Text field where you type the recipient number' },
              { label: 'Message text field', hint: 'The main text area where you type your message' },
              { label: 'Send button', hint: 'The button to send the message' },
            ].map((el, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'var(--paper-3)', borderRadius: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{el.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{el.hint}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--blue-soft, rgba(59,130,246,0.08))', borderRadius: 8, fontSize: 12.5, color: 'var(--blue)' }}>
            Report back the 4 accessible names you find and I will build the automation script.
          </div>
        </Step>

        <Step num={4} title="Run the DB migration for text tracking columns" status="pending">
          <div style={{ paddingTop: 14, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 10 }}>
            Run this SQL in the Supabase SQL editor to add the texting columns to the leads table:
          </div>
          <Code>{`ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_texted_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS text_status text;
  -- values: 'initial_sent', 'followup_sent', 'replied'
ALTER TABLE leads ADD COLUMN IF NOT EXISTS text_reply_at timestamptz;`}</Code>
        </Step>

        <Step num={5} title="Install the send-texts.py daemon + cron" status="pending">
          <div style={{ paddingTop: 14, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 8 }}>
            Once I know the 4 accessible names from step 3, I will generate <code style={{ fontFamily: 'Geist Mono, monospace', background: 'var(--paper-3)', padding: '1px 5px', borderRadius: 4 }}>scripts/texting/send-texts.py</code>. The daemon will:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--ink-2)' }}>
            {[
              'Query leads where last_texted_at IS NULL (initial) or last_texted_at < 3 days ago + no reply (follow-up)',
              'Use pyatspi to navigate Quo → compose → send message for each lead',
              'Update leads table: last_texted_at, text_status',
              'Max 50 messages/day (OpenPhone rate limit). Runs every 30 min, 9 AM–8 PM only.',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 18, height: 18, borderRadius: 999, background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0, marginTop: 1, fontFamily: 'Geist Mono, monospace' }}>{i + 1}</div>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-3)' }}>
            Message templates use <code style={{ fontFamily: 'Geist Mono, monospace', background: 'var(--paper-3)', padding: '1px 5px', borderRadius: 4 }}>{'{first_name}'}</code> and <code style={{ fontFamily: 'Geist Mono, monospace', background: 'var(--paper-3)', padding: '1px 5px', borderRadius: 4 }}>{'{city}'}</code> from the lead record. No Anthropic API — template-only for minimal CPU/cost.
          </div>
        </Step>
      </div>

      <div style={{ marginTop: 28, padding: '16px 20px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--paper-2)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
        <strong>Why AT-SPI instead of screenshots?</strong> AT-SPI tree queries are O(1) element lookups — ~50ms per message send vs 2-3s for Claude vision. No Anthropic API calls at runtime. Python + pyatspi footprint is under 30MB. The cron runs every 30 min but each execution is &lt;5s.
      </div>

      <div style={{ marginTop: 32 }}>
        <TextingAnalytics />
      </div>
    </div>
  );
}
