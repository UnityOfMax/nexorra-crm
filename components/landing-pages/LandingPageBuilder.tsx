'use client';

import { useState, useCallback } from 'react';
import {
  ArrowLeft, Save, Eye, Globe, EyeOff, Settings, Trash2,
  GripVertical, Plus, Type, Image, MousePointerClick, FormInput,
  Video, Quote, Minus, LayoutList, ChevronUp, ChevronDown, Code
} from 'lucide-react';
import LandingPageRenderer from './LandingPageRenderer';
import TrackingPixelEditor from './TrackingPixelEditor';
import type { LandingPage, TrackingPixel } from '@/types';
import type { LandingPageBlock, LandingPageContent } from '@/lib/landing-page-templates';

interface LandingPageBuilderProps {
  page: LandingPage;
  accountId: string;
  onBack: () => void;
}

const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero', icon: LayoutList, description: 'Full-width header' },
  { type: 'text', label: 'Text', icon: Type, description: 'Rich text block' },
  { type: 'image', label: 'Image', icon: Image, description: 'Image with alt text' },
  { type: 'cta', label: 'CTA Button', icon: MousePointerClick, description: 'Call-to-action' },
  { type: 'form', label: 'Form', icon: FormInput, description: 'Lead capture form' },
  { type: 'video', label: 'Video', icon: Video, description: 'YouTube/Vimeo embed' },
  { type: 'testimonial', label: 'Testimonial', icon: Quote, description: 'Customer quote' },
  { type: 'features', label: 'Features', icon: LayoutList, description: 'Feature grid' },
  { type: 'spacer', label: 'Spacer', icon: Minus, description: 'Vertical space' },
] as const;

function getDefaultBlockData(type: string): Record<string, any> {
  switch (type) {
    case 'hero': return { heading: 'Your Headline Here', subheading: 'Your subheading goes here', ctaText: 'Get Started', ctaLink: '#', bgColor: '#1a1a2e', textColor: '#ffffff' };
    case 'text': return { content: '<p>Enter your text here...</p>' };
    case 'image': return { url: '', alt: '', alignment: 'center' };
    case 'cta': return { text: 'Click Here', link: '#', color: '#0ea5e9', size: 'large' };
    case 'form': return { heading: 'Get in Touch', fields: ['name', 'email', 'phone'], buttonText: 'Submit', buttonColor: '#0ea5e9' };
    case 'video': return { url: '', caption: '' };
    case 'testimonial': return { quote: 'Customer testimonial goes here...', author: 'Customer Name', role: '' };
    case 'features': return { heading: 'Our Features', items: [{ title: 'Feature 1', description: 'Description' }, { title: 'Feature 2', description: 'Description' }, { title: 'Feature 3', description: 'Description' }] };
    case 'spacer': return { height: 40 };
    default: return {};
  }
}

