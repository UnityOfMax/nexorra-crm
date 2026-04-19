'use client';

import { useState, useEffect } from 'react';
import { Pipeline, PipelineStage } from '@/types';
import CreatePipelineModal from './CreatePipelineModal';
import PipelineBoard from './PipelineBoard';
import AddOpportunityModal from './AddOpportunityModal';

interface PipelineManagerProps {
  accountId: string;
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  sales:   { bg: 'oklch(94% 0.05 258 / 0.3)', color: 'var(--blue)' },
  hiring:  { bg: 'oklch(94% 0.05 160 / 0.3)', color: 'var(--green)' },
  support: { bg: 'oklch(94% 0.05 300 / 0.3)', color: 'var(--violet)' },
  custom:  { bg: 'var(--paper-3)',             color: 'var(--ink-2)' },
};

export default function PipelineManager({ accountId }: PipelineManagerProps) {
  const [pipelines, setPipelines] = useState<(Pipeline & { pipeline_stages: PipelineStage[] })[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<(Pipeline & { pipeline_stages: PipelineStage[] }) | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddOpportunity, setShowAddOpportunity] = useState(false);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPipelines(); }, [accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPipelines = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pipelines?accountId=${accountId}`);
      const data = await response.json();
      if (data.pipelines) {
        setPipelines(data.pipelines);
        if (!selectedPipeline && data.pipelines.length > 0) {
          const defaultPipeline = data.pipelines.find((p: Pipeline) => p.is_default) || data.pipelines[0];
          setSelectedPipeline(defaultPipeline);
        }
      }
    } catch (error) {
      console.error('Error loading pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => { loadPipelines(); setShowCreateModal(false); };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--ink-3)', fontSize: 14 }}>
        Loading pipelines…
      </div>
    );
  }

  // Board view
  if (selectedPipeline) {
    const tc = TYPE_COLORS[selectedPipeline.type] || TYPE_COLORS.custom;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSelectedPipeline(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{selectedPipeline.name}</h1>
                <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11.5, fontWeight: 500, background: tc.bg, color: tc.color }}>{selectedPipeline.type}</span>
                {selectedPipeline.is_default && <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11.5, fontWeight: 500, background: 'oklch(94% 0.05 258 / 0.3)', color: 'var(--blue)' }}>Default</span>}
              </div>
              {selectedPipeline.description && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{selectedPipeline.description}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {pipelines.length > 1 && (
              <select value={selectedPipeline.id} onChange={e => { const p = pipelines.find(pl => pl.id === e.target.value); if (p) setSelectedPipeline(p); }}
                style={{ padding: '7px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none', cursor: 'pointer' }}>
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M21 12h-2M17.66 17.66l-1.41-1.41M12 21v-2M4.34 17.66l1.41-1.41M3 12H1M6.34 6.34L4.93 4.93M12 3V1"/></svg>
            </button>
            <button onClick={() => setShowAddOpportunity(true)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: 'none', background: 'var(--grad)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Opportunity
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <PipelineBoard pipeline={selectedPipeline} accountId={accountId} refreshKey={boardRefreshKey} />
        </div>

        {showAddOpportunity && (
          <AddOpportunityModal accountId={accountId} pipelineId={selectedPipeline.id} stages={selectedPipeline.pipeline_stages}
            onClose={() => setShowAddOpportunity(false)} onSuccess={() => { setShowAddOpportunity(false); setBoardRefreshKey(k => k + 1); }} />
        )}
      </div>
    );
  }

  // Pipeline selection view
  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Pipelines</h1>
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>Manage deal pipelines and track opportunities</div>
        </div>
        <button onClick={() => setShowCreateModal(true)} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: 'none', background: 'var(--grad)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Pipeline
        </button>
      </div>

      {pipelines.length === 0 ? (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>◫</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>No pipelines yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginBottom: 20 }}>Create your first pipeline to start tracking opportunities.</div>
          <button onClick={() => setShowCreateModal(true)} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: 'none', background: 'var(--grad)', color: 'white', cursor: 'pointer' }}>
            Create Your First Pipeline
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {pipelines.map(pipeline => {
            const tc = TYPE_COLORS[pipeline.type] || TYPE_COLORS.custom;
            const sorted = [...(pipeline.pipeline_stages || [])].sort((a, b) => a.position - b.position);
            return (
              <div key={pipeline.id} onClick={() => setSelectedPipeline(pipeline)} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 120ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{pipeline.name}</div>
                  <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11.5, fontWeight: 500, background: tc.bg, color: tc.color }}>{pipeline.type}</span>
                </div>
                {pipeline.description && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 12 }}>{pipeline.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>
                  <span>{sorted.length} stages</span>
                  {pipeline.is_default && <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: 'oklch(94% 0.05 258 / 0.3)', color: 'var(--blue)' }}>Default</span>}
                </div>
                {sorted.length > 0 && (
                  <div style={{ display: 'flex', gap: 3 }}>
                    {sorted.slice(0, 6).map(stage => (
                      <div key={stage.id} title={stage.name} style={{ height: 5, flex: 1, borderRadius: 3, background: stage.color || 'var(--line-2)' }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && <CreatePipelineModal accountId={accountId} onClose={() => setShowCreateModal(false)} onSuccess={handleCreateSuccess} />}
    </div>
  );
}
