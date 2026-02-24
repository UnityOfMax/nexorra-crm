'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface EmailActionConfigProps {
  node: Node;
  onUpdate: (data: any) => void;
}

export default function EmailActionConfig({ node, onUpdate }: EmailActionConfigProps) {
  const [subject, setSubject] = useState(node.data.config?.subject || '');
  const [body, setBody] = useState(node.data.config?.body || '');
  const [fromName, setFromName] = useState(node.data.config?.fromName || '');

  useEffect(() => {
    onUpdate({
      config: {
        ...node.data.config,
        subject,
        body,
        fromName,
      },
    });
  }, [subject, body, fromName]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          From Name
        </label>
        <input
          type="text"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          className="input w-full"
          placeholder="e.g., {{user.firstname}} from {{account.name}}"
        />
        <p className="text-xs text-gray-500 mt-1">
          The name shown in the from field
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject Line
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input w-full"
          placeholder="e.g., Welcome to our platform!"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Body
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="input w-full"
          rows={10}
          placeholder="Enter your email content here...&#10;&#10;You can use variables:&#10;{{contact.first_name}}&#10;{{contact.last_name}}&#10;{{contact.email}}"
        />
        <p className="text-xs text-gray-500 mt-1">
          HTML is supported
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-900 mb-2">
          Available Variables
        </h4>
        <div className="text-xs text-blue-700 space-y-1">
          <div><code>{'{{contact.first_name}}'}</code> - Contact first name</div>
          <div><code>{'{{contact.last_name}}'}</code> - Contact last name</div>
          <div><code>{'{{contact.email}}'}</code> - Contact email</div>
          <div><code>{'{{contact.phone}}'}</code> - Contact phone</div>
          <div><code>{'{{deal.title}}'}</code> - Deal title (if applicable)</div>
          <div><code>{'{{deal.value}}'}</code> - Deal value (if applicable)</div>
          <div className="pt-1 border-t border-blue-200 mt-1"><code>{'{{user.firstname}}'}</code> - Your first name</div>
          <div><code>{'{{user.lastname}}'}</code> - Your last name</div>
          <div><code>{'{{user.email}}'}</code> - Your email address</div>
          <div><code>{'{{user.phone}}'}</code> - Your phone number</div>
          <div><code>{'{{account.name}}'}</code> - Business name</div>
        </div>
      </div>
    </div>
  );
}
