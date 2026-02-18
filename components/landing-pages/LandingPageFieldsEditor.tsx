'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Save, Loader, Star } from 'lucide-react';
import type { LandingPage } from '@/types';

interface LandingPageFieldsEditorProps {
  page: LandingPage;
  onClose: () => void;
  onSave: () => void;
}

export default function LandingPageFieldsEditor({ page, onClose, onSave }: LandingPageFieldsEditorProps) {
  const content = page.content || { blocks: [], styles: {} };
  const blocks = content.blocks || [];

  // Pull initial values from blocks
  const heroBlock = blocks.find((b: any) => b.type === 're_hero');
  const aboutBlock = blocks.find((b: any) => b.type === 're_about');
  const reviewsBlock = blocks.find((b: any) => b.type === 're_reviews');
  const locationBlock = blocks.find((b: any) => b.type === 're_location');
  const footerBlock = blocks.find((b: any) => b.type === 're_footer');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'hero' | 'about' | 'reviews' | 'location' | 'footer' | 'form' | 'tracking'>('hero');

  // Hero
  const [agentName, setAgentName] = useState(heroBlock?.data?.agentName || '');
  const [agentTitle, setAgentTitle] = useState(heroBlock?.data?.title || '');
  const [subtitle, setSubtitle] = useState(heroBlock?.data?.subtitle || '');
  const [profileImageUrl, setProfileImageUrl] = useState(heroBlock?.data?.profileImageUrl || '');
  const [ctaText, setCtaText] = useState(heroBlock?.data?.ctaText || 'View Available Homes');
  const [bgColor, setBgColor] = useState(heroBlock?.data?.bgColor || '#0f172a');
  const [accentColor, setAccentColor] = useState(heroBlock?.data?.accentColor || '#f59e0b');

  // About
  const [aboutHeading, setAboutHeading] = useState(aboutBlock?.data?.heading || '');
  const [bio, setBio] = useState(aboutBlock?.data?.bio || '');
  const [agentPhotoUrl, setAgentPhotoUrl] = useState(aboutBlock?.data?.agentPhotoUrl || '');
  const [yearsExp, setYearsExp] = useState<number>(aboutBlock?.data?.yearsExperience || 10);
  const [dealsClosed, setDealsClosed] = useState<number>(aboutBlock?.data?.dealsClosed || 100);
  const [specialties, setSpecialties] = useState<string[]>(aboutBlock?.data?.specialties || []);
  const [newSpecialty, setNewSpecialty] = useState('');

  // Reviews
  const [reviewsHeading, setReviewsHeading] = useState(reviewsBlock?.data?.heading || 'What My Clients Say');
  const [reviewsCtaText, setReviewsCtaText] = useState(reviewsBlock?.data?.ctaText || 'Find Your Dream Home');
  const [reviews, setReviews] = useState<any[]>(reviewsBlock?.data?.reviews || []);

  // Location
  const [locHeading, setLocHeading] = useState(locationBlock?.data?.heading || 'Find Me');
  const [address, setAddress] = useState(locationBlock?.data?.address || '');
  const [phone, setPhone] = useState(locationBlock?.data?.phone || '');
  const [email, setEmail] = useState(locationBlock?.data?.email || '');
  const [mapEmbedUrl, setMapEmbedUrl] = useState(locationBlock?.data?.mapEmbedUrl || '');

  // Footer
  const [brokerage, setBrokerage] = useState(footerBlock?.data?.brokerage || '');
  const [license, setLicense] = useState(footerBlock?.data?.license || '');

  // Available hours for calendar
  const [availStart, setAvailStart] = useState(page.content?.calendarSettings?.startHour ?? 9);
  const [availEnd, setAvailEnd] = useState(page.content?.calendarSettings?.endHour ?? 17);

  // Tracking pixels
  const existingPixels: any[] = page.tracking_pixels || [];
  const [fbPixelCode, setFbPixelCode] = useState<string>(
    existingPixels.find((p: any) => p.name === 'Facebook Pixel')?.code || ''
  );
  const [customScripts, setCustomScripts] = useState<string>(
    existingPixels.find((p: any) => p.name === 'Custom Scripts')?.code || ''
  );

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // Rebuild content with updated block data
      const updatedBlocks = content.blocks.map((block: any) => {
        switch (block.type) {
          case 're_hero':
            return { ...block, data: { ...block.data, agentName, title: agentTitle, subtitle, profileImageUrl, ctaText, bgColor, accentColor } };
          case 're_about':
            return { ...block, data: { ...block.data, heading: aboutHeading, bio, agentPhotoUrl, yearsExperience: yearsExp, dealsClosed, specialties, accentColor } };
          case 're_reviews':
            return { ...block, data: { ...block.data, heading: reviewsHeading, reviews, ctaText: reviewsCtaText, accentColor } };
          case 're_location':
            return { ...block, data: { ...block.data, heading: locHeading, address, phone, email, mapEmbedUrl, accentColor } };
          case 're_footer':
            return { ...block, data: { ...block.data, agentName, brokerage, phone, email, license, accentColor } };
          default:
            return block;
        }
      });

      const updatedContent = {
        ...content,
        blocks: updatedBlocks,
        styles: { ...content.styles, primaryColor: accentColor },
        calendarSettings: { startHour: availStart, endHour: availEnd },
      };

      // Build tracking_pixels array — only include non-empty entries
      const trackingPixels: any[] = [];
      if (fbPixelCode.trim()) {
        trackingPixels.push({ id: 'fb-pixel', name: 'Facebook Pixel', code: fbPixelCode.trim() });
      }
      if (customScripts.trim()) {
        trackingPixels.push({ id: 'custom-scripts', name: 'Custom Scripts', code: customScripts.trim() });
      }

      const res = await fetch(`/api/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent, tracking_pixels: trackingPixels }),
      });

      if (res.ok) {
        setMessage('✅ Saved successfully!');
        onSave();
      } else {
        setMessage('❌ Save failed. Please try again.');
      }
    } catch (err: any) {
      setMessage('❌ Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim()) {
      setSpecialties(prev => [...prev, newSpecialty.trim()]);
      setNewSpecialty('');
    }
  };

  const addReview = () => {
    setReviews(prev => [...prev, { text: '', author: '', location: '', rating: 5 }]);
  };

  const updateReview = (i: number, field: string, value: string | number) => {
    setReviews(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const removeReview = (i: number) => setReviews(prev => prev.filter((_, idx) => idx !== i));

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'hero', label: 'Hero' },
    { id: 'about', label: 'About' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'location', label: 'Location' },
    { id: 'footer', label: 'Footer' },
    { id: 'form', label: 'Calendar' },
    { id: 'tracking', label: 'Tracking' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Page Content</h2>
            <p className="text-sm text-gray-500 truncate">{page.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-gray-200 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                activeTab === t.id ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {activeTab === 'hero' && (
            <>
              <Field label="Agent Name" value={agentName} onChange={setAgentName} placeholder="Jane Smith" />
              <Field label="Title / Role" value={agentTitle} onChange={setAgentTitle} placeholder="Licensed Real Estate Agent" />
              <TextArea label="Subtitle / Tagline" value={subtitle} onChange={setSubtitle} rows={2} placeholder="Helping families find their dream home for over 15 years..." />
              <Field label="Profile Photo URL" value={profileImageUrl} onChange={setProfileImageUrl} placeholder="https://..." />
              {profileImageUrl && <img src={profileImageUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />}
              <Field label="CTA Button Text" value={ctaText} onChange={setCtaText} placeholder="View Available Homes" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Background Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-10 h-10 rounded border border-gray-300 cursor-pointer" />
                    <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} className="input flex-1 font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Accent Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-10 h-10 rounded border border-gray-300 cursor-pointer" />
                    <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="input flex-1 font-mono text-sm" />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'about' && (
            <>
              <Field label="Section Heading" value={aboutHeading} onChange={setAboutHeading} placeholder="About Jane" />
              <TextArea label="Bio" value={bio} onChange={setBio} rows={5} placeholder="Tell your story..." />
              <Field label="About Photo URL (optional, different from profile)" value={agentPhotoUrl} onChange={setAgentPhotoUrl} placeholder="https://..." />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Years of Experience</label>
                  <input type="number" value={yearsExp} onChange={e => setYearsExp(parseInt(e.target.value) || 0)} className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Homes Closed</label>
                  <input type="number" value={dealsClosed} onChange={e => setDealsClosed(parseInt(e.target.value) || 0)} className="input" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Specialties</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {specialties.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
                      {s}
                      <button onClick={() => setSpecialties(p => p.filter((_, idx) => idx !== i))} className="hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSpecialty()} placeholder="Add specialty..." className="input flex-1" />
                  <button onClick={addSpecialty} className="btn btn-secondary px-3"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'reviews' && (
            <>
              <Field label="Section Heading" value={reviewsHeading} onChange={setReviewsHeading} />
              <Field label="CTA Button Text" value={reviewsCtaText} onChange={setReviewsCtaText} />
              <div className="space-y-4 mt-2">
                {reviews.map((review, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button key={star} onClick={() => updateReview(i, 'rating', star)}>
                            <Star className={`w-5 h-5 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                          </button>
                        ))}
                      </div>
                      <button onClick={() => removeReview(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <TextArea label="Review Text" value={review.text} onChange={v => updateReview(i, 'text', v)} rows={2} placeholder="What the client said..." />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Client Name" value={review.author} onChange={v => updateReview(i, 'author', v)} placeholder="Sarah J." />
                      <Field label="Location" value={review.location} onChange={v => updateReview(i, 'location', v)} placeholder="Miami, FL" />
                    </div>
                  </div>
                ))}
                <button onClick={addReview} className="btn btn-secondary w-full flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add Review
                </button>
              </div>
            </>
          )}

          {activeTab === 'location' && (
            <>
              <Field label="Section Heading" value={locHeading} onChange={setLocHeading} />
              <Field label="Office Address" value={address} onChange={setAddress} placeholder="123 Main St, Miami, FL 33131" />
              <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="(305) 555-0123" />
              <Field label="Email Address" value={email} onChange={setEmail} placeholder="jane@example.com" />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Google Maps Embed URL</label>
                <textarea
                  value={mapEmbedUrl}
                  onChange={e => setMapEmbedUrl(e.target.value)}
                  className="input font-mono text-xs"
                  rows={3}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get this from Google Maps → Share → Embed a map → copy the URL from the src attribute
                </p>
              </div>
            </>
          )}

          {activeTab === 'footer' && (
            <>
              <p className="text-sm text-gray-500">Agent name and contact info are pulled from other sections automatically.</p>
              <Field label="Brokerage / Company" value={brokerage} onChange={setBrokerage} placeholder="Sunshine Realty Group" />
              <Field label="License Number" value={license} onChange={setLicense} placeholder="License #FL-3456789" />
            </>
          )}

          {activeTab === 'form' && (
            <>
              <p className="text-sm font-medium text-gray-900 mb-1">Calendar Availability</p>
              <p className="text-sm text-gray-500 mb-4">Set the hours when leads can book a call with you</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Available From</label>
                  <select value={availStart} onChange={e => setAvailStart(parseInt(e.target.value))} className="input">
                    {Array.from({ length: 12 }, (_, i) => i + 7).map(h => (
                      <option key={h} value={h}>{h > 12 ? `${h - 12}:00 PM` : h === 12 ? '12:00 PM' : `${h}:00 AM`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Available Until</label>
                  <select value={availEnd} onChange={e => setAvailEnd(parseInt(e.target.value))} className="input">
                    {Array.from({ length: 12 }, (_, i) => i + 8).map(h => (
                      <option key={h} value={h}>{h > 12 ? `${h - 12}:00 PM` : h === 12 ? '12:00 PM' : `${h}:00 AM`}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                <p className="text-sm text-blue-800">
                  Slots show Mon–Fri, 30-minute intervals. Times display automatically in the visitor's local timezone.
                </p>
              </div>
            </>
          )}

          {activeTab === 'tracking' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                <p className="text-sm text-amber-800 font-medium mb-1">How it works</p>
                <p className="text-sm text-amber-700">
                  Paste your tracking code below and click Save. It will automatically be injected into the page head when leads visit it. The pixel events (ViewContent, Lead, Schedule) fire automatically at the right steps.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Facebook Pixel Code
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Go to Facebook Events Manager → your Pixel → Setup → Install code manually → copy the full base code and paste it here.
                </p>
                <textarea
                  value={fbPixelCode}
                  onChange={e => setFbPixelCode(e.target.value)}
                  rows={8}
                  className="input font-mono text-xs resize-none"
                  placeholder={`<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s){...}\nfbq('init', 'YOUR_PIXEL_ID');\nfbq('track', 'PageView');\n</script>`}
                  spellCheck={false}
                />
                {fbPixelCode.includes('fbq(') && (
                  <p className="text-xs text-green-600 mt-1">✅ Facebook Pixel code detected</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Additional Scripts (optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Google Tag Manager, TikTok Pixel, or any other tracking code.
                </p>
                <textarea
                  value={customScripts}
                  onChange={e => setCustomScripts(e.target.value)}
                  rows={5}
                  className="input font-mono text-xs resize-none"
                  placeholder="<!-- Paste any other tracking scripts here -->"
                  spellCheck={false}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          {message && (
            <p className={`text-sm flex-1 ${message.includes('❌') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2">
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input" />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="input resize-none" />
    </div>
  );
}
