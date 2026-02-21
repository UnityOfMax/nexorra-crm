'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Pipeline, PipelineStage, DealExtended } from '@/types';
import DealCard from './DealCard';

interface PipelineBoardProps {
  pipeline: Pipeline & { pipeline_stages: PipelineStage[] };
  accountId: string;
  refreshKey?: number;
}

export default function PipelineBoard({ pipeline, accountId, refreshKey }: PipelineBoardProps) {
  const [deals, setDeals] = useState<DealExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageDeals, setStageDeals] = useState<Record<string, DealExtended[]>>({});

  useEffect(() => {
    loadDeals();
  }, [pipeline.id, refreshKey]);

  const loadDeals = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetch(`/api/deals?accountId=${accountId}&pipelineId=${pipeline.id}`)
        .then(res => res.json());

      if (!error && data) {
        setDeals(data);
        organizeDeals(data);
      }
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeDeals = (dealsData: DealExtended[]) => {
    const organized: Record<string, DealExtended[]> = {};

    // Initialize all stages with empty arrays
    pipeline.pipeline_stages.forEach(stage => {
      organized[stage.id] = [];
    });

    // Organize deals by stage
    dealsData.forEach(deal => {
      if (deal.pipeline_stage_id && organized[deal.pipeline_stage_id]) {
        organized[deal.pipeline_stage_id].push(deal);
      }
    });

    setStageDeals(organized);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceStageId = source.droppableId;
    const destStageId = destination.droppableId;
    const dealId = draggableId;

    // Optimistic update
    const newStageDeals = { ...stageDeals };
    const sourceDeals = Array.from(newStageDeals[sourceStageId]);
    const destDeals = sourceStageId === destStageId
      ? sourceDeals
      : Array.from(newStageDeals[destStageId]);

    const [movedDeal] = sourceDeals.splice(source.index, 1);
    movedDeal.pipeline_stage_id = destStageId;

    if (sourceStageId === destStageId) {
      // Reordering within the same column
      sourceDeals.splice(destination.index, 0, movedDeal);
      newStageDeals[sourceStageId] = sourceDeals;
    } else {
      // Moving to a different column
      destDeals.splice(destination.index, 0, movedDeal);
      newStageDeals[sourceStageId] = sourceDeals;
      newStageDeals[destStageId] = destDeals;
    }

    setStageDeals(newStageDeals);

    // API call to update the deal
    try {
      const response = await fetch(`/api/deals/${dealId}/move-stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineStageId: destStageId,
          position: destination.index,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to move deal');
      }

      // Reload deals to get updated data
      await loadDeals();
    } catch (error) {
      console.error('Error moving deal:', error);
      // Revert optimistic update on error
      organizeDeals(deals);
      alert('Failed to move deal. Please try again.');
    }
  };

  const calculateStageValue = (stageId: string): number => {
    return stageDeals[stageId]?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Pipeline Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{pipeline.name}</h3>
        {pipeline.description && (
          <p className="text-sm text-gray-600 mt-1">{pipeline.description}</p>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-h-full pb-4">
            {pipeline.pipeline_stages
              .sort((a, b) => a.position - b.position)
              .map(stage => (
                <Droppable key={stage.id} droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-shrink-0 w-80 flex flex-col ${
                        snapshot.isDraggingOver ? 'bg-gray-50' : ''
                      }`}
                    >
                      {/* Stage Header */}
                      <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <h4 className="font-semibold text-gray-900">{stage.name}</h4>
                          <span className="ml-auto text-sm text-gray-500">
                            {stageDeals[stage.id]?.length || 0}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                          ${(calculateStageValue(stage.id) / 1000).toFixed(1)}k
                        </div>
                      </div>

                      {/* Deals Column */}
                      <div className="flex-1 space-y-2 min-h-[200px]">
                        {stageDeals[stage.id]?.map((deal, index) => (
                          <Draggable
                            key={deal.id}
                            draggableId={deal.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <DealCard
                                  deal={deal}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>

                    </div>
                  )}
                </Droppable>
              ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
