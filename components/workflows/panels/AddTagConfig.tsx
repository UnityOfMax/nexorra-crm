'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Tag, Plus, X } from 'lucide-react';

interface AddTagConfigProps {
  node: Node;
  onUpdate: (data: any) => void;
}

export default function AddTagConfig({ node, onUpdate }: AddTagConfigProps) {
  const [tags, setTags] = useState<string[]>(node.data.config?.tags || []);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    onUpdate({
      config: {
        ...node.data.config,
        tags,
      },
    });
  }, [tags]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Tags to Contact
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            className="input flex-1"
            placeholder="Enter tag name"
          />
          <button
            onClick={addTag}
            className="btn btn-secondary flex items-center gap-1 px-3"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Press Enter or click + to add a tag
        </p>
      </div>

      {tags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags to Add ({tags.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
              >
                <Tag className="w-3 h-3" />
                <span>{tag}</span>
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-900 mb-1">
          Tag Behavior
        </h4>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Tags will be added to the contact</li>
          <li>Existing tags on the contact will be preserved</li>
          <li>Duplicate tags will be ignored</li>
          <li>Tags are useful for segmentation and filtering</li>
        </ul>
      </div>
    </div>
  );
}
