'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Save, Loader, Star, Upload, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-browser';
import type { LandingPage } from '@/types';

interface LandingPageFieldsEditorProps {
  page: LandingPage;
  onClose: () => void;
  onSave: () => void;
}

export default function LandingPageFieldsEditor({ page, onClose, onSave }: LandingPageFieldsEditorProps) {
  const content = page.content || { blocks: [], styles: {} };
  const blocks = content.blocks || [];

  const heroBlock = blocks.find((b: any) => b.type === 're_hero');
  const aboutBlock = blocks.find((b: any) => b.type === 're_about');
  const reviewsBlock = blocks.find((b: any) => b.type === 're_reviews');
  const locationBlock = blocks.find((b: any) => b.type === 're_location');
  const footerBlock = blocks.find((b: any) => b.type === 're_footer');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'hero' | 'about' | 'reviews' | 'location' | 'footer' | 'form'>('hero');
  const [locationAutoFilled, setLocationAutoFilled] = useState(false);

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

  // Calendar availability
  const [availStart, setAvailStart] = useState(page.content?.calendarSettings?.startHour ?? 9);
  const [availEnd, setAvailEnd] = useState(page.content?.calendarSettings?.endHour ?? 17);
  const [availTz, setAvailTz] = useState(page.content?.calendarSettings?.timezone || '');
  const [availDays, setAvailDays] = useState<number[]>(page.content?.calendarSettings?.availableDays || [1, 2, 3, 4, 5]);

  // Image upload state
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingAbout, setUploadingAbout] = useState(false);
  const profileFileRef = useRef<HTMLInputElement>(null);
  const aboutFileRef = useRef<HTMLInputElement>(null);

  // On mount: fetch account location info and auto-fill blank / ourlimitedoffer fields
  useEffect(() => {
    async function fetchLocationInfo() {
      if (!page.account_id) return;
      const { data: account } = await supabase
        .from('accounts')
        .select('settings')
        .eq('id', page.account_id)
        .single();

      const loc = account?.settings?.location_info || account?.settings?.location;
      if (!loc) return;

      let filled = false;

      setPhone((prev: string) => {
        const needsFill = !prev || prev.includes('ourlimitedoffer');
        if (needsFill && loc.phone) { filled = true; return loc.phone; }
        return prev;
      });

      setEmail((prev: string) => {
        const needsFill = !prev || prev.includes('ourlimitedoffer');
        if (needsFill && loc.email) { filled = true; return loc.email; }
        return prev;
      });

      setAddress((prev: string) => {
        if (!prev && loc.address) { filled = true; return loc.address; }
        return prev;
      });

      if (filled) setLocationAutoFilled(true);
    }
    fetchLocationInfo();
  }, [page.account_id]);

  const resetToAccountInfo = async () => {
    if (!page.account_id) return;
    const { data: account } = await supabase
      .from('accounts')
      .select('settings')
      .eq('id', page.account_id)
      .single();
    const loc = account?.settings?.location_info || account?.settings?.location;
    if (!loc) return;
    if (loc.phone) setPhone(loc.phone);
    if (loc.email) setEmail(loc.email);
    if (loc.address) setAddress(loc.address);
    setLocationAutoFilled(true);
  };

  const uploadImage = async (
    file: File,
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('accountId', page.account_id);
      const res = await fetch('/api/landing-pages/upload-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setUrl(data.url);
      } else {
        toast.error('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      toast.error('Upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
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
        calendarSettings: { startHour: availStart, endHour: availEnd, timezone: availTz || undefined, availableDays: availDays },
      };

      const res = await fetch(`/api/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent }),
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

  const addReview = () => setReviews(prev => [...prev, { text: '', author: '', location: '', rating: 5 }]);
  const updateReview = (i: number, field: string, value: string | number) =>
    setReviews(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const removeReview = (i: number) => setReviews(prev => prev.filter((_, idx) => idx !== i));

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'hero', label: 'Hero' },
    { id: 'about', label: 'About' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'location', label: 'Location' },
    { id: 'footer', label: 'Footer' },
    { id: 'form', label: 'Calendar' },
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

              {/* Profile photo */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Profile Photo</label>
                <div className="flex items-center gap-3 mb-2">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => profileFileRef.current?.click()}
                      disabled={uploadingProfile}
                      className="btn btn-secondary flex items-center gap-2 text-sm mb-1"
                    >
                      {uploadingProfile ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingProfile ? 'Uploading…' : 'Upload Photo'}
                    </button>
                    <p className="text-xs text-gray-500">JPG, PNG, WebP · max 5 MB</p>
                  </div>
                </div>
                <input ref={profileFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, setProfileImageUrl, setUploadingProfile); e.target.value = ''; }} />
                <input type="text" value={profileImageUrl} onChange={e => setProfileImageUrl(e.target.value)}
                  placeholder="Or paste an image URL…" className="input text-sm" />
              </div>

              <Field label="CTA Button Text" value={ctaText} onChange={setCtaText} placeholder="View Available Homes" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Background Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-10 h-10 rounded-xl border-2 border-gray-200 cursor-pointer p-0 overflow-hidden" />
                    <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} className="input flex-1 font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Accent Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-10 h-10 rounded-xl border-2 border-gray-200 cursor-pointer p-0 overflow-hidden" />
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

              {/* About photo */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  About Section Photo <span className="text-gray-400 font-normal text-xs">(optional · different from hero photo)</span>
                </label>
                <div className="flex items-center gap-3 mb-2">
                  {agentPhotoUrl ? (
                    <img src={agentPhotoUrl} alt="About" className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => aboutFileRef.current?.click()}
                      disabled={uploadingAbout}
                      className="btn btn-secondary flex items-center gap-2 text-sm mb-1"
                    >
                      {uploadingAbout ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingAbout ? 'Uploading…' : 'Upload Photo'}
                    </button>
                    <p className="text-xs text-gray-500">JPG, PNG, WebP · max 5 MB</p>
                  </div>
                </div>
                <input ref={aboutFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, setAgentPhotoUrl, setUploadingAbout); e.target.value = ''; }} />
                <input type="text" value={agentPhotoUrl} onChange={e => setAgentPhotoUrl(e.target.value)}
                  placeholder="Or paste an image URL…" className="input text-sm" />
              </div>

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
                  <input value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSpecialty()} placeholder="Add specialty..." className="input flex-1" />
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
              {locationAutoFilled && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                  <p className="text-sm text-blue-800">Contact info pre-filled from account location data.</p>
                  <button onClick={resetToAccountInfo} className="text-xs text-blue-700 font-medium hover:underline ml-3 whitespace-nowrap">
                    Reset to account info
                  </button>
                </div>
              )}
              <Field label="Section Heading" value={locHeading} onChange={setLocHeading} />
              <Field label="Office Address" value={address} onChange={setAddress} placeholder="123 Main St, Miami, FL 33131" />
              <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="(305) 555-0123" />
              <Field label="Email Address" value={email} onChange={setEmail} placeholder="jane@example.com" />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Google Maps Embed URL</label>
                <textarea value={mapEmbedUrl} onChange={e => setMapEmbedUrl(e.target.value)}
                  className="input font-mono text-xs" rows={3} placeholder="https://www.google.com/maps/embed?pb=..." />
                <p className="text-xs text-gray-500 mt-1">
                  Google Maps → Share → Embed a map → copy the URL from the src attribute
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
              <p className="text-sm text-gray-500 mb-4">Set the hours, timezone, and days when leads can book a call with you</p>

              {/* Timezone */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Timezone</label>
                <select value={availTz} onChange={e => setAvailTz(e.target.value)} className="input">
                  <option value="">-- Select timezone --</option>
                  <optgroup label="Eastern">
                    <option value="America/New_York">Eastern Time — New York / Toronto</option>
                  </optgroup>
                  <optgroup label="Central">
                    <option value="America/Chicago">Central Time — Chicago / Winnipeg</option>
                  </optgroup>
                  <optgroup label="Mountain">
                    <option value="America/Denver">Mountain Time — Denver / Calgary</option>
                    <option value="America/Phoenix">Mountain Time (no DST) — Phoenix / Arizona</option>
                    <option value="America/Edmonton">Mountain Time — Edmonton</option>
                  </optgroup>
                  <optgroup label="Pacific">
                    <option value="America/Los_Angeles">Pacific Time — Los Angeles / Vancouver</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="America/Anchorage">Alaska Time — Anchorage</option>
                    <option value="Pacific/Honolulu">Hawaii Time — Honolulu</option>
                    <option value="America/Halifax">Atlantic Time — Halifax</option>
                    <option value="America/St_Johns">Newfoundland Time — St. John's</option>
                  </optgroup>
                </select>
              </div>

              {/* Hours */}
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

              {/* Days */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Available Days</label>
                <div className="flex gap-2 flex-wrap">
                  {[{ d: 0, l: 'Sun' }, { d: 1, l: 'Mon' }, { d: 2, l: 'Tue' }, { d: 3, l: 'Wed' }, { d: 4, l: 'Thu' }, { d: 5, l: 'Fri' }, { d: 6, l: 'Sat' }].map(({ d, l }) => {
                    const on = availDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setAvailDays(prev => on ? prev.filter(x => x !== d) : Array.from(new Set([...prev, d])).sort())}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
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
