'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, GripVertical, X } from 'lucide-react';
import { AGENT_DEFINITIONS, DEPARTMENTS, type DepartmentKey } from '@/lib/agents/definitions';

// ─── Types ───
interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  assigned_agent: string | null;
  assigned_department: string | null;
  created_at: string;
}

const COLUMNS = [
  { key: 'todo', label: 'To Do', borderColor: 'border-gray-300 dark:border-gray-600' },
  { key: 'in_progress', label: 'In Progress', borderColor: 'border-blue-400 dark:border-blue-500' },
  { key: 'done', label: 'Done', borderColor: 'border-green-400 dark:border-green-500' },
] as const;

const PRIORITY_BADGE: Record<string, { bg: string; label: string }> = {
  urgent: { bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Urgent' },
  high: { bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'High' },
  normal: { bg: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', label: 'Normal' },
  low: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Low' },
};

// ─── Cron schedule blocks ───
const DEPT_COLORS: Record<string, string> = {
  research: '#3b82f6',
  marketing: '#a855f7',
  client: '#22c55e',
  engineering: '#f97316',
  experiments: '#14b8a6',
  delivery: '#f59e0b',
  executive: '#ec4899',
};

interface CronBlock {
  agentId: string;
  displayName: string;
  time: string;
  hourFloat: number;
  department: string;
  color: string;
}

function parseCronBlocks(): CronBlock[] {
  const blocks: CronBlock[] = [];
  for (const [id, def] of Object.entries(AGENT_DEFINITIONS)) {
    if (!def.schedule) continue;
    // Match patterns like "10:00 AM daily", "8:00 PM daily", "9:00 PM daily"
    const match = def.schedule.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\s/i);
    if (!match) continue;
    let hour = parseInt(match[1]);
    const min = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const hourFloat = hour + min / 60;
    blocks.push({
      agentId: id,
      displayName: def.displayName,
      time: `${match[1]}:${match[2]} ${ampm}`,
      hourFloat,
      department: def.department,
      color: DEPT_COLORS[def.department] || '#6b7280',
    });
  }
  return blocks.sort((a, b) => a.hourFloat - b.hourFloat);
}

function CronTimeline() {
  const blocks = useMemo(() => parseCronBlocks(), []);
  if (blocks.length === 0) return null;

  // Timeline from 6 AM to 11 PM (6-23)
  const startHour = 6;
  const endHour = 23;
  const totalHours = endHour - startHour;
  const hourMarkers = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  return (
    <div className="mb-6">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Today&apos;s Schedule
      </h4>
      <div className="relative bg-gray-50 dark:bg-[#1a1a1c] rounded-xl border border-gray-200 dark:border-gray-700 p-3 overflow-x-auto">
        {/* Hour markers */}
        <div className="relative h-6 min-w-[600px]">
          {hourMarkers.map(h => {
            const left = ((h - startHour) / totalHours) * 100;
            const label = h <= 12 ? `${h === 0 ? 12 : h}${h < 12 ? 'a' : 'p'}` : `${h - 12}p`;
            return (
              <div
                key={h}
                className="absolute top-0 text-[9px] text-gray-400 dark:text-gray-500 font-mono"
                style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Timeline track */}
        <div className="relative h-8 min-w-[600px] mt-1">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200 dark:bg-gray-700 -translate-y-1/2" />

          {/* Current time indicator */}
          {(() => {
            const now = new Date();
            const nowFloat = now.getHours() + now.getMinutes() / 60;
            if (nowFloat >= startHour && nowFloat <= endHour) {
              const left = ((nowFloat - startHour) / totalHours) * 100;
              return (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
                  style={{ left: `${left}%` }}
                >
                  <div className="absolute -top-0.5 -left-1 w-2 h-2 rounded-full bg-red-500" />
                </div>
              );
            }
            return null;
          })()}

          {/* Blocks */}
          {blocks.map((block, i) => {
            const left = Math.max(0, Math.min(100, ((block.hourFloat - startHour) / totalHours) * 100));
            return (
              <div
                key={block.agentId}
                className="absolute top-0 h-full flex items-center group"
                style={{ left: `${left}%` }}
              >
                <div
                  className="w-5 h-5 rounded-md shadow-sm flex items-center justify-center cursor-default"
                  style={{ backgroundColor: block.color }}
                  title={`${block.displayName} - ${block.time}`}
                >
                  <span className="text-[8px] font-bold text-white">
                    {block.displayName[0]}
                  </span>
                </div>
                {/* Hover tooltip */}
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-20">
                  <div className="px-2 py-1 rounded-md bg-gray-900 dark:bg-gray-700 text-white text-[10px] whitespace-nowrap shadow-lg">
                    {block.displayName} {'\u00B7'} {block.time}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Scheduled Jobs (todo-list format) ───
function ScheduledJobs() {
  const blocks = useMemo(() => parseCronBlocks(), []);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (blocks.length === 0) return null;

  const now = new Date();
  const nowFloat = now.getHours() + now.getMinutes() / 60;

  return (
    <div className="mb-6">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Scheduled Jobs
      </h4>
      <div className="space-y-1.5">
        {blocks.map(block => {
          const def = AGENT_DEFINITIONS[block.agentId];
          const dept = def ? DEPARTMENTS[def.department as DepartmentKey] : null;
          const isPast = block.hourFloat < nowFloat;
          const isExpanded = expandedId === block.agentId;

          return (
            <div key={block.agentId}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : block.agentId)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                  isPast
                    ? 'bg-gray-50 dark:bg-white/3'
                    : 'bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-700'
                } hover:bg-gray-100 dark:hover:bg-white/5`}
              >
                {/* Time */}
                <span className={`text-xs font-bold font-mono w-16 flex-shrink-0 ${
                  isPast ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {block.time}
                </span>

                {/* Agent avatar */}
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: block.color, fontSize: '8px', fontWeight: 700 }}
                >
                  {block.displayName[0]}
                </div>

                {/* Agent name + description */}
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-medium ${
                    isPast ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {block.displayName}
                  </span>
                  {def && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1.5">
                      {def.schedule || 'Manual'}
                    </span>
                  )}
                </div>

                {/* Department badge */}
                {dept && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: block.color }}
                  >
                    {dept.label.split(' ')[0]}
                  </span>
                )}

                {/* Status indicator */}
                {isPast ? (
                  <span className="text-[10px] text-green-500 dark:text-green-400 flex-shrink-0">Done</span>
                ) : (
                  <span className="text-[10px] text-gray-400 flex-shrink-0">Pending</span>
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && def && (
                <div className="ml-[76px] mt-1 mb-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-700 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Model</span>
                    <span className="text-gray-700 dark:text-gray-300">{def.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Schedule</span>
                    <span className="text-gray-700 dark:text-gray-300">{def.schedule || 'Manual'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Turns</span>
                    <span className="text-gray-700 dark:text-gray-300">{def.maxTurns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Department</span>
                    <span className="text-gray-700 dark:text-gray-300">{dept?.label || def.department}</span>
                  </div>
                  {def.mcps && def.mcps.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">MCPs</span>
                      <span className="text-gray-700 dark:text-gray-300">{def.mcps.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Task Card ───
function TaskCard({
  task,
  onDelete,
  isDragging,
  onDragStart,
}: {
  task: Task;
  onDelete: (id: string) => void;
  isDragging: boolean;
  onDragStart: (id: string) => void;
}) {
  const agentDef = task.assigned_agent ? AGENT_DEFINITIONS[task.assigned_agent] : null;
  const deptDef = task.assigned_department ? DEPARTMENTS[task.assigned_department as DepartmentKey] : null;
  const priority = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.normal;
  const agentColor = agentDef
    ? DEPT_COLORS[agentDef.department] || '#6b7280'
    : deptDef
      ? DEPT_COLORS[task.assigned_department!] || '#6b7280'
      : '#6b7280';

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      className={`group p-2.5 rounded-lg bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-700/60 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all ${
        isDragging ? 'opacity-40 scale-95' : ''
      }`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="w-3 h-3 text-gray-300 dark:text-gray-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-snug">{task.title}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${priority.bg}`}>
              {priority.label}
            </span>
            {agentDef && (
              <span className="flex items-center gap-1">
                <span
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: agentColor, fontSize: '7px', fontWeight: 700 }}
                >
                  {agentDef.displayName[0]}
                </span>
                <span className="text-[9px] text-gray-500 dark:text-gray-400">{agentDef.displayName}</span>
              </span>
            )}
            {deptDef && !agentDef && (
              <span className="text-[9px] text-gray-500 dark:text-gray-400">{deptDef.icon}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="p-0.5 rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [newDept, setNewDept] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, priority: newPriority, assigned_department: newDept || null }),
    });
    setNewTitle('');
    setNewPriority('normal');
    setNewDept('');
    setShowAdd(false);
    fetchTasks();
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    await fetch(`/api/tasks?id=${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTasks();
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
    fetchTasks();
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedId) {
      moveTask(draggedId, status);
      setDraggedId(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      {/* Cron Timeline */}
      <CronTimeline />

      {/* Scheduled Jobs (todo-list) */}
      <ScheduledJobs />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Task Board</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Task
        </button>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-700 space-y-2">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Task title..."
            onKeyDown={e => e.key === 'Enter' && addTask()}
            className="w-full px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
              className="flex-1 px-2 py-1 text-xs rounded-lg bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <select
              value={newDept}
              onChange={e => setNewDept(e.target.value)}
              className="flex-1 px-2 py-1 text-xs rounded-lg bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="">Auto-assign</option>
              {Object.entries(DEPARTMENTS).filter(([k]) => k !== 'executive').map(([k, d]) => (
                <option key={k} value={k}>{d.icon} {d.label}</option>
              ))}
            </select>
            <button onClick={addTask} className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.key)}
              className={`rounded-xl border-t-2 ${col.borderColor} bg-gray-50/50 dark:bg-[#0d0d0e] p-2.5 min-h-[160px]`}
            >
              <div className="flex items-center justify-between mb-2.5 px-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{col.label}</span>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={deleteTask}
                    isDragging={draggedId === task.id}
                    onDragStart={setDraggedId}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
