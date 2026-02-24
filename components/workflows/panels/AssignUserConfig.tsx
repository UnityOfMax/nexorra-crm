'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface AccountMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AssignUserConfigProps {
  node: Node;
  onUpdate: (data: any) => void;
  accountId?: string;
}

export default function AssignUserConfig({ node, onUpdate, accountId }: AssignUserConfigProps) {
  const [assignmentType, setAssignmentType] = useState(
    node.data.config?.assignmentType || 'specific'
  );
  const [userId, setUserId] = useState(node.data.config?.userId || '');
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Fetch account members for the dropdown
  useEffect(() => {
    if (!accountId) return;
    setLoadingMembers(true);
    fetch(`/api/account-members?accountId=${accountId}`)
      .then((r) => r.json())
      .then((d) => {
        const loaded: AccountMember[] = d.members || [];
        setMembers(loaded);
        // Auto-select first member if nothing selected yet
        if (!userId && loaded.length > 0) {
          setUserId(loaded[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingMembers(false));
  }, [accountId]);

  // Push config updates upward
  useEffect(() => {
    onUpdate({
      config: {
        ...node.data.config,
        assignmentType,
        userId: assignmentType === 'specific' ? userId : '',
      },
    });
  }, [assignmentType, userId]);

  const displayName = (m: AccountMember) =>
    m.full_name ? `${m.full_name} (${m.email})` : m.email;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assignment Type
        </label>
        <select
          value={assignmentType}
          onChange={(e) => setAssignmentType(e.target.value)}
          className="input w-full"
        >
          <option value="specific">Assign to specific user</option>
          <option value="round_robin">Round robin (distribute evenly)</option>
          <option value="least_busy">Least busy user</option>
        </select>
      </div>

      {assignmentType === 'specific' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select User
          </label>
          {loadingMembers ? (
            <p className="text-xs text-gray-500">Loading users…</p>
          ) : members.length === 0 ? (
            <p className="text-xs text-amber-600">No users found for this account.</p>
          ) : (
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="input w-full"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {displayName(m)}{m.role === 'owner' ? ' — Owner' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {assignmentType === 'round_robin' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <h4 className="text-xs font-semibold text-blue-900 mb-1">Round Robin</h4>
          <p className="text-xs text-blue-700">
            Contacts are distributed evenly among all users in your account, rotating with each new assignment.
          </p>
        </div>
      )}

      {assignmentType === 'least_busy' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <h4 className="text-xs font-semibold text-blue-900 mb-1">Least Busy</h4>
          <p className="text-xs text-blue-700">
            Contacts are assigned to the user with the fewest active contacts, balancing workload automatically.
          </p>
        </div>
      )}

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
        <h4 className="text-xs font-semibold text-purple-900 mb-1">Assignment Notes</h4>
        <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
          <li>The contact will appear in the assigned user's list</li>
          <li>Assignment can be changed manually later</li>
        </ul>
      </div>
    </div>
  );
}
