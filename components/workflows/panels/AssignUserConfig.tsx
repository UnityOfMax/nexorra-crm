'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface AssignUserConfigProps {
  node: Node;
  onUpdate: (data: any) => void;
}

export default function AssignUserConfig({ node, onUpdate }: AssignUserConfigProps) {
  const [assignmentType, setAssignmentType] = useState(
    node.data.config?.assignmentType || 'specific'
  );
  const [userId, setUserId] = useState(node.data.config?.userId || '');
  const [roundRobin, setRoundRobin] = useState(node.data.config?.roundRobin || false);

  useEffect(() => {
    onUpdate({
      config: {
        ...node.data.config,
        assignmentType,
        userId,
        roundRobin,
      },
    });
  }, [assignmentType, userId, roundRobin]);

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
          <option value="round_robin">Round robin assignment</option>
          <option value="least_busy">Assign to least busy user</option>
        </select>
      </div>

      {assignmentType === 'specific' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="input w-full"
            placeholder="Enter user ID or email"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the user ID or email address to assign contacts to
          </p>
        </div>
      )}

      {assignmentType === 'round_robin' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-blue-900 mb-1">
            Round Robin Assignment
          </h4>
          <p className="text-xs text-blue-700">
            Contacts will be distributed evenly among all active users in your account.
            The system will automatically track who received the last assignment and
            assign the next contact to the next user in rotation.
          </p>
        </div>
      )}

      {assignmentType === 'least_busy' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-blue-900 mb-1">
            Least Busy Assignment
          </h4>
          <p className="text-xs text-blue-700">
            Contacts will be assigned to the user with the fewest active contacts.
            This helps balance workload across your team automatically.
          </p>
        </div>
      )}

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-purple-900 mb-1">
          Assignment Notes
        </h4>
        <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
          <li>The assigned user will receive a notification</li>
          <li>The contact will appear in the user's assigned list</li>
          <li>This can be changed manually later if needed</li>
        </ul>
      </div>
    </div>
  );
}
