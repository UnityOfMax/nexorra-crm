'use client';

import { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Settings } from 'lucide-react';
import { Pipeline, PipelineStage } from '@/types';
import CreatePipelineModal from './CreatePipelineModal';
import PipelineBoard from './PipelineBoard';
import AddOpportunityModal from './AddOpportunityModal';

interface PipelineManagerProps {
  accountId: string;
}

export default function PipelineManager({ accountId }: PipelineManagerProps) {
  const [pipelines, setPipelines] = useState<(Pipeline & { pipeline_stages: PipelineStage[] })[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<(Pipeline & { pipeline_stages: PipelineStage[] }) | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddOpportunity, setShowAddOpportunity] = useState(false);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPipelines();
  }, [accountId]);

  const loadPipelines = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pipelines?accountId=${accountId}`);
      const data = await response.json();
      if (data.pipelines) {
        setPipelines(data.pipelines);

        // Auto-select default pipeline or first pipeline
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

  const handleCreateSuccess = () => {
    loadPipelines();
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading pipelines...</div>
      </div>
    );
  }

  // If viewing a specific pipeline, show the board
  if (selectedPipeline) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with back button */}
        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between md:mb-6">
          {/* Left: back + name */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSelectedPipeline(null)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{selectedPipeline.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                  selectedPipeline.type === 'sales' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  selectedPipeline.type === 'hiring' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  selectedPipeline.type === 'support' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                  'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                }`}>
                  {selectedPipeline.type}
                </span>
                {selectedPipeline.is_default && (
                  <span className="px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-medium rounded-full flex-shrink-0">
                    Default
                  </span>
                )}
              </div>
              {selectedPipeline.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">{selectedPipeline.description}</p>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto">
            {/* Pipeline Selector */}
            {pipelines.length > 1 && (
              <select
                value={selectedPipeline.id}
                onChange={(e) => {
                  const pipeline = pipelines.find(p => p.id === e.target.value);
                  if (pipeline) setSelectedPipeline(pipeline);
                }}
                className="input text-sm pl-3 pr-8 py-1.5 max-w-[140px]"
              >
                {pipelines.map(pipeline => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            )}

            <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowAddOpportunity(true)}
              className="btn btn-primary flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add </span>Opportunity
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden">
          <PipelineBoard pipeline={selectedPipeline} accountId={accountId} refreshKey={boardRefreshKey} />
        </div>

        {showAddOpportunity && (
          <AddOpportunityModal
            accountId={accountId}
            pipelineId={selectedPipeline.id}
            stages={selectedPipeline.pipeline_stages}
            onClose={() => setShowAddOpportunity(false)}
            onSuccess={() => { setShowAddOpportunity(false); setBoardRefreshKey(k => k + 1); }}
          />
        )}
      </div>
    );
  }

  // Pipeline selection view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Opportunities</h2>
          <p className="text-gray-600 mt-1">Manage your pipelines and opportunities</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Pipeline
        </button>
      </div>

      {pipelines.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-gray-400 mb-4">
            <Plus className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No pipelines yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first pipeline to start tracking opportunities.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Your First Pipeline
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              onClick={() => setSelectedPipeline(pipeline)}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{pipeline.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  pipeline.type === 'sales' ? 'bg-blue-100 text-blue-700' :
                  pipeline.type === 'hiring' ? 'bg-green-100 text-green-700' :
                  pipeline.type === 'support' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {pipeline.type}
                </span>
              </div>

              {pipeline.description && (
                <p className="text-sm text-gray-600 mb-4">{pipeline.description}</p>
              )}

              {/* Stage Count */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {pipeline.pipeline_stages?.length || 0} stages
                </span>
                {pipeline.is_default && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                    Default
                  </span>
                )}
              </div>

              {/* Stage Preview */}
              {pipeline.pipeline_stages && pipeline.pipeline_stages.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex gap-1">
                    {pipeline.pipeline_stages
                      .sort((a, b) => a.position - b.position)
                      .slice(0, 5)
                      .map(stage => (
                        <div
                          key={stage.id}
                          className="h-2 flex-1 rounded-full"
                          style={{ backgroundColor: stage.color }}
                          title={stage.name}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Pipeline Modal */}
      {showCreateModal && (
        <CreatePipelineModal
          accountId={accountId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
