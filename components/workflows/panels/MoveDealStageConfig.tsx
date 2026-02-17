'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface MoveDealStageConfigProps {
  node: Node;
  onUpdate: (data: any) => void;
}

export default function MoveDealStageConfig({ node, onUpdate }: MoveDealStageConfigProps) {
  const [pipelineId, setPipelineId] = useState(node.data.config?.pipelineId || '');
  const [stageId, setStageId] = useState(node.data.config?.stageId || '');
  const [createIfMissing, setCreateIfMissing] = useState(
    node.data.config?.createIfMissing || false
  );

  useEffect(() => {
    onUpdate({
      config: {
        ...node.data.config,
        pipelineId,
        stageId,
        createIfMissing,
      },
    });
  }, [pipelineId, stageId, createIfMissing]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Pipeline
        </label>
        <input
          type="text"
          value={pipelineId}
          onChange={(e) => setPipelineId(e.target.value)}
          className="input w-full"
          placeholder="Enter pipeline ID or leave empty for current pipeline"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave empty to use the deal's current pipeline
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Stage ID
        </label>
        <input
          type="text"
          value={stageId}
          onChange={(e) => setStageId(e.target.value)}
          className="input w-full"
          placeholder="Enter stage ID or stage name"
        />
        <p className="text-xs text-gray-500 mt-1">
          You can use the stage ID or stage name (e.g., "Qualified", "Proposal")
        </p>
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="createIfMissing"
          checked={createIfMissing}
          onChange={(e) => setCreateIfMissing(e.target.checked)}
          className="mt-1"
        />
        <div>
          <label htmlFor="createIfMissing" className="text-sm font-medium text-gray-700 cursor-pointer">
            Create deal if it doesn't exist
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            If the contact doesn't have a deal, create one in this stage
          </p>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-indigo-900 mb-2">
          How to Find Stage IDs
        </h4>
        <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
          <li>Go to Pipelines in your CRM</li>
          <li>Click on the pipeline you want</li>
          <li>Hover over a stage to see its ID in the URL</li>
          <li>Or use the stage name directly (e.g., "Qualified")</li>
        </ol>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-amber-900 mb-1">
          Stage Movement Notes
        </h4>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>Moving a deal will trigger "Deal Stage Changed" workflows</li>
          <li>If the stage is marked as Won/Lost, the deal status will update</li>
          <li>An activity will be logged for the stage change</li>
        </ul>
      </div>
    </div>
  );
}
