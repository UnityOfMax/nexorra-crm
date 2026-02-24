'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface Stage {
  id: string;
  name: string;
  position: number;
}

interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  pipeline_stages: Stage[];
}

interface CreateOpportunityConfigProps {
  node: Node;
  onUpdate: (data: any) => void;
  accountId?: string;
}

export default function CreateOpportunityConfig({ node, onUpdate, accountId }: CreateOpportunityConfigProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState<string>(node.data.config?.pipelineId || '');
  const [stageId, setStageId] = useState<string>(node.data.config?.stageId || '');
  const [title, setTitle] = useState<string>(node.data.config?.title || '');
  const [loadingPipelines, setLoadingPipelines] = useState(false);

  // Load pipelines when accountId is available
  useEffect(() => {
    if (!accountId) return;
    setLoadingPipelines(true);
    fetch(`/api/pipelines?accountId=${accountId}`)
      .then((r) => r.json())
      .then((d) => {
        const loaded: Pipeline[] = d.pipelines || [];
        setPipelines(loaded);
        // Default to the first pipeline if none selected
        if (!pipelineId && loaded.length > 0) {
          const defaultPipeline = loaded.find((p) => p.is_default) || loaded[0];
          setPipelineId(defaultPipeline.id);
          const sortedStages = [...(defaultPipeline.pipeline_stages || [])].sort((a, b) => a.position - b.position);
          if (!stageId && sortedStages.length > 0) {
            setStageId(sortedStages[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPipelines(false));
  }, [accountId]);

  // Push updates up whenever config changes
  useEffect(() => {
    onUpdate({
      config: {
        ...node.data.config,
        pipelineId,
        stageId,
        title,
      },
    });
  }, [pipelineId, stageId, title]);

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId);
  const sortedStages = [...(selectedPipeline?.pipeline_stages || [])].sort((a, b) => a.position - b.position);

  const handlePipelineChange = (newPipelineId: string) => {
    setPipelineId(newPipelineId);
    const pipeline = pipelines.find((p) => p.id === newPipelineId);
    const stages = [...(pipeline?.pipeline_stages || [])].sort((a, b) => a.position - b.position);
    setStageId(stages[0]?.id || '');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pipeline
        </label>
        {loadingPipelines ? (
          <p className="text-xs text-gray-500">Loading pipelines…</p>
        ) : pipelines.length === 0 ? (
          <p className="text-xs text-amber-600">No pipelines found. Create one in Pipelines first.</p>
        ) : (
          <select
            value={pipelineId}
            onChange={(e) => handlePipelineChange(e.target.value)}
            className="input w-full"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.is_default ? ' (default)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {sortedStages.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stage
          </label>
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="input w-full"
          >
            {sortedStages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opportunity Title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input w-full"
          placeholder="Leave blank to use contact name"
        />
        <p className="text-xs text-gray-500 mt-1">
          If blank, the opportunity will be named after the contact.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-900 mb-1">
          How this works
        </h4>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Creates a deal linked to the contact</li>
          <li>Places the deal in the selected pipeline stage</li>
          <li>If no pipeline is configured, uses your default pipeline</li>
        </ul>
      </div>
    </div>
  );
}