export default function LandingPageBuilder({ page, accountId, onBack }: LandingPageBuilderProps) {
  const [content, setContent] = useState<LandingPageContent>(
    page.content || { blocks: [], styles: { fontFamily: 'Inter', primaryColor: '#0ea5e9' } }
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPixels, setShowPixels] = useState(false);
  const [pageName, setPageName] = useState(page.name);
  const [pageSlug, setPageSlug] = useState(page.slug);
  const [metaTitle, setMetaTitle] = useState(page.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(page.meta_description || '');
  const [trackingPixels, setTrackingPixels] = useState<TrackingPixel[]>(page.tracking_pixels || []);
  const [published, setPublished] = useState(page.published);

  const selectedBlock = content.blocks.find(b => b.id === selectedBlockId) || null;

  const addBlock = (type: string) => {
    const newBlock: LandingPageBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      data: getDefaultBlockData(type),
      order: content.blocks.length,
    };
    setContent(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    setSelectedBlockId(newBlock.id);
  };

  const updateBlock = (blockId: string, data: Record<string, any>) => {
    setContent(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, data: { ...b.data, ...data } } : b),
    }));
  };

  const deleteBlock = (blockId: string) => {
    setContent(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== blockId).map((b, i) => ({ ...b, order: i })),
    }));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    setContent(prev => {
      const sorted = [...prev.blocks].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(b => b.id === blockId);
      if (direction === 'up' && idx > 0) {
        [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
      } else if (direction === 'down' && idx < sorted.length - 1) {
        [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      }
      return { ...prev, blocks: sorted.map((b, i) => ({ ...b, order: i })) };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const response = await fetch(`/api/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pageName,
          slug: pageSlug,
          content,
          meta_title: metaTitle,
          meta_description: metaDescription,
          tracking_pixels: trackingPixels,
          published,
        }),
      });
      if (response.ok) {
        setSaveMessage('Saved!');
        setTimeout(() => setSaveMessage(''), 2000);
      } else {
        setSaveMessage('Error saving');
      }
    } catch {
      setSaveMessage('Error saving');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    const next = !published;
    setPublished(next);
    try {
      await fetch(`/api/landing-pages/${page.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: next }),
      });
    } catch {
      setPublished(!next);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2 -mt-6 -mx-6 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={pageName}
            onChange={(e) => setPageName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0"
            style={{ width: `${Math.max(pageName.length, 10)}ch` }}
          />
        </div>
        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className={`text-sm ${saveMessage === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={() => setShowPixels(!showPixels)}
            className={`btn btn-secondary text-sm flex items-center gap-1 ${showPixels ? 'bg-gray-200' : ''}`}
          >
            <Code className="w-4 h-4" />
            Pixels
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`btn btn-secondary text-sm flex items-center gap-1 ${showSettings ? 'bg-gray-200' : ''}`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button onClick={togglePublish} className={`btn text-sm flex items-center gap-1 ${published ? 'btn-secondary' : 'btn-primary'}`}>
            {published ? <><EyeOff className="w-4 h-4" /> Unpublish</> : <><Globe className="w-4 h-4" /> Publish</>}
          </button>
          {published && (
            <a href={`https://${pageSlug}.ourlimitedoffer.com`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm flex items-center gap-1">
              <Eye className="w-4 h-4" /> View
            </a>
          )}
          <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm flex items-center gap-1">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Page Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain / URL</label>
              <div className="flex items-center gap-1">
                <input
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="input text-sm flex-1 min-w-0"
                  placeholder="yourname"
                />
                <span className="text-sm text-gray-400 whitespace-nowrap">.ourlimitedoffer.com</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Live at: <span className="font-mono text-gray-700">{pageSlug}.ourlimitedoffer.com</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={content.styles.primaryColor}
                  onChange={(e) => setContent(prev => ({ ...prev, styles: { ...prev.styles, primaryColor: e.target.value } }))}
                  className="h-9 w-14 rounded border border-gray-300"
                />
                <input
                  value={content.styles.primaryColor}
                  onChange={(e) => setContent(prev => ({ ...prev, styles: { ...prev.styles, primaryColor: e.target.value } }))}
                  className="input text-sm flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
              <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="input text-sm" placeholder="Page title for SEO" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="input text-sm" placeholder="Page description for SEO" />
            </div>
          </div>
        </div>
      )}

      {/* Tracking Pixels Panel */}
      {showPixels && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <TrackingPixelEditor pixels={trackingPixels} onChange={setTrackingPixels} />
        </div>
      )}

      {/* Main Builder Area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Block Palette */}
        <div className="w-48 bg-white border border-gray-200 rounded-lg overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Blocks</h3>
          </div>
          <div className="p-2 space-y-1">
            {BLOCK_TYPES.map((bt) => {
              const Icon = bt.icon;
              return (
                <button
                  key={bt.type}
                  onClick={() => addBlock(bt.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 rounded transition-colors"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{bt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-y-auto">
          <LandingPageRenderer
            content={content}
            isPreview={true}
            onBlockClick={(id) => setSelectedBlockId(id)}
            selectedBlockId={selectedBlockId || undefined}
            accountId={accountId}
          />
        </div>

        {/* Block Properties Panel */}
        <div className="w-72 bg-white border border-gray-200 rounded-lg overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              {selectedBlock ? `Edit: ${selectedBlock.type.charAt(0).toUpperCase() + selectedBlock.type.slice(1)}` : 'Properties'}
            </h3>
          </div>
          {selectedBlock ? (
            <div className="p-3 space-y-3">
              {/* Block controls */}
              <div className="flex items-center gap-1 pb-3 border-b border-gray-100">
                <button onClick={() => moveBlock(selectedBlock.id, 'up')} className="p-1.5 hover:bg-gray-100 rounded" title="Move up">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => moveBlock(selectedBlock.id, 'down')} className="p-1.5 hover:bg-gray-100 rounded" title="Move down">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button onClick={() => deleteBlock(selectedBlock.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded ml-auto" title="Delete block">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Block-specific fields */}
              <BlockPropertyEditor
                block={selectedBlock}
                onUpdate={(data) => updateBlock(selectedBlock.id, data)}
                primaryColor={content.styles.primaryColor}
              />
            </div>
          ) : (
            <div className="p-4 text-sm text-gray-500 text-center">
              Click a block in the preview to edit its properties
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockPropertyEditor({ block, onUpdate, primaryColor }: {
  block: LandingPageBlock;
  onUpdate: (data: Record<string, any>) => void;
  primaryColor: string;
}) {
  const { data } = block;

  const textInput = (label: string, key: string, placeholder?: string, type?: string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type || 'text'}
        value={data[key] || ''}
        onChange={(e) => onUpdate({ [key]: e.target.value })}
        className="input text-sm"
        placeholder={placeholder}
      />
    </div>
  );

  const textArea = (label: string, key: string, rows?: number) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        value={data[key] || ''}
        onChange={(e) => onUpdate({ [key]: e.target.value })}
        className="input text-sm"
        rows={rows || 3}
      />
    </div>
  );

  const colorInput = (label: string, key: string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={data[key] || primaryColor}
          onChange={(e) => onUpdate({ [key]: e.target.value })}
          className="h-9 w-12 rounded border border-gray-300"
        />
        <input
          value={data[key] || ''}
          onChange={(e) => onUpdate({ [key]: e.target.value })}
          className="input text-sm flex-1"
          placeholder={primaryColor}
        />
      </div>
    </div>
  );

  const numberInput = (label: string, key: string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        value={data[key] || 0}
        onChange={(e) => onUpdate({ [key]: parseInt(e.target.value) || 0 })}
        className="input text-sm"
      />
    </div>
  );

  switch (block.type) {
    case 'hero':
      return <>{[
        textInput('Heading', 'heading'),
        textArea('Subheading', 'subheading'),
        textInput('CTA Text', 'ctaText', 'Leave empty for no button'),
        textInput('CTA Link', 'ctaLink', '#section'),
        colorInput('Background', 'bgColor'),
        colorInput('Text Color', 'textColor'),
      ]}</>;

    case 'text':
      return <>{[textArea('Content (HTML)', 'content', 6)]}</>;

    case 'image':
      return <>{[
        textInput('Image URL', 'url', 'https://...'),
        textInput('Alt Text', 'alt'),
        <div key="alignment">
          <label className="block text-xs font-medium text-gray-600 mb-1">Alignment</label>
          <select value={data.alignment || 'center'} onChange={(e) => onUpdate({ alignment: e.target.value })} className="input text-sm">
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      ]}</>;

    case 'cta':
      return <>{[
        textInput('Button Text', 'text'),
        textInput('Link', 'link', '#'),
        colorInput('Button Color', 'color'),
        <div key="size">
          <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
          <select value={data.size || 'large'} onChange={(e) => onUpdate({ size: e.target.value })} className="input text-sm">
            <option value="normal">Normal</option>
            <option value="large">Large</option>
          </select>
        </div>
      ]}</>;

    case 'form':
      return <>{[
        textInput('Heading', 'heading'),
        textInput('Button Text', 'buttonText'),
        colorInput('Button Color', 'buttonColor'),
        <div key="fields">
          <label className="block text-xs font-medium text-gray-600 mb-1">Fields</label>
          <div className="space-y-1">
            {['name', 'email', 'phone'].map(f => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(data.fields || []).includes(f)}
                  onChange={(e) => {
                    const fields = data.fields || [];
                    onUpdate({ fields: e.target.checked ? [...fields, f] : fields.filter((x: string) => x !== f) });
                  }}
                />
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </label>
            ))}
          </div>
        </div>
      ]}</>;

    case 'video':
      return <>{[
        textInput('Video URL', 'url', 'https://youtube.com/embed/...'),
        textInput('Caption', 'caption'),
      ]}</>;

    case 'testimonial':
      return <>{[
        textArea('Quote', 'quote'),
        textInput('Author', 'author'),
        textInput('Role', 'role', 'CEO, Company'),
      ]}</>;

    case 'features':
      return (
        <div className="space-y-3">
          {textInput('Section Heading', 'heading')}
          <label className="block text-xs font-medium text-gray-600">Feature Items</label>
          {(data.items || []).map((item: any, i: number) => (
            <div key={i} className="border border-gray-200 rounded p-2 space-y-1">
              <input
                value={item.title}
                onChange={(e) => {
                  const items = [...(data.items || [])];
                  items[i] = { ...items[i], title: e.target.value };
                  onUpdate({ items });
                }}
                className="input text-sm"
                placeholder="Title"
              />
              <input
                value={item.description}
                onChange={(e) => {
                  const items = [...(data.items || [])];
                  items[i] = { ...items[i], description: e.target.value };
                  onUpdate({ items });
                }}
                className="input text-sm"
                placeholder="Description"
              />
              <button
                onClick={() => onUpdate({ items: (data.items || []).filter((_: any, j: number) => j !== i) })}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => onUpdate({ items: [...(data.items || []), { title: 'New Feature', description: 'Description' }] })}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add Feature
          </button>
        </div>
      );

    case 'spacer':
      return <>{[numberInput('Height (px)', 'height')]}</>;

    default:
      return <p className="text-sm text-gray-500">No properties for this block type</p>;
  }
}
