'use client';

import { useState, useMemo } from 'react';
import { AGENT_DEFINITIONS, DEPARTMENTS, type DepartmentKey } from '@/lib/agents/definitions';
import type { AgentConfig } from '../types';

// ─── Department colors from requirements (override DEPARTMENTS for guaranteed match) ───
const DEPT_COLORS: Record<string, string> = {
  research: '#3b82f6',
  marketing: '#a855f7',
  client: '#22c55e',
  engineering: '#f97316',
  experiments: '#14b8a6',
  delivery: '#f59e0b',
  executive: '#ec4899',
};

function getDeptColor(dept: string): string {
  return DEPT_COLORS[dept] || DEPARTMENTS[dept as DepartmentKey]?.color || '#6b7280';
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Inline Detail Card (replaces broken tooltip) ───
function AgentDetailCard({ agentId }: { agentId: string }) {
  const def = AGENT_DEFINITIONS[agentId];
  if (!def) return null;

  const dept = DEPARTMENTS[def.department as DepartmentKey];

  return (
    <div className="mt-2 p-3 rounded-lg bg-white dark:bg-[#2c2c2e] shadow-lg border border-gray-200 dark:border-gray-700 min-w-[180px] max-w-[220px] text-left">
      <p className="text-xs font-semibold text-gray-900 dark:text-white">{def.displayName}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{dept?.label || def.department}</p>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-400">Role</span>
          <span className="text-gray-700 dark:text-gray-300 capitalize">{def.role}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-400">Model</span>
          <span className="text-gray-700 dark:text-gray-300">{def.model}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-400">Schedule</span>
          <span className="text-gray-700 dark:text-gray-300 text-right max-w-[120px] truncate">{def.schedule || 'Manual'}</span>
        </div>
        {def.mcps && def.mcps.length > 0 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-400">MCPs</span>
            <span className="text-gray-700 dark:text-gray-300 text-right max-w-[120px] truncate">{def.mcps.join(', ')}</span>
          </div>
        )}
        {def.skills && def.skills.length > 0 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-400">Skills</span>
            <span className="text-gray-700 dark:text-gray-300 text-right max-w-[120px] truncate">{def.skills.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Node ───
function OrgNode({
  agentId,
  agents,
  isSelected,
  onSelect,
}: {
  agentId: string;
  agents: AgentConfig[];
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const def = AGENT_DEFINITIONS[agentId];
  if (!def) return null;

  const config = agents.find(a => a.id === agentId || a.name === agentId);
  const isRunning = config?.latest_run?.status === 'running';
  const color = getDeptColor(def.department);

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={() => onSelect(isSelected ? null : agentId)}
        className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 hover:scale-105 ${
          isSelected
            ? 'bg-gray-100 dark:bg-[#3a3a3c] ring-2 ring-offset-1 dark:ring-offset-[#1c1c1e]'
            : 'hover:bg-gray-50 dark:hover:bg-[#2c2c2e]/60'
        }`}
        style={isSelected ? { ringColor: color } as any : undefined}
      >
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${
            isRunning ? 'ring-2 ring-offset-2 ring-green-400 dark:ring-offset-[#1c1c1e]' : ''
          }`}
          style={{ backgroundColor: color }}
        >
          {getInitials(def.displayName)}
        </div>

        {/* Running pulse */}
        {isRunning && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-green-400 shadow-sm">
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60" />
          </span>
        )}

        {/* Name */}
        <span className="text-[11px] font-medium text-gray-800 dark:text-gray-200 leading-tight">
          {def.displayName}
        </span>

        {/* Department strip */}
        <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: color }} />
      </button>

      {/* Inline detail card */}
      {isSelected && <AgentDetailCard agentId={agentId} />}
    </div>
  );
}

// ─── Vertical connector line ───
function Connector({ color }: { color: string }) {
  return (
    <div className="flex justify-center">
      <div className="w-px h-6" style={{ backgroundColor: color, opacity: 0.4 }} />
    </div>
  );
}

// ─── Department group ───
function DepartmentGroup({
  deptKey,
  agents,
  selectedAgent,
  onSelectAgent,
}: {
  deptKey: string;
  agents: AgentConfig[];
  selectedAgent: string | null;
  onSelectAgent: (id: string | null) => void;
}) {
  const dept = DEPARTMENTS[deptKey as DepartmentKey];
  const color = getDeptColor(deptKey);

  const deptAgents = useMemo(() => {
    return Object.entries(AGENT_DEFINITIONS)
      .filter(([, d]) => d.department === deptKey)
      .sort((a, b) => {
        if (a[1].role === 'head') return -1;
        if (b[1].role === 'head') return 1;
        return 0;
      });
  }, [deptKey]);

  const head = deptAgents.find(([, d]) => d.role === 'head');
  const members = deptAgents.filter(([, d]) => d.role === 'agent');

  if (deptAgents.length === 0) return null;

  return (
    <div className="flex flex-col items-center">
      {/* Department label */}
      <div
        className="px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-white mb-2"
        style={{ backgroundColor: color }}
      >
        {dept?.label || deptKey}
      </div>

      {/* Head */}
      {head && (
        <>
          <OrgNode
            agentId={head[0]}
            agents={agents}
            isSelected={selectedAgent === head[0]}
            onSelect={onSelectAgent}
          />
          {members.length > 0 && <Connector color={color} />}
        </>
      )}

      {/* Members */}
      {members.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {members.map(([id]) => (
            <OrgNode
              key={id}
              agentId={id}
              agents={agents}
              isSelected={selectedAgent === id}
              onSelect={onSelectAgent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───
export default function CompanyLayout({ agents }: { agents: AgentConfig[] }) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Group departments
  const deptOrder: DepartmentKey[] = ['executive', 'research', 'marketing', 'client', 'delivery', 'engineering', 'experiments', 'council'];

  // Lena is the executive head
  const lenaId = 'lena';
  const lenaColor = getDeptColor('executive');

  // Non-executive departments
  const depts = deptOrder.filter(d => d !== 'executive');

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="flex flex-col items-center min-w-fit">
        {/* Lena at top */}
        <div className="flex flex-col items-center">
          <div
            className="px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-white mb-2"
            style={{ backgroundColor: lenaColor }}
          >
            Executive
          </div>
          <OrgNode
            agentId={lenaId}
            agents={agents}
            isSelected={selectedAgent === lenaId}
            onSelect={setSelectedAgent}
          />
        </div>

        {/* Connector from Lena to department heads */}
        <Connector color={lenaColor} />
        <div className="w-px h-2 bg-gray-300 dark:bg-gray-600" />

        {/* Horizontal connector bar */}
        <div className="hidden sm:block w-[80%] max-w-[800px] h-px bg-gray-300 dark:bg-gray-600" />

        {/* Department groups */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8">
          {depts.map(deptKey => (
            <DepartmentGroup
              key={deptKey}
              deptKey={deptKey}
              agents={agents}
              selectedAgent={selectedAgent}
              onSelectAgent={setSelectedAgent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
