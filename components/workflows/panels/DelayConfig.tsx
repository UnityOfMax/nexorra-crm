'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface DelayConfigProps {
  node: Node;
  onUpdate: (data: any) => void;
}

export default function DelayConfig({ node, onUpdate }: DelayConfigProps) {
  const [delayType, setDelayType] = useState(node.data.config?.delayType || 'duration');
  const [days, setDays] = useState(node.data.config?.days || 0);
  const [hours, setHours] = useState(node.data.config?.hours || 0);
  const [minutes, setMinutes] = useState(node.data.config?.minutes || 0);
  const [specificDate, setSpecificDate] = useState(node.data.config?.specificDate || '');
  const [specificTime, setSpecificTime] = useState(node.data.config?.specificTime || '09:00');

  useEffect(() => {
    onUpdate({
      config: {
        ...node.data.config,
        delayType,
        days,
        hours,
        minutes,
        specificDate,
        specificTime,
      },
    });
  }, [delayType, days, hours, minutes, specificDate, specificTime]);

  const getTotalMinutes = () => {
    return days * 24 * 60 + hours * 60 + minutes;
  };

  const formatDuration = () => {
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(', ') : 'No delay';
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Delay Type
        </label>
        <select
          value={delayType}
          onChange={(e) => setDelayType(e.target.value)}
          className="input w-full"
        >
          <option value="duration">Wait for a duration</option>
          <option value="until">Wait until a specific date/time</option>
          <option value="before_event">Before trigger event</option>
        </select>
      </div>

      {delayType === 'before_event' ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Days
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hours
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minutes
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                className="input w-full"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatDuration()} before the event
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Runs this long before the trigger event time (e.g., a booking)
            </div>
          </div>
        </>
      ) : delayType === 'duration' ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Days
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hours
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minutes
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                className="input w-full"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Total delay: {formatDuration()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {getTotalMinutes()} minutes total
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="input w-full"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time
            </label>
            <input
              type="time"
              value={specificTime}
              onChange={(e) => setSpecificTime(e.target.value)}
              className="input w-full"
            />
          </div>

          {specificDate && (
            <div className="bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Wait until: {new Date(`${specificDate}T${specificTime}`).toLocaleString()}
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-orange-900 mb-1">
          Delay Notes
        </h4>
        <ul className="text-xs text-orange-700 space-y-1 list-disc list-inside">
          <li>Delays are processed by a background job every minute</li>
          <li>The workflow will resume after the specified delay</li>
          <li>Maximum recommended delay is 30 days</li>
        </ul>
      </div>
    </div>
  );
}
