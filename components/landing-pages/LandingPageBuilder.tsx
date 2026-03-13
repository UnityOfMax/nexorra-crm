'use client';

import { useState, useRef } from 'react';
import {
  ArrowLeft, Save, Eye, Globe, Settings, Trash2,
  Plus, Type, Image, MousePointerClick, FormInput,
  Video, Quote, Minus, LayoutList, ChevronUp, ChevronDown,
  Upload, Loader, ImageIcon, Star, Users, Clock,
} from 'lucide-react';
import type { CustomFormField, QuestionnaireConfig, QuestionnaireStepKey, QuestionnaireOption } from '@/lib/landing-page-templates';
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
  { type: 're_team', label: 'Team', icon: Users, description: 'Team members' },
] as const;

function getDefaultBlockData(type: string): Record<string, any> {
  switch (type) {
    case 'hero': return { heading: 'Your Headline Here', subheading: 'Your subheading goes here', ctaText: 'Get Started', ctaLink: '#', bgColor: '#1a1a2e', textColor: '#ffffff' };
    case 'text': return { content: '<p>Enter your text here...</p>' };
    case 'image': return { url: '', alt: '', alignment: 'center' };
    case 'cta': return { text: 'Click Here', link: '#', color: '#0ea5e9', size: 'large' };
    case 'form': return { heading: 'Get in Touch', customFields: [{ key: 'first_name', label: 'First Name', type: 'text', required: true, placeholder: 'Jane' }, { key: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'jane@email.com' }, { key: 'phone', label: 'Phone Number', type: 'tel', required: false, placeholder: '(555) 000-0000' }], buttonText: 'Submit', buttonColor: '#0ea5e9' };
    case 'video': return { url: '', caption: '' };
    case 'testimonial': return { quote: 'Customer testimonial goes here...', author: 'Customer Name', role: '' };
    case 'features': return { heading: 'Our Features', items: [{ title: 'Feature 1', description: 'Description' }, { title: 'Feature 2', description: 'Description' }, { title: 'Feature 3', description: 'Description' }] };
    case 'spacer': return { height: 40 };
    case 're_team': return { heading: 'Meet The Team', members: [{ name: 'Team Member', title: 'Role', bio: '', photoUrl: '' }], accentColor: '' };
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
  const [customDomain, setCustomDomain] = useState(page.custom_domain || '');
  const [published, setPublished] = useState(page.published);
  const [isDirty, setIsDirty] = useState(false);
  const [leftTab, setLeftTab] = useState<'blocks' | 'forms'>('blocks');

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
          connect_pixel: true,
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
          connect_pixel: true,
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

          {/* Availability Settings */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Booking Availability
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Timezone</label>
                <select
                  value={content.calendarSettings?.timezone || ''}
                  onChange={(e) => { setContent(prev => ({ ...prev, calendarSettings: { ...prev.calendarSettings, timezone: e.target.value || undefined } })); markDirty(); }}
                  className="input text-sm"
                >
                  <option value="">Auto-detect visitor timezone</option>
                  <option value="America/New_York">Eastern — New York / Toronto (ET)</option>
                  <option value="America/Chicago">Central — Chicago / Winnipeg (CT)</option>
                  <option value="America/Denver">Mountain — Denver / Edmonton (MT)</option>
                  <option value="America/Los_Angeles">Pacific — Los Angeles / Vancouver (PT)</option>
                  <option value="America/Phoenix">Arizona — Phoenix (MST, no DST)</option>
                  <option value="America/Anchorage">Alaska (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii (HST)</option>
                  <option value="America/Halifax">Halifax / Atlantic (AT)</option>
                  <option value="America/St_Johns">Newfoundland (NT)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Hour</label>
                <select
                  value={content.calendarSettings?.startHour ?? 9}
                  onChange={(e) => { setContent(prev => ({ ...prev, calendarSettings: { ...prev.calendarSettings, startHour: parseInt(e.target.value) } })); markDirty(); }}
                  className="input text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Hour</label>
                <select
                  value={content.calendarSettings?.endHour ?? 17}
                  onChange={(e) => { setContent(prev => ({ ...prev, calendarSettings: { ...prev.calendarSettings, endHour: parseInt(e.target.value) } })); markDirty(); }}
                  className="input text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
                <div className="flex gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                    const availDays = content.calendarSettings?.availableDays ?? [1, 2, 3, 4, 5];
                    const isOn = availDays.includes(i);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const next = isOn ? availDays.filter(d => d !== i) : [...availDays, i].sort((a, b) => a - b);
                          setContent(prev => ({ ...prev, calendarSettings: { ...prev.calendarSettings, availableDays: next } }));
                          markDirty();
                        }}
                        className={`px-2 py-1 text-xs rounded border font-medium transition-colors ${isOn ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Builder Area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Block Palette / Forms */}
        <div className="w-48 bg-white border border-gray-200 rounded-lg overflow-y-auto flex-shrink-0 flex flex-col">
          <div className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setLeftTab('blocks')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${leftTab === 'blocks' ? 'text-primary-700 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Blocks
            </button>
            <button
              onClick={() => setLeftTab('forms')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${leftTab === 'forms' ? 'text-primary-700 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Forms
            </button>
          </div>
          {leftTab === 'blocks' ? (
            <div className="p-2 space-y-1 overflow-y-auto">
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
          ) : (
            <div className="p-2 overflow-y-auto">
              {/* Real Estate Questionnaire — always present as global form */}
              <button
                onClick={() => setSelectedBlockId('__questionnaire__')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left mb-1 ${selectedBlockId === '__questionnaire__' ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <FormInput className="w-4 h-4 flex-shrink-0 text-amber-500" />
                <span className="truncate font-medium">RE Questionnaire</span>
              </button>
              {/* Inline form blocks */}
              {content.blocks.filter(b => b.type === 'form').map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBlockId(b.id); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left ${selectedBlockId === b.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <FormInput className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{b.data.heading || `Form ${idx + 1}`}</span>
                </button>
              ))}
              <button
                onClick={() => { addBlock('form'); setLeftTab('forms'); }}
                className="mt-2 w-full text-xs text-primary-600 hover:text-primary-700 font-medium py-1"
              >
                + Add Inline Form
              </button>
            </div>
          )}
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
              {selectedBlockId === '__questionnaire__' ? 'RE Questionnaire' : selectedBlock ? `Edit: ${selectedBlock.type}` : 'Properties'}
            </h3>
          </div>
          {selectedBlockId === '__questionnaire__' ? (
            <div className="p-3">
              <QuestionnaireEditor
                config={content.questionnaireConfig || {}}
                onChange={(cfg) => { setContent(prev => ({ ...prev, questionnaireConfig: cfg })); markDirty(); }}
              />
            </div>
          ) : selectedBlock ? (
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
      return (
        <div className="space-y-3">
          {textInput('Heading', 'heading')}
          {textInput('Button Text', 'buttonText')}
          {colorInput('Button Color', 'buttonColor')}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Form Fields</label>
            <div className="space-y-2">
              {((data.customFields || []) as CustomFormField[]).map((field, i) => (
                <div key={i} className="border border-gray-200 rounded p-2 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500">Field {i + 1}</span>
                    <button
                      onClick={() => onUpdate({ customFields: (data.customFields || []).filter((_: any, j: number) => j !== i) })}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    value={field.label}
                    onChange={(e) => { const f = [...(data.customFields || [])]; f[i] = { ...f[i], label: e.target.value }; onUpdate({ customFields: f }); }}
                    className="input text-xs"
                    placeholder="Label (e.g. First Name)"
                  />
                  <div className="grid grid-cols-2 gap-1">
                    <select
                      value={field.type}
                      onChange={(e) => { const f = [...(data.customFields || [])]; f[i] = { ...f[i], type: e.target.value as any }; onUpdate({ customFields: f }); }}
                      className="input text-xs"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Dropdown</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required ?? false}
                        onChange={(e) => { const f = [...(data.customFields || [])]; f[i] = { ...f[i], required: e.target.checked }; onUpdate({ customFields: f }); }}
                        className="rounded"
                      />
                      Required
                    </label>
                  </div>
                  <input
                    value={field.placeholder || ''}
                    onChange={(e) => { const f = [...(data.customFields || [])]; f[i] = { ...f[i], placeholder: e.target.value }; onUpdate({ customFields: f }); }}
                    className="input text-xs"
                    placeholder="Placeholder text"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const key = `field_${Date.now()}`;
                onUpdate({ customFields: [...(data.customFields || []), { key, label: 'New Field', type: 'text', required: false, placeholder: '' }] });
              }}
              className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add Field
            </button>
          </div>
        </div>
      );

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
          {textInput('Corporation / Subtitle', 'corporationText', 'Personal Real Estate Corporation')}
          {textInput('Title / Role', 'title', 'Licensed Real Estate Agent')}
          {textArea('Subtitle / Tagline', 'subtitle', 2)}
          <ImageUploadField
            label="Profile Photo"
            value={data.profileImageUrl || ''}
            onChange={(url) => onUpdate({ profileImageUrl: url })}
            accountId={accountId}
            rounded
          />
          <ImageUploadField
            label="Logo"
            value={data.logoUrl || ''}
            onChange={(url) => onUpdate({ logoUrl: url })}
            accountId={accountId}
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

    case 're_team':
      return (
        <div className="space-y-3">
          {textInput('Section Heading', 'heading', 'Meet The Team')}
          <label className="block text-xs font-medium text-gray-600">Team Members</label>
          {(data.members || []).map((member: any, i: number) => (
            <div key={i} className="border border-gray-200 rounded p-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500">Member {i + 1}</span>
                <button
                  onClick={() => onUpdate({ members: (data.members || []).filter((_: any, j: number) => j !== i) })}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <input
                value={member.name || ''}
                onChange={(e) => { const m = [...(data.members || [])]; m[i] = { ...m[i], name: e.target.value }; onUpdate({ members: m }); }}
                className="input text-xs"
                placeholder="Name"
              />
              <input
                value={member.title || ''}
                onChange={(e) => { const m = [...(data.members || [])]; m[i] = { ...m[i], title: e.target.value }; onUpdate({ members: m }); }}
                className="input text-xs"
                placeholder="Title / Role"
              />
              <textarea
                value={member.bio || ''}
                onChange={(e) => { const m = [...(data.members || [])]; m[i] = { ...m[i], bio: e.target.value }; onUpdate({ members: m }); }}
                className="input text-xs"
                rows={2}
                placeholder="Short bio (optional)"
              />
              <ImageUploadField
                label="Photo"
                value={member.photoUrl || ''}
                onChange={(url) => { const m = [...(data.members || [])]; m[i] = { ...m[i], photoUrl: url }; onUpdate({ members: m }); }}
                accountId={accountId}
                rounded
              />
            </div>
          ))}
          <button
            onClick={() => onUpdate({ members: [...(data.members || []), { name: 'New Member', title: '', bio: '', photoUrl: '' }] })}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add Member
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
          {textInput('Corporation / Subtitle', 'corporationText', 'Personal Real Estate Corporation')}
          {textInput('Email', 'email', 'jane@example.com')}
          {textInput('Phone', 'phone', '(305) 555-0123')}
          {textInput('License Number', 'license', 'License #FL-3456789')}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Text Colors</p>
            {colorInput('Agent Name', 'agentNameColor')}
            {colorInput('Brokerage', 'brokerageColor')}
            {colorInput('Corporation Text', 'corporationTextColor')}
            {colorInput('Contact Links', 'contactColor')}
            {colorInput('License', 'licenseColor')}
          </div>
        </div>
      );

    default:
      return <p className="text-sm text-gray-500">No properties for this block type</p>;
  }
}

// ---- Questionnaire Editor ----
const DEFAULT_STEP_OPTS: Partial<Record<QuestionnaireStepKey, QuestionnaireOption[]>> = {
  intent: [
    { emoji: '🏠', label: 'Buy a Home', sub: 'Find my perfect property', value: 'Buy' },
    { emoji: '💰', label: 'Sell My Home', sub: 'Get the best price', value: 'Sell' },
    { emoji: '🔄', label: 'Buy & Sell', sub: 'I need to do both', value: 'Buy & Sell' },
  ],
  situation: [
    { emoji: '🏡', label: 'I own a home', value: 'Own a Home' },
    { emoji: '🏢', label: "I'm renting", value: 'Renting' },
    { emoji: '🔍', label: 'Other', value: 'Other' },
  ],
  timeline: [
    { emoji: '🔥', label: 'Within 30 days', sub: "I'm ready to move fast", value: 'Within 30 Days' },
    { emoji: '📅', label: '1–2 months', value: '1–2 Months' },
    { emoji: '🗓️', label: '2–4 months', value: '2–4 Months' },
    { emoji: '📆', label: '4+ months', sub: 'Planning ahead', value: '4+ Months' },
  ],
  budget: [
    { label: 'Under $300K', sub: 'Starter / entry-level', value: 'Under $300K' },
    { label: '$300K – $500K', sub: 'Mid-range family homes', value: '$300K – $500K' },
    { label: '$500K – $750K', sub: 'Larger or premium locations', value: '$500K – $750K' },
    { label: '$750K – $1M', sub: 'Upscale properties', value: '$750K – $1M' },
    { label: 'Over $1M', sub: 'Luxury & estates', value: 'Over $1M' },
  ],
  sell_also: [
    { emoji: '✅', label: 'Yes, I need to sell as well', value: 'Yes' },
    { emoji: '❌', label: 'No, just looking to buy', value: 'No' },
  ],
  income: [
    { label: '$0 – $50K', value: '$0 – $50K' },
    { label: '$50K – $80K', value: '$50K – $80K' },
    { label: '$80K – $100K', value: '$80K – $100K' },
    { label: '$100K – $150K', value: '$100K – $150K' },
    { label: '$150K+', value: '$150K+' },
  ],
  call_time: [
    { emoji: '🌅', label: 'Morning', value: 'Morning' },
    { emoji: '☀️', label: 'Afternoon', value: 'Afternoon' },
    { emoji: '🌙', label: 'Evening', value: 'Evening' },
  ],
  serious: [
    { emoji: '💯', label: 'Yes, absolutely', sub: "I'm ready to take action", value: 'Yes' },
    { emoji: '🤔', label: 'Still exploring', sub: 'Not fully decided yet', value: 'Still Exploring' },
  ],
};

const QUESTIONNAIRE_STEPS: { key: QuestionnaireStepKey; label: string; inputType: 'choice' | 'text' | 'textarea' | 'grid' }[] = [
  { key: 'intent',      label: 'Intent',          inputType: 'choice' },
  { key: 'situation',   label: 'Situation',        inputType: 'choice' },
  { key: 'timeline',    label: 'Timeline',         inputType: 'choice' },
  { key: 'budget',      label: 'Budget / Price',   inputType: 'choice' },
  { key: 'wishlist',    label: 'Wishlist',         inputType: 'textarea' },
  { key: 'sell_also',   label: 'Also Selling?',    inputType: 'choice' },
  { key: 'employment',  label: 'Employment',       inputType: 'text' },
  { key: 'income',      label: 'Income',           inputType: 'choice' },
  { key: 'call_time',   label: 'Best Call Time',   inputType: 'grid' },
  { key: 'serious',     label: 'How Serious?',     inputType: 'choice' },
];

function QuestionnaireEditor({ config, onChange }: { config: QuestionnaireConfig; onChange: (cfg: QuestionnaireConfig) => void }) {
  const [expanded, setExpanded] = useState<QuestionnaireStepKey | null>(null);

  const update = (key: QuestionnaireStepKey, patch: Partial<typeof config[typeof key]>) => {
    onChange({ ...config, [key]: { ...config[key], ...patch } });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-3">Toggle steps on/off, edit headings and answer options for each question.</p>
      {QUESTIONNAIRE_STEPS.map(({ key, label, inputType }) => {
        const step = config[key];
        const isEnabled = step?.enabled !== false;
        const isExpanded = expanded === key;
        const stepOpts: QuestionnaireOption[] = step?.options || DEFAULT_STEP_OPTS[key] || [];

        return (
          <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <label className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0" onClick={() => update(key, { enabled: !isEnabled })}>
                <div className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 ${isEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} style={{ marginLeft: isEnabled ? '17px' : '2px' }} />
                </div>
                <span className={`text-xs font-medium truncate ${isEnabled ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
              </label>
              {isEnabled && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  {isExpanded ? '▲' : '▼'}
                </button>
              )}
            </div>

            {isEnabled && isExpanded && (
              <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50">
                <input
                  value={step?.heading || ''}
                  onChange={e => update(key, { heading: e.target.value || undefined })}
                  className="input text-xs"
                  placeholder="Question heading (leave blank for default)"
                />
                <input
                  value={step?.subheading || ''}
                  onChange={e => update(key, { subheading: e.target.value || undefined })}
                  className="input text-xs"
                  placeholder="Subheading (leave blank for default)"
                />
                {(inputType === 'choice' || inputType === 'grid') && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Answer options:</p>
                    {stepOpts.map((opt, i) => (
                      <div key={i} className="flex gap-1 mb-1">
                        <input
                          value={opt.emoji || ''}
                          onChange={e => { const o = [...stepOpts]; o[i] = { ...o[i], emoji: e.target.value }; update(key, { options: o }); }}
                          className="input text-xs w-10"
                          placeholder="🏠"
                        />
                        <input
                          value={opt.label}
                          onChange={e => { const o = [...stepOpts]; o[i] = { ...o[i], label: e.target.value, value: e.target.value }; update(key, { options: o }); }}
                          className="input text-xs flex-1"
                          placeholder="Label"
                        />
                        <button
                          onClick={() => update(key, { options: stepOpts.filter((_, j) => j !== i) })}
                          className="text-red-400 hover:text-red-600 px-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => update(key, { options: [...stepOpts, { label: 'New Option', value: 'New Option' }] })}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + Add Option
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
