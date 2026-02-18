'use client';

import { useState } from 'react';
import { Plus, Trash2, Facebook, BarChart3, Code } from 'lucide-react';
import type { TrackingPixel } from '@/types';

interface TrackingPixelEditorProps {
  pixels: TrackingPixel[];
  onChange: (pixels: TrackingPixel[]) => void;
}

const PIXEL_TYPES = [
  { value: 'facebook', label: 'Facebook Pixel', icon: Facebook },
  { value: 'google', label: 'Google Analytics', icon: BarChart3 },
  { value: 'linkedin', label: 'LinkedIn Insight', icon: BarChart3 },
  { value: 'custom', label: 'Custom Script', icon: Code },
] as const;

export default function TrackingPixelEditor({ pixels, onChange }: TrackingPixelEditorProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newPixel, setNewPixel] = useState({
    name: '',
    type: 'facebook' as TrackingPixel['type'],
    code: '',
  });

  const addPixel = () => {
    if (!newPixel.name || !newPixel.code) return;

    let code = newPixel.code;

    // For Facebook, auto-generate full pixel code from just the ID
    if (newPixel.type === 'facebook' && /^\d+$/.test(newPixel.code.trim())) {
      const pixelId = newPixel.code.trim();
      code = `<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
/></noscript>`;
    }

    const pixel: TrackingPixel = {
      id: `pixel-${Date.now()}`,
      name: newPixel.name,
      type: newPixel.type,
      code,
    };

    onChange([...pixels, pixel]);
    setNewPixel({ name: '', type: 'facebook', code: '' });
    setShowAdd(false);
  };

  const removePixel = (id: string) => {
    onChange(pixels.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Tracking Pixels</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Pixel
        </button>
      </div>

      {/* Existing pixels */}
      {pixels.length === 0 && !showAdd && (
        <p className="text-sm text-gray-500">No tracking pixels configured</p>
      )}

      <div className="space-y-2">
        {pixels.map((pixel) => {
          const typeInfo = PIXEL_TYPES.find(t => t.value === pixel.type);
          const Icon = typeInfo?.icon || Code;
          return (
            <div key={pixel.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{pixel.name}</p>
                <p className="text-xs text-gray-500">{typeInfo?.label || pixel.type}</p>
              </div>
              <button
                onClick={() => removePixel(pixel.id)}
                className="text-red-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add new pixel form */}
      {showAdd && (
        <div className="mt-3 border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                value={newPixel.name}
                onChange={(e) => setNewPixel({ ...newPixel, name: e.target.value })}
                className="input text-sm"
                placeholder="My Facebook Pixel"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={newPixel.type}
                onChange={(e) => setNewPixel({ ...newPixel, type: e.target.value as any })}
                className="input text-sm"
              >
                {PIXEL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {newPixel.type === 'facebook'
                ? 'Pixel ID (or full script)'
                : newPixel.type === 'google'
                ? 'Measurement ID (e.g., G-XXXXXXXX)'
                : 'Script Code'}
            </label>
            <textarea
              value={newPixel.code}
              onChange={(e) => setNewPixel({ ...newPixel, code: e.target.value })}
              className="input text-sm font-mono"
              rows={newPixel.type === 'custom' ? 5 : 2}
              placeholder={
                newPixel.type === 'facebook' ? '123456789012345'
                : newPixel.type === 'google' ? 'G-XXXXXXXX'
                : '<script>...</script>'
              }
            />
            {newPixel.type === 'facebook' && (
              <p className="text-xs text-gray-500 mt-1">
                Enter just the Pixel ID and we'll generate the full code, or paste the complete script.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="btn btn-secondary text-sm flex-1">Cancel</button>
            <button onClick={addPixel} className="btn btn-primary text-sm flex-1" disabled={!newPixel.name || !newPixel.code}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}
