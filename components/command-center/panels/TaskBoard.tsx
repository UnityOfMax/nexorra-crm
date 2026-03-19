'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, GripVertical, X, ChevronDown } from 'lucide-react';
import { AGENT_DEFINITIONS, DEPARTMENTS, type DepartmentKey } from '@/lib/agents/definitions';

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
  { key: 'todo', label: 'To Do', color: 'border-gray-300 dark:border-gray-600' },
  { key: 'in_progress', label: 'In Progress', color: 'border-blue-400 dark:border-blue-500' },
  { key: 'done', label: 'Done', color: 'border-green-400 dark:border-green-500' },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<string>('normal');
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

  const handleDragStart = (taskId: string) => setDraggedId(taskId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedId) {
      moveTask(draggedId, status);
      setDraggedId(null);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Task Board</h3>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors">
          <Plus className="w-3 h-3" /> Add Task
        </button>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-700 space-y-2">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title..."
            onKeyDown={e => e.key === 'Enter' && addTask()}
            className="w-full px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          <div className="flex gap-2">
            <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
              className="flex-1 px-2 py-1 text-xs rounded-lg bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <select value={newDept} onChange={e => setNewDept(e.target.value)}
              className="flex-1 px-2 py-1 text-xs rounded-lg bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
              <option value="">Auto-assign</option>
              {Object.entries(DEPARTMENTS).filter(([k]) => k !== 'executive').map(([k, d]) => (
                <option key={k} value={k}>{d.icon} {d.label}</option>
              ))}
            </select>
            <button onClick={addTask} className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600">Add</button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.key)}
              className={`rounded-xl border-t-2 ${col.color} bg-gray-50/50 dark:bg-[#0d0d0e] p-2 min-h-[120px]`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{col.label}</span>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{colTasks.length}</span>
              </div>
              <div className="space-y-1.5">
                {colTasks.map(task => {
                  const agentDef = task.assigned_agent ? AGENT_DEFINITIONS[task.assigned_agent] : null;
                  const deptDef = task.assigned_department ? DEPARTMENTS[task.assigned_department as DepartmentKey] : null;
                  return (
                    <div key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className={`group p-2.5 rounded-lg bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-700/60 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow ${
                        draggedId === task.id ? 'opacity-50' : ''
                      }`}>
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="w-3 h-3 text-gray-300 dark:text-gray-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                              {task.priority}
                            </span>
                            {agentDef && (
                              <span className="text-[9px] text-gray-500 dark:text-gray-400">{agentDef.displayName}</span>
                            )}
                            {deptDef && !agentDef && (
                              <span className="text-[9px] text-gray-500 dark:text-gray-400">{deptDef.icon}</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => deleteTask(task.id)}
                          className="p-0.5 rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
