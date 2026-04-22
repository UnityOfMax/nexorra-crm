'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { toast } from 'sonner';
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
  const [mobileStageId, setMobileStageId] = useState<string | null>(null);

  useEffect(() => {
    loadDeals();
    // Default mobile stage to first stage
    const sorted = [...pipeline.pipeline_stages].sort((a, b) => a.position - b.position);
    if (sorted.length > 0 && !mobileStageId) {
      setMobileStageId(sorted[0].id);
    }
  }, [pipeline.id, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const organizeDeals = useCallback((dealsData: DealExtended[]) => {
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
  }, [pipeline.pipeline_stages]);

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

      if (!response.ok) throw new Error('Failed to move deal');
      // Update deals array to match the optimistic UI (skip full reload)
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, pipeline_stage_id: destStageId } : d));
    } catch (error) {
      console.error('Error moving deal:', error);
      // Revert optimistic update on error
      organizeDeals(deals);
      toast.error('Failed to move deal. Please try again.');
    }
  };

  const stageValues = useMemo(() => {
    const values: Record<string, number> = {};
    for (const stageId of Object.keys(stageDeals)) {
      values[stageId] = stageDeals[stageId]?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;
    }
    return values;
  }, [stageDeals]);

  const totalPipelineValue = useMemo(
    () => Object.values(stageValues).reduce((sum, v) => sum + v, 0),
    [stageValues]
  );

  const sortedStages = useMemo(
    () => [...pipeline.pipeline_stages].sort((a, b) => a.position - b.position),
    [pipeline.pipeline_stages]
  );

  const activeMobileStage = sortedStages.find(s => s.id === mobileStageId) || sortedStages[0];
  const mobileDeals = activeMobileStage ? (stageDeals[activeMobileStage.id] || []) : [];

  const calculateStageValue = (stageId: string): number => stageValues[stageId] ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Pipeline Header */}
      <div className="mb-4 md:mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{pipeline.name}</h3>
          {pipeline.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{pipeline.description}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-medium">Total</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            ${(totalPipelineValue / 1000).toFixed(0)}k
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{deals.length} deals</div>
        </div>
      </div>

      {/* Kanban Board — horizontal scroll on mobile, full view on desktop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex gap-3 min-h-full pb-4" style={{ minWidth: `${sortedStages.length * 240}px` }}>
            {sortedStages.map(stage => {
              const count = stageDeals[stage.id]?.length || 0;
              const stageVal = calculateStageValue(stage.id);
              return (
                <Droppable key={stage.id} droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-shrink-0 flex flex-col rounded-xl transition-colors ${
                        snapshot.isDraggingOver
                          ? 'bg-gray-50 dark:bg-white/4'
                          : 'bg-transparent'
                      }`}
                      style={{ width: 230 }}
                    >
                      {/* Stage header pill */}
                      <div className="flex items-center justify-between mb-2.5 px-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[110px]">
                            {stage.name}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">{count}</span>
                        </div>
                        {stageVal > 0 && (
                          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
                            ${(stageVal / 1000).toFixed(0)}k
                          </span>
                        )}
                      </div>

                      {/* Deals column */}
                      <div className="flex-1 space-y-2 min-h-[120px]">
                        {stageDeals[stage.id]?.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <DealCard deal={deal} isDragging={snapshot.isDragging} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {count === 0 && !snapshot.isDraggingOver && (
                          <div className="border-2 border-dashed border-gray-200 dark:border-white/8 rounded-xl h-16 flex items-center justify-center">
                            <span className="text-[11px] text-gray-300 dark:text-gray-600">Drop here</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
