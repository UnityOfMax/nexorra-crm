'use client';

import { useState } from 'react';
import { X, Building2, Globe, Hash, User, MapPin, Mail, Phone } from 'lucide-react';

interface CreateSubAccountModalProps {
  agencyId: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSubAccountModal({
  agencyId,
  userId,
  onClose,
  onSuccess
}: CreateSubAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Location fields (business/client owner)
    location_first_name: '',
    location_last_name: '',
    location_email: '',
    location_phone: '',
    location_address: '',
    // Account fields
    name: '',
    slug: '',
    domain: '',
    timezone: '',
    // Primary user (optional)
    user_first_name: '',
    user_email: '',
    user_phone: '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleLocationNameChange = (field: 'location_first_name' | 'location_last_name', value: string) => {
    const updated = { ...formData, [field]: value };
    // Auto-populate account name from location name
    const firstName = field === 'location_first_name' ? value : formData.location_first_name;
    const lastName = field === 'location_last_name' ? value : formData.location_last_name;
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) {
      updated.name = fullName;
      updated.slug = generateSlug(fullName);
    }
    setFormData(updated);
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name)
    });
  };

  const generatedEmail = formData.location_first_name && formData.location_last_name
    ? `${formData.location_first_name.toLowerCase().replace(/\s+/g, '')}${formData.location_last_name.toLowerCase().replace(/\s+/g, '')}@contact.ourlimitedoffer.com`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/agency/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          userId,
          name: formData.name,
          slug: formData.slug,
          domain: formData.domain || undefined,
          location: {
            first_name: formData.location_first_name,
            last_name: formData.location_last_name,
            email: formData.location_email,
            phone: formData.location_phone || undefined,
            address: formData.location_address || undefined,
          },
          timezone: formData.timezone || undefined,
          userInfo: formData.user_email ? {
            first_name: formData.user_first_name,
            email: formData.user_email,
            phone: formData.user_phone || undefined,
          } : undefined,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sub-account');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Building2 className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create Sub-Account</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Location Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location / Business Owner
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.location_first_name}
                  onChange={(e) => handleLocationNameChange('location_first_name', e.target.value)}
                  className="input"
                  placeholder="Brian"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.location_last_name}
                  onChange={(e) => handleLocationNameChange('location_last_name', e.target.value)}
                  className="input"
                  placeholder="James"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.location_email}
                    onChange={(e) => setFormData({ ...formData, location_email: e.target.value })}
                    className="input pl-10"
                    placeholder="brian@example.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.location_phone}
                    onChange={(e) => setFormData({ ...formData, location_phone: e.target.value })}
                    className="input pl-10"
                    placeholder="+1 555 000 0000"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  className="input pl-10"
                  placeholder="123 Main St, City, State"
                />
              </div>
            </div>
          </div>

          {/* Auto-generated Email Preview */}
          {generatedEmail && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Sending email:</strong> {generatedEmail}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This email will be used for automated communications and client emails.
              </p>
            </div>
          )}

          <hr className="border-gray-200" />

          {/* Account Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Account Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="input pl-10"
                    placeholder="e.g., Brian James"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                      className="input pl-10"
                      placeholder="brian-james"
                      pattern="[a-z0-9\-]+"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain (Optional)
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="input pl-10"
                      placeholder="crm.client.com"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Calendar Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="input"
                >
                  <option value="">Browser default</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                  <option value="America/Anchorage">Alaska</option>
                  <option value="Pacific/Honolulu">Hawaii</option>
                  <option value="America/Halifax">Atlantic (AT)</option>
                  <option value="America/Vancouver">Vancouver (PT)</option>
                  <option value="America/Toronto">Toronto (ET)</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Kolkata">Mumbai (IST)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                  <option value="Pacific/Auckland">Auckland (NZST)</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Primary User Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Primary User (Optional)
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Invite a user to this sub-account. You can also invite users later from the account details.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.user_first_name}
                  onChange={(e) => setFormData({ ...formData, user_first_name: e.target.value })}
                  className="input"
                  placeholder="Brian"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.user_email}
                  onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                  className="input"
                  placeholder="brian@example.com"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.user_phone}
                onChange={(e) => setFormData({ ...formData, user_phone: e.target.value })}
                className="input"
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Sub-Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
