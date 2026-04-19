'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import LandingPageBuilder from './LandingPageBuilder';
import LandingPageFieldsEditor from './LandingPageFieldsEditor';
import { templates, getEmptyContent } from '@/lib/landing-page-templates';
import type { LandingPage } from '@/types';

interface LandingPageListProps {
  accountId: string;
  accountSlug: string;
  isAgencyUser?: boolean;
}

const THUMB_HUES = ['#4f46e5', '#7c3aed', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899'];

function PageThumbnail({ hue, onClick }: { hue: string; onClick: () => void }) {
  const id = `diag-${hue.replace('#', '')}`;
  return (
    <div
      onClick={onClick}
      style={{
        height: 140, borderRadius: '13px 13px 0 0', cursor: 'pointer', overflow: 'hidden',
        background: `${hue}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 320 140" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={id} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <line x1="0" y1="24" x2="24" y2="0" stroke={hue} strokeWidth="1" opacity="0.22" />
          </pattern>
        </defs>
        <rect width="320" height="140" fill={`url(#${id})`} />
      </svg>
      {/* Centered page icon */}
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={hue} strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.3, position: 'relative', zIndex: 1 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, borderRadius: 99, padding: '3px 9px',
      background: published ? 'var(--green-soft)' : 'var(--paper-3)',
      color: published ? 'var(--green)' : 'var(--ink-3)',
      border: `1px solid ${published ? 'var(--green-soft)' : 'var(--line)'}`,
      whiteSpace: 'nowrap',
    }}>
      {published ? 'Active' : 'Draft'}
    </span>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'var(--paper-2)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: '18px 20px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Geist Mono, monospace', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, fontFamily: 'Geist Mono, monospace' }}>
        {value}
      </div>
    </div>
  );
}

export default function LandingPageList({ accountId, accountSlug, isAgencyUser }: LandingPageListProps) {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [editingFieldsPage, setEditingFieldsPage] = useState<LandingPage | null>(null);
  const [showCreateChoice, setShowCreateChoice] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<typeof templates[0] | null>(null);

  useEffect(() => {
    loadPages();
  }, [accountId]);

  const loadPages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/landing-pages?accountId=${accountId}`);
      const data = await response.json();
      if (response.ok) {
        setPages(data.pages || []);
      }
    } catch (error) {
      console.error('Error loading landing pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPage = async (name: string, slug: string, content?: any, connectPixel?: boolean) => {
    try {
      const response = await fetch('/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          name,
          slug,
          content: content || getEmptyContent(),
          connect_pixel: connectPixel === true,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setEditingPage(data.page);
        loadPages();
      } else {
        toast.error('Failed to create page');
      }
    } catch (error) {
      console.error('Error creating page:', error);
      toast.error('Failed to create page');
    }
  };

  const publishPage = async (page: LandingPage) => {
    try {
      const response = await fetch(`/api/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: page.name,
          slug: page.slug,
          content: page.content,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
          connect_pixel: page.connect_pixel,
          published: true,
        }),
      });
      if (response.ok) {
        loadPages();
      }
    } catch (error) {
      console.error('Error publishing page:', error);
    }
  };

  const deletePage = async (page: LandingPage) => {
    if (!confirm(`Delete "${page.name}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/landing-pages/${page.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Page deleted');
        loadPages();
      } else {
        toast.error('Failed to delete page');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Failed to delete page');
    }
  };

  const filteredPages = pages.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (editingPage) {
    return (
      <LandingPageBuilder
        page={editingPage}
        accountId={accountId}
        accountSlug={accountSlug}
        onBack={() => {
          setEditingPage(null);
          loadPages();
        }}
      />
    );
  }

  const totalVisits = pages.reduce((acc, p) => acc + ((p as any).visits_30d || 0), 0);
  const totalConversions = pages.reduce((acc, p) => acc + ((p as any).form_fills || 0), 0);

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }} className="nx-pad-mobile">
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, fontFamily: 'Geist Mono, monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Nexorra</span>
        <span style={{ color: 'var(--line-2)' }}>›</span>
        <span>Landing Pages</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
          Landing Pages
        </h1>
        <button
          onClick={() => setShowCreateChoice(true)}
          style={{
            padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: 'var(--grad)', border: 'none',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Page
        </button>
      </div>

      {/* KPI Cards — 4-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }} className="nx-2col-mobile">
        <KpiCard label="Total Pages" value={pages.length} />
        <KpiCard label="Visitors / 30d" value={totalVisits || '—'} />
        <KpiCard label="Conversions" value={totalConversions || '—'} />
        <KpiCard label="Active A/B Tests" value={2} />
      </div>

      {/* Search */}
      {pages.length > 0 && (
        <div style={{
          background: 'var(--paper-2)', border: '1px solid var(--line)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: 'var(--ink)', flex: 1,
            }}
          />
        </div>
      )}

      {/* Pages Grid — 3-col */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="nx-stack-mobile">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filteredPages.length === 0 ? (
        <div style={{
          background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '64px 24px', textAlign: 'center',
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.4 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>
            {searchQuery ? 'No pages found' : 'No landing pages yet'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 20px' }}>
            {searchQuery ? 'Try a different search term.' : 'Create your first landing page to start capturing leads.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateChoice(true)}
              style={{
                padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: 'var(--grad)', border: 'none', color: '#fff', cursor: 'pointer',
              }}
            >
              Create your first page
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="nx-stack-mobile">
          {filteredPages.map((page, idx) => {
            const hue = THUMB_HUES[idx % THUMB_HUES.length];
            const visits = (page as any).visits_30d ?? 0;
            const fills = (page as any).form_fills ?? 0;
            const cvr = visits > 0 ? ((fills / visits) * 100).toFixed(1) : '0.0';
            const updatedAt = new Date(page.updated_at || page.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div key={page.id} style={{
                background: 'var(--paper-2)', border: '1px solid var(--line)',
                borderRadius: 14, overflow: 'hidden', position: 'relative',
              }}>
                {/* Thumbnail */}
                <div style={{ position: 'relative' }}>
                  <PageThumbnail hue={hue} onClick={() => setEditingPage(page)} />
                  {/* Status badge top-right */}
                  <span style={{
                    position: 'absolute', top: 10, right: 10,
                    fontSize: 11, fontWeight: 600, borderRadius: 99, padding: '3px 9px',
                    background: page.published ? 'var(--green-soft)' : 'var(--paper-3)',
                    color: page.published ? 'var(--green)' : 'var(--ink-3)',
                    border: `1px solid ${page.published ? 'var(--green-soft)' : 'var(--line)'}`,
                  }}>
                    {page.published ? 'Active' : 'Draft'}
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <h3
                      onClick={() => setEditingPage(page)}
                      style={{
                        fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0,
                        cursor: 'pointer', flex: 1, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {page.name}
                    </h3>
                    {page.connect_pixel && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 99,
                        background: 'var(--violet-soft)', color: 'var(--violet)',
                        flexShrink: 0,
                      }}>
                        Pixel
                      </span>
                    )}
                  </div>

                  {/* Slug */}
                  <p style={{
                    fontSize: 11.5, color: 'var(--ink-3)', margin: '0 0 12px',
                    fontFamily: 'Geist Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    /{page.slug}
                  </p>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
                    <span>Visits: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{visits || '—'}</span></span>
                    <span>CVR: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{visits ? `${cvr}%` : '—'}</span></span>
                    <span>Updated: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{updatedAt}</span></span>
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    paddingTop: 12, borderTop: '1px solid var(--line)',
                  }}>
                    <button
                      onClick={() => setEditingPage(page)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none',
                        cursor: 'pointer', padding: '4px 0',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </button>

                    {isAgencyUser && (
                      <button
                        onClick={() => setEditingFieldsPage(page)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none',
                          cursor: 'pointer', padding: '4px 0',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Fields
                      </button>
                    )}

                    {!page.published && (
                      <button
                        onClick={() => publishPage(page)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          fontSize: 12, fontWeight: 600, color: 'var(--blue)',
                          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Publish
                      </button>
                    )}

                    {page.published && (
                      <a
                        href={`https://app.ainexorra.com/account/${accountSlug}/landing-pages/${page.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          fontSize: 12, color: 'var(--ink-3)',
                          textDecoration: 'none', padding: '4px 0',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        View
                      </a>
                    )}

                    <button
                      onClick={() => deletePage(page)}
                      style={{
                        marginLeft: 'auto', display: 'flex', alignItems: 'center',
                        fontSize: 12, color: 'var(--rose)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" /><path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Choice Modal */}
      {showCreateChoice && (
        <CreateChoiceModal
          onFromScratch={() => {
            setShowCreateChoice(false);
            setPendingTemplate(null);
            setCreateModalOpen(true);
          }}
          onFromTemplate={() => {
            setShowCreateChoice(false);
            setShowTemplates(true);
          }}
          onClose={() => setShowCreateChoice(false)}
        />
      )}

      {/* Template Picker Modal */}
      {showTemplates && (
        <TemplatePicker
          onSelect={(template) => {
            setShowTemplates(false);
            setPendingTemplate(template);
            setCreateModalOpen(true);
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Create Page Name Modal */}
      {createModalOpen && (
        <CreatePageNameModal
          defaultName={pendingTemplate?.name || ''}
          onConfirm={(name, connectPixel) => {
            setCreateModalOpen(false);
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            createPage(name, slug, pendingTemplate?.content, connectPixel);
            setPendingTemplate(null);
          }}
          onClose={() => { setCreateModalOpen(false); setPendingTemplate(null); }}
        />
      )}

      {/* Fields Editor Modal */}
      {editingFieldsPage && (
        <LandingPageFieldsEditor
          page={editingFieldsPage}
          onClose={() => setEditingFieldsPage(null)}
          onSave={() => {
            setEditingFieldsPage(null);
            loadPages();
          }}
        />
      )}
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
};

function CreateChoiceModal({ onFromScratch, onFromTemplate, onClose }: {
  onFromScratch: () => void;
  onFromTemplate: () => void;
  onClose: () => void;
}) {
  return (
    <div style={modalBackdrop}>
      <div style={{
        background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 16,
        maxWidth: 420, width: '100%', padding: 28,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', margin: '0 0 20px', textAlign: 'center' }}>
          Create Landing Page
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <button
            onClick={onFromScratch}
            style={{
              padding: '20px 16px', border: '1px solid var(--line)', borderRadius: 10,
              background: 'var(--paper)', cursor: 'pointer', textAlign: 'center',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 10px', display: 'block' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: '0 0 3px' }}>From Scratch</p>
            <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>Empty canvas</p>
          </button>
          <button
            onClick={onFromTemplate}
            style={{
              padding: '20px 16px', border: '1px solid var(--line)', borderRadius: 10,
              background: 'var(--paper)', cursor: 'pointer', textAlign: 'center',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 10px', display: 'block' }}>
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: '0 0 3px' }}>From Template</p>
            <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>Pre-built designs</p>
          </button>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 8,
            border: '1px solid var(--line)', background: 'transparent',
            color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CreatePageNameModal({ defaultName, onConfirm, onClose }: {
  defaultName: string;
  onConfirm: (name: string, connectPixel: boolean) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [connectPixel, setConnectPixel] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed, connectPixel);
  };

  return (
    <div style={modalBackdrop}>
      <div style={{
        background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 16,
        maxWidth: 360, width: '100%', padding: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Name Your Page</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 4 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>
              Page Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Landing Page"
              autoFocus
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                border: '1px solid var(--line)', background: 'var(--paper-3)',
                color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', borderTop: '1px solid var(--line)', marginBottom: 16,
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', margin: '0 0 2px' }}>
                Connect to Facebook Pixel
              </p>
              <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>
                Track PageView, Lead &amp; Schedule
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConnectPixel(p => !p)}
              style={{
                position: 'relative', width: 44, height: 24, borderRadius: 99,
                background: connectPixel ? 'var(--blue)' : 'var(--line)',
                border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: connectPixel ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13,
                border: '1px solid var(--line)', background: 'transparent',
                color: 'var(--ink-3)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={!name.trim()}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', background: name.trim() ? 'var(--grad)' : 'var(--line)',
                color: name.trim() ? '#fff' : 'var(--ink-3)', cursor: name.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplatePicker({ onSelect, onClose }: {
  onSelect: (template: typeof templates[0]) => void;
  onClose: () => void;
}) {
  return (
    <div style={modalBackdrop}>
      <div style={{
        background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 16,
        maxWidth: 560, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--line)',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Choose a Template
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              style={{
                padding: 20, border: '1px solid var(--line)', borderRadius: 10,
                background: 'var(--paper)', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 28, display: 'block', marginBottom: 10 }}>{template.thumbnail}</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>{template.name}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 6px' }}>{template.description}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>{template.content.blocks.length} blocks</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
