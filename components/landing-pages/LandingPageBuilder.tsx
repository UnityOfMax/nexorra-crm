'use client';

import { useState, useRef } from 'react';
import {
  ArrowLeft, Save, Eye, Globe, Settings, Trash2,
  Plus, Type, Image, MousePointerClick, FormInput,
  Video, Quote, Minus, LayoutList, ChevronUp, ChevronDown,
  Upload, Loader, ImageIcon, Star,
} from 'lucide-react';
import LandingPageRenderer from './LandingPageRenderer';
import type { LandingPage } from '@/types';
import type { LandingPageBlock, LandingPageContent } from '@/lib/landing-page-templates';
import { toast } from 'sonner';

interface LandingPageBuilderProps {
  page: LandingPage;
  accountId: string;
  accountSlug: string;
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

export default function LandingPageBuilder({ page, accountId, accountSlug, onBack }: LandingPageBuilderProps) {
  const [content, setContent] = useState<LandingPageContent>(
    page.content || { blocks: [], styles: { fontFamily: 'Inter', primaryColor: '#0ea5e9' } }
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [pageName, setPageName] = useState(page.name);
  const [pageSlug, setPageSlug] = useState(page.slug);
  const [metaTitle, setMetaTitle] = useState(page.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(page.meta_description || '');
  const [connectPixel, setConnectPixel] = useState(page.connect_pixel ?? false);
  const [customDomain, setCustomDomain] = useState(page.custom_domain || '');
  const [published, setPublished] = useState(page.published);
  const [isDirty, setIsDirty] = useState(false);

  const canPublish = !published || isDirty;
  const markDirty = () => setIsDirty(true);

  const selectedBlock = content.blocks.find(b => b.id === selectedBlockId) || null;

  const addBlock = (type: string) => {
    const newBlock: LandingPageBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      data: getDefaultBlockData(type),
      order: content.blocks.length,
    };
    setContent(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
    setSelectedBlockId(newBlock.id);
    markDirty();
  };

  const updateBlock = (blockId: string, data: Record<string, any>) => {
    setContent(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, data: { ...b.data, ...data } } : b),
    }));
    markDirty();
  };

  const deleteBlock = (blockId: string) => {
    setContent(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== blockId).map((b, i) => ({ ...b, order: i })),
    }));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
    markDirty();
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
    markDirty();
  };

  const showMsg = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Save as draft only — never changes published state
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
          connect_pixel: connectPixel,
          custom_domain: customDomain.trim() || null,
        }),
      });
      if (response.ok) {
        showMsg('Saved!');
      } else {
        const data = await response.json();
        showMsg('Error: ' + (data.error || 'Save failed'));
      }
    } catch {
      showMsg('Error saving');
    } finally {
      setSaving(false);
    }
  };

  // Publish — saves all content with published: true and resets dirty flag
  const handlePublish = async () => {
    if (!canPublish) return;
    setPublishing(true);
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
          connect_pixel: connectPixel,
          custom_domain: customDomain.trim() || null,
          published: true,
        }),
      });
      if (response.ok) {
        setPublished(true);
        setIsDirty(false);
        showMsg('Published!');
      } else {
        const data = await response.json();
        showMsg('Publish error: ' + (data.error || 'Failed'));
      }
    } catch {
      showMsg('Publish error');
    } finally {
      setPublishing(false);
    }
  };

  const isError = saveMessage.startsWith('Error') || saveMessage.startsWith('Publish error');

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
            onChange={(e) => { setPageName(e.target.value); markDirty(); }}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0"
            style={{ width: `${Math.max(pageName.length, 10)}ch` }}
          />
        </div>
        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`btn btn-secondary text-sm flex items-center gap-1 ${showSettings ? 'bg-gray-200' : ''}`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={handlePublish}
            disabled={!canPublish || publishing}
            className={`btn text-sm flex items-center gap-1 ${canPublish ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
          >
            <Globe className="w-4 h-4" />
            {publishing ? 'Publishing...' : published ? 'Republish' : 'Publish'}
          </button>
          {published && (
            <a
              href={`https://app.ainexorra.com/account/${accountSlug}/landing-pages/${page.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm flex items-center gap-1"
            >
              <Eye className="w-4 h-4" /> View
            </a>
          )}
          <button onClick={handleSave} disabled={saving} className="btn btn-secondary text-sm flex items-center gap-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Page URL (stable)</label>
              <p className="text-xs font-mono text-gray-700 bg-gray-50 rounded p-2 break-all select-all">
                https://app.ainexorra.com/account/{accountSlug}/landing-pages/{page.id}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain (optional)</label>
              <input
                value={customDomain}
                onChange={(e) => { setCustomDomain(e.target.value.toLowerCase().trim()); markDirty(); }}
                className="input text-sm"
                placeholder="lori.ourlimitedoffer.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add this domain to your Vercel project, then add a CNAME record pointing it to <span className="font-mono">cname.vercel-dns.com</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={content.styles.primaryColor}
                  onChange={(e) => { setContent(prev => ({ ...prev, styles: { ...prev.styles, primaryColor: e.target.value } })); markDirty(); }}
                  className="h-10 w-10 rounded-xl border-2 border-gray-200 p-0 overflow-hidden"
                />
                <input
                  value={content.styles.primaryColor}
                  onChange={(e) => { setContent(prev => ({ ...prev, styles: { ...prev.styles, primaryColor: e.target.value } })); markDirty(); }}
                  className="input text-sm flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
              <input value={metaTitle} onChange={(e) => { setMetaTitle(e.target.value); markDirty(); }} className="input text-sm" placeholder="Page title for SEO" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <input value={metaDescription} onChange={(e) => { setMetaDescription(e.target.value); markDirty(); }} className="input text-sm" placeholder="Page description for SEO" />
            </div>
          </div>
          <div className="flex items-center justify-between py-3 mt-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Facebook Pixel</p>
              <p className="text-xs text-gray-500">Track PageView, Lead &amp; Schedule events</p>
            </div>
            <button
              onClick={() => { setConnectPixel(p => !p); markDirty(); }}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors flex-shrink-0 ${connectPixel ? 'bg-primary-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${connectPixel ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
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
              {selectedBlock ? `Edit: ${selectedBlock.type}` : 'Properties'}
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
                accountId={accountId}
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

// ---- Image Upload Field ----
function ImageUploadField({
  label,
  value,
  onChange,
  accountId,
  rounded = false,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accountId: string;
  rounded?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('accountId', accountId);
      const res = await fetch('/api/landing-pages/upload-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        onChange(data.url);
      } else {
        toast.error('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      toast.error('Upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2 mb-1">
        {value ? (
          <img
            src={value}
            alt=""
            className={`w-12 h-12 object-cover border border-gray-200 flex-shrink-0 ${rounded ? 'rounded-full' : 'rounded'}`}
          />
        ) : (
          <div className={`w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0 ${rounded ? 'rounded-full' : 'rounded'}`}>
            <ImageIcon className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn btn-secondary text-xs flex items-center gap-1 px-2 py-1"
        >
          {uploading ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input text-xs"
        placeholder="Or paste image URL…"
      />
    </div>
  );
}

// ---- Block Property Editor ----
function BlockPropertyEditor({ block, onUpdate, primaryColor, accountId }: {
  block: LandingPageBlock;
  onUpdate: (data: Record<string, any>) => void;
  primaryColor: string;
  accountId: string;
}) {
  const { data } = block;
  const [specialtyInput, setSpecialtyInput] = useState('');

  const textInput = (label: string, key: string, placeholder?: string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
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
          className="h-10 w-10 rounded-xl border-2 border-gray-200 p-0 overflow-hidden"
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
        </div>,
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
        </div>,
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
        </div>,
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

    // ---- Real Estate Blocks ----

    case 're_hero':
      return (
        <div className="space-y-3">
          {textInput('Agent Name', 'agentName', 'Jane Smith')}
          {textInput('Title / Role', 'title', 'Licensed Real Estate Agent')}
          {textArea('Subtitle / Tagline', 'subtitle', 2)}
          <ImageUploadField
            label="Profile Photo"
            value={data.profileImageUrl || ''}
            onChange={(url) => onUpdate({ profileImageUrl: url })}
            accountId={accountId}
            rounded
          />
          {textInput('CTA Button Text', 'ctaText', 'View Available Homes')}
          {textInput('CTA Sub-text', 'ctaSubtext', '')}
          {colorInput('Background Color', 'bgColor')}
          {colorInput('Accent Color', 'accentColor')}
        </div>
      );

    case 're_about':
      return (
        <div className="space-y-3">
          {textInput('Section Heading', 'heading', 'About Jane')}
          {textArea('Bio', 'bio', 4)}
          <ImageUploadField
            label="About Section Photo"
            value={data.agentPhotoUrl || ''}
            onChange={(url) => onUpdate({ agentPhotoUrl: url })}
            accountId={accountId}
          />
          {numberInput('Years of Experience', 'yearsExperience')}
          {numberInput('Homes Closed', 'dealsClosed')}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Specialties</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {(data.specialties || []).map((s: string, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs">
                  {s}
                  <button
                    onClick={() => onUpdate({ specialties: (data.specialties || []).filter((_: string, j: number) => j !== i) })}
                    className="hover:text-red-600"
                  >×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                className="input text-xs flex-1"
                placeholder="Add specialty, press Enter…"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && specialtyInput.trim()) {
                    onUpdate({ specialties: [...(data.specialties || []), specialtyInput.trim()] });
                    setSpecialtyInput('');
                    e.preventDefault();
                  }
                }}
              />
              <button
                onClick={() => {
                  if (specialtyInput.trim()) {
                    onUpdate({ specialties: [...(data.specialties || []), specialtyInput.trim()] });
                    setSpecialtyInput('');
                  }
                }}
                className="btn btn-secondary px-2 py-1 text-xs"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          {colorInput('Accent Color', 'accentColor')}
        </div>
      );

    case 're_reviews':
      return (
        <div className="space-y-3">
          {textInput('Section Heading', 'heading', 'What My Clients Say')}
          {textInput('CTA Button Text', 'ctaText', 'Find Your Dream Home')}
          <label className="block text-xs font-medium text-gray-600">Reviews</label>
          {(data.reviews || []).map((review: any, i: number) => (
            <div key={i} className="border border-gray-200 rounded p-2 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => {
                        const reviews = [...(data.reviews || [])];
                        reviews[i] = { ...reviews[i], rating: star };
                        onUpdate({ reviews });
                      }}
                    >
                      <Star className={`w-4 h-4 ${star <= (review.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onUpdate({ reviews: (data.reviews || []).filter((_: any, j: number) => j !== i) })}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <textarea
                value={review.text || ''}
                onChange={(e) => { const r = [...(data.reviews || [])]; r[i] = { ...r[i], text: e.target.value }; onUpdate({ reviews: r }); }}
                className="input text-xs"
                rows={2}
                placeholder="What the client said..."
              />
              <input
                value={review.author || ''}
                onChange={(e) => { const r = [...(data.reviews || [])]; r[i] = { ...r[i], author: e.target.value }; onUpdate({ reviews: r }); }}
                className="input text-xs"
                placeholder="Client name"
              />
              <input
                value={review.location || ''}
                onChange={(e) => { const r = [...(data.reviews || [])]; r[i] = { ...r[i], location: e.target.value }; onUpdate({ reviews: r }); }}
                className="input text-xs"
                placeholder="Location (e.g. Miami, FL)"
              />
            </div>
          ))}
          <button
            onClick={() => onUpdate({ reviews: [...(data.reviews || []), { text: '', author: '', location: '', rating: 5 }] })}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add Review
          </button>
          {colorInput('Accent Color', 'accentColor')}
        </div>
      );

    case 're_properties':
      return (
        <div className="space-y-3">
          {textInput('Section Heading', 'heading', 'Featured Properties')}
          {textInput('Subheading', 'subheading', '')}
          <label className="block text-xs font-medium text-gray-600">Properties</label>
          {(data.properties || []).map((prop: any, i: number) => (
            <div key={i} className="border border-gray-200 rounded p-2 space-y-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-500">Property {i + 1}</span>
                <button
                  onClick={() => onUpdate({ properties: (data.properties || []).filter((_: any, j: number) => j !== i) })}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <input
                value={prop.address || ''}
                onChange={(e) => { const p = [...(data.properties || [])]; p[i] = { ...p[i], address: e.target.value }; onUpdate({ properties: p }); }}
                className="input text-xs"
                placeholder="123 Main St, City, FL"
              />
              <input
                value={prop.price || ''}
                onChange={(e) => { const p = [...(data.properties || [])]; p[i] = { ...p[i], price: e.target.value }; onUpdate({ properties: p }); }}
                className="input text-xs"
                placeholder="$450,000"
              />
              <div className="grid grid-cols-3 gap-1">
                <input
                  value={prop.beds || ''}
                  onChange={(e) => { const p = [...(data.properties || [])]; p[i] = { ...p[i], beds: e.target.value }; onUpdate({ properties: p }); }}
                  className="input text-xs"
                  placeholder="Beds"
                />
                <input
                  value={prop.baths || ''}
                  onChange={(e) => { const p = [...(data.properties || [])]; p[i] = { ...p[i], baths: e.target.value }; onUpdate({ properties: p }); }}
                  className="input text-xs"
                  placeholder="Baths"
                />
                <input
                  value={prop.sqft || ''}
                  onChange={(e) => { const p = [...(data.properties || [])]; p[i] = { ...p[i], sqft: e.target.value }; onUpdate({ properties: p }); }}
                  className="input text-xs"
                  placeholder="SqFt"
                />
              </div>
              <select
                value={prop.status || 'For Sale'}
                onChange={(e) => { const p = [...(data.properties || [])]; p[i] = { ...p[i], status: e.target.value }; onUpdate({ properties: p }); }}
                className="input text-xs"
              >
                <option>For Sale</option>
                <option>For Rent</option>
                <option>Sold</option>
                <option>Pending</option>
              </select>
              <ImageUploadField
                label="Property Photo"
                value={prop.imageUrl || ''}
                onChange={(url) => { const p = [...(data.properties || [])]; p[i] = { ...p[i], imageUrl: url }; onUpdate({ properties: p }); }}
                accountId={accountId}
              />
            </div>
          ))}
          <button
            onClick={() => onUpdate({ properties: [...(data.properties || []), { address: '', price: '', beds: '', baths: '', sqft: '', status: 'For Sale', imageUrl: '' }] })}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add Property
          </button>
          {colorInput('Accent Color', 'accentColor')}
        </div>
      );

    case 're_location':
      return (
        <div className="space-y-3">
          {textInput('Section Heading', 'heading', 'Find Me')}
          {textInput('Office Address', 'address', '123 Main St, City, FL')}
          {textInput('Phone', 'phone', '(305) 555-0123')}
          {textInput('Email', 'email', 'agent@example.com')}
          {textArea('Google Maps Embed URL', 'mapEmbedUrl', 2)}
          {colorInput('Accent Color', 'accentColor')}
        </div>
      );

    case 're_footer':
      return (
        <div className="space-y-3">
          {textInput('Agent Name', 'agentName', 'Jane Smith')}
          {textInput('Brokerage / Company', 'brokerage', 'Sunshine Realty Group')}
          {textInput('Email', 'email', 'jane@example.com')}
          {textInput('Phone', 'phone', '(305) 555-0123')}
          {textInput('License Number', 'license', 'License #FL-3456789')}
          {colorInput('Accent Color', 'accentColor')}
        </div>
      );

    default:
      return <p className="text-sm text-gray-500">No properties for this block type</p>;
  }
}
