'use client';

import { useState, useEffect } from 'react';
import { Contact } from '@/types';
import { supabase } from '@/lib/supabase';
import { Send, MessageSquare, Phone, Loader } from 'lucide-react';

interface SMSViewProps {
  accountId: string;
  contacts: Contact[];
}

export default function SMSView({ accountId, contacts }: SMSViewProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [smsHistory, setSmsHistory] = useState<any[]>([]);

  useEffect(() => {
    loadSmsHistory();
  }, [accountId]);

  const loadSmsHistory = async () => {
    const { data } = await supabase
      .from('activities')
      .select('*, contacts(first_name, last_name, phone)')
      .eq('account_id', accountId)
      .eq('type', 'sms')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setSmsHistory(data);
    }
  };

  const handleSendSMS = async () => {
    if (!selectedContact?.phone || !message.trim()) {
      setStatus('Please select a contact with a phone number and enter a message');
      return;
    }

    setSending(true);
    setStatus('');

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          to: selectedContact.phone,
          message: message.trim(),
          contactId: selectedContact.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('✅ SMS sent successfully!');
        setMessage('');
        loadSmsHistory();
      } else {
        setStatus('❌ Error: ' + (data.error || 'Failed to send SMS'));
      }
    } catch (error: any) {
      setStatus('❌ Error: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const contactsWithPhone = contacts.filter((c) => c.phone);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Send SMS Panel */}
      <div className="lg:col-span-2">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Send SMS</h2>
              <p className="text-sm text-gray-600">Send text messages to your contacts</p>
            </div>
          </div>

          {/* Contact Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Contact
            </label>
            <select
              value={selectedContact?.id || ''}
              onChange={(e) => {
                const contact = contacts.find((c) => c.id === e.target.value);
                setSelectedContact(contact || null);
              }}
              className="input"
            >
              <option value="">Choose a contact...</option>
              {contactsWithPhone.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name} - {contact.phone}
                </option>
              ))}
            </select>
            {contactsWithPhone.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ No contacts have phone numbers yet. Add phone numbers to send SMS.
              </p>
            )}
          </div>

          {/* Message Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input min-h-[120px]"
              placeholder="Type your message here..."
              maxLength={1600}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                {message.length}/1600 characters
              </p>
              <p className="text-xs text-gray-500">
                ~{Math.ceil(message.length / 160)} SMS segment{Math.ceil(message.length / 160) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Status Message */}
          {status && (
            <div className={`mb-4 p-3 rounded-lg ${
              status.includes('❌') 
                ? 'bg-red-50 text-red-700' 
                : 'bg-green-50 text-green-700'
            }`}>
              {status}
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSendSMS}
            disabled={sending || !selectedContact || !message.trim()}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send SMS
              </>
            )}
          </button>
        </div>
      </div>

      {/* SMS History Panel */}
      <div className="lg:col-span-1">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recent SMS</h3>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {smsHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No SMS messages yet
              </p>
            ) : (
              smsHistory.map((sms) => (
                <div key={sms.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-medium text-sm text-gray-900">
                      {sms.contacts?.first_name} {sms.contacts?.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(sms.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    {sms.contacts?.phone}
                  </div>
                  <div className="text-sm text-gray-700">
                    {sms.description}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
