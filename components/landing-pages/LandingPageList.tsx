'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Globe, Pencil, Trash2, Eye, Search, LayoutTemplate, Settings2 } from 'lucide-react';
import LandingPageBuilder from './LandingPageBuilder';
import LandingPageFieldsEditor from './LandingPageFieldsEditor';
import { templates, getEmptyContent } from '@/lib/landing-page-templates';
import type { LandingPage } from '@/types';

interface LandingPageListProps {
  accountId: string;
  accountSlug: string;
  isAgencyUser?: boolean;
}

export default function LandingPageList({ accountId, accountSlug, isAgencyUser }: LandingPageListProps) {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [editingFieldsPage, setEditingFieldsPage] = useState<LandingPage | null>(null);
  const [showCreateChoice, setShowCreateChoice] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    loadPages();
  }, [accountId]);

  const loadPages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/landing-pages?accountId=${accountId}`);
      const data = await response.json();
      if (response.ok) {
        setPages(data.pages || []);
      }
    } catch (error) {
      console.error('Error loading landing pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPage = async (name: string, slug: string, content?: any) => {
    try {
      const response = await fetch('/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          name,
          slug,
          content: content || getEmptyContent(),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setEditingPage(data.page);
        loadPages();
      }
    } catch (error) {
      console.error('Error creating page:', error);
    }
  };

  const publishPage = async (page: LandingPage) => {
    try {
      const response = await fetch(`/api/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: page.name,
          slug: page.slug,
          content: page.content,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
          tracking_pixels: page.tracking_pixels,
          published: true,
        }),
      });
      if (response.ok) {
        loadPages();
      }
    } catch (error) {
      console.error('Error publishing page:', error);
    }
  };

  const deletePage = async (page: LandingPage) => {
    if (!confirm(`Delete "${page.name}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/landing-pages/${page.id}`, { method: 'DELETE' });
      if (response.ok) {
        loadPages();
      }
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  };

  const filteredPages = pages.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If editing a page, show the builder
  if (editingPage) {
    return (
      <LandingPageBuilder
        page={editingPage}
        accountId={accountId}
        accountSlug={accountSlug}
        onBack={() => {
          setEditingPage(null);
          loadPages();
        }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Landing Pages</h2>
          <p className="text-gray-600 mt-1">Create and manage landing pages for lead capture</p>
        </div>
        <button
          onClick={() => setShowCreateChoice(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Page
        </button>
      </div>

      {/* Search */}
      {pages.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className="input pl-10"
            />
          </div>
        </div>
      )}

      {/* Pages Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading pages...</div>
      ) : filteredPages.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No pages found' : 'No landing pages yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery ? 'Try a different search' : 'Create your first landing page to start capturing leads'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateChoice(true)}
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Page
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map((page) => (
            <div key={page.id} className="card hover:shadow-lg transition-shadow">
              {/* Preview thumbnail */}
              <div
                className="h-40 rounded-t-lg bg-gray-100 flex items-center justify-center cursor-pointer"
                onClick={() => setEditingPage(page)}
                style={{
                  backgroundColor: page.content?.styles?.primaryColor
                    ? `${page.content.styles.primaryColor}15`
                    : '#f3f4f6',
                }}
              >
                <FileText className="w-12 h-12 text-gray-400" />
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-base font-semibold text-gray-900 truncate cursor-pointer hover:text-primary-600"
                      onClick={() => setEditingPage(page)}
                    >
                      {page.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono truncate">app.ainexorra.com/account/{accountSlug}/landing-pages/{page.id}</p>
                  </div>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                    page.published
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {page.published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setEditingPage(page)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"
                    title="Edit page layout"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  {isAgencyUser && (
                    <button
                      onClick={() => setEditingFieldsPage(page)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"
                      title="Edit agent fields"
                    >
                      <Settings2 className="w-4 h-4" />
                      Fields
                    </button>
                  )}
                  {!page.published && (
                    <button
                      onClick={() => publishPage(page)}
                      className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      title="Publish"
                    >
                      <Eye className="w-4 h-4" />
                      Publish
                    </button>
                  )}
                  {page.published && (
                    <a
                      href={`https://app.ainexorra.com/account/${accountSlug}/landing-pages/${page.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"
                    >
                      <Globe className="w-4 h-4" />
                      View
                    </a>
                  )}
                  <button
                    onClick={() => deletePage(page)}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 ml-auto"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Choice Modal */}
      {showCreateChoice && (
        <CreateChoiceModal
          onFromScratch={() => {
            setShowCreateChoice(false);
            const name = prompt('Page name:');
            if (name) {
              const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              createPage(name, slug);
            }
          }}
          onFromTemplate={() => {
            setShowCreateChoice(false);
            setShowTemplates(true);
          }}
          onClose={() => setShowCreateChoice(false)}
        />
      )}

      {/* Template Picker Modal */}
      {showTemplates && (
        <TemplatePicker
          onSelect={(template) => {
            setShowTemplates(false);
            const name = prompt('Page name:', template.name);
            if (name) {
              const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              createPage(name, slug, template.content);
            }
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Fields Editor Modal (agency/admin only) */}
      {editingFieldsPage && (
        <LandingPageFieldsEditor
          page={editingFieldsPage}
          onClose={() => setEditingFieldsPage(null)}
          onSave={() => {
            setEditingFieldsPage(null);
            loadPages();
          }}
        />
      )}
    </div>
  );
}

function CreateChoiceModal({ onFromScratch, onFromTemplate, onClose }: {
  onFromScratch: () => void;
  onFromTemplate: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Create Landing Page</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onFromScratch}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-center"
          >
            <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">Start from Scratch</p>
            <p className="text-sm text-gray-500 mt-1">Empty canvas</p>
          </button>
          <button
            onClick={onFromTemplate}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-center"
          >
            <LayoutTemplate className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">From Template</p>
            <p className="text-sm text-gray-500 mt-1">Pre-built designs</p>
          </button>
        </div>
        <button onClick={onClose} className="btn btn-secondary w-full mt-4">Cancel</button>
      </div>
    </div>
  );
}

function TemplatePicker({ onSelect, onClose }: {
  onSelect: (template: typeof templates[0]) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Choose a Template</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
            >
              <span className="text-3xl mb-3 block">{template.thumbnail}</span>
              <p className="font-semibold text-gray-900">{template.name}</p>
              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
              <p className="text-xs text-gray-400 mt-2">{template.content.blocks.length} blocks</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
