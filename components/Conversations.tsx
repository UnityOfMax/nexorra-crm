'use client';

import { useState, useEffect, useRef } from 'react';
import { Contact } from '@/types';
import { supabase } from '@/lib/supabase';
import { Send, MessageSquare, Phone, Mail, Loader, Search, X } from 'lucide-react';
import { format } from 'date-fns';

interface ConversationsProps {
  accountId: string;
  contacts: Contact[];
  selectedContactId?: string;
}

interface Message {
  id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  type: 'sms' | 'email' | 'call';
  content: string;
  from_address: string;
  to_address: string;
  status: string;
  metadata?: {
    subject?: string;
  };
  created_at: string;
}

type MessageType = 'sms' | 'email';

export default function Conversations({ accountId, contacts, selectedContactId }: ConversationsProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('sms');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load draft messages from localStorage when contact changes
  useEffect(() => {
    if (selectedContact) {
      const draftKey = `draft_${selectedContact.id}`;
      const subjectKey = `subject_${selectedContact.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      const savedSubject = localStorage.getItem(subjectKey);
      
      if (savedDraft) setNewMessage(savedDraft);
      if (savedSubject) setEmailSubject(savedSubject);
    } else {
      setNewMessage('');
      setEmailSubject('');
    }
  }, [selectedContact]);

  // Save draft to localStorage whenever it changes
  useEffect(() => {
    if (selectedContact && newMessage) {
      const draftKey = `draft_${selectedContact.id}`;
      localStorage.setItem(draftKey, newMessage);
    }
  }, [newMessage, selectedContact]);

  // Save email subject to localStorage
  useEffect(() => {
    if (selectedContact && emailSubject) {
      const subjectKey = `subject_${selectedContact.id}`;
      localStorage.setItem(subjectKey, emailSubject);
    }
  }, [emailSubject, selectedContact]);

  // Auto-select contact if passed from props
  useEffect(() => {
    if (selectedContactId) {
      const contact = contacts.find(c => c.id === selectedContactId);
      if (contact) {
        setSelectedContact(contact);
      }
    }
  }, [selectedContactId, contacts]);

  // Load messages when contact is selected
  useEffect(() => {
    if (selectedContact) {
      loadMessages();
      // Set up real-time subscription for new messages
      const channel = supabase
        .channel(`messages-${selectedContact.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `contact_id=eq.${selectedContact.id}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedContact]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (!selectedContact) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('account_id', accountId)
      .eq('contact_id', selectedContact.id)
      .order('created_at', { ascending: true });

    if (data && !error) {
      setMessages(data);
    }
    setLoading(false);
  };

  const handleSendSMS = async () => {
    if (!selectedContact?.phone || !newMessage.trim()) return;

    setSending(true);

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          to: selectedContact.phone,
          message: newMessage.trim(),
          contactId: selectedContact.id,
        }),
      });

      if (response.ok) {
        // Clear drafts from localStorage
        if (selectedContact) {
          localStorage.removeItem(`draft_${selectedContact.id}`);
        }
        setNewMessage('');
        loadMessages();
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to send message'));
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedContact?.email || !newMessage.trim() || !emailSubject.trim()) {
      alert('Please enter both subject and message');
      return;
    }

    setSending(true);

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          to: selectedContact.email,
          subject: emailSubject.trim(),
          textContent: newMessage.trim(),
          htmlContent: `<p>${newMessage.trim().replace(/\n/g, '<br>')}</p>`,
          contactId: selectedContact.id,
        }),
      });

      if (response.ok) {
        // Clear drafts from localStorage
        if (selectedContact) {
          localStorage.removeItem(`draft_${selectedContact.id}`);
          localStorage.removeItem(`subject_${selectedContact.id}`);
        }
        setNewMessage('');
        setEmailSubject('');
        setShowEmailComposer(false);
        loadMessages();
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to send email'));
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (messageType === 'email') {
      handleSendEmail();
    } else {
      handleSendSMS();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && messageType === 'sms') {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const search = searchTerm.toLowerCase();
    return (
      contact.first_name?.toLowerCase().includes(search) ||
      contact.last_name?.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.phone?.includes(search)
    );
  });

  return (
    <div className="h-[calc(100vh-180px)] flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Left Sidebar - Contact List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No contacts found
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedContact?.id === contact.id ? 'bg-primary-50' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </div>

                {/* Contact Info */}
                <div className="flex-1 text-left overflow-hidden">
                  <div className="font-medium text-gray-900 truncate">
                    {contact.first_name} {contact.last_name}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {contact.phone || contact.email || 'No contact info'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Conversation */}
      {!selectedContact ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
            <p className="text-gray-500">Choose a contact to view messages</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Conversation Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                  {selectedContact.first_name?.[0]}{selectedContact.last_name?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedContact.first_name} {selectedContact.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedContact.phone || selectedContact.email}</p>
                </div>
              </div>

              {/* Message Type Selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMessageType('sms')}
                  className={`p-2 rounded-lg transition-colors ${
                    messageType === 'sms' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="SMS"
                  disabled={!selectedContact.phone}
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setMessageType('email');
                    setShowEmailComposer(true);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    messageType === 'email' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Email"
                  disabled={!selectedContact.email}
                >
                  <Mail className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600" title="Call" disabled>
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No messages yet</p>
                  <p className="text-sm text-gray-400 mt-1">Send your first message below</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type === 'email' ? (
                      // Email format - white card with subject and preview
                      <div
                        className={`max-w-[75%] rounded-lg border ${
                          message.direction === 'outbound'
                            ? 'bg-white border-gray-300 shadow-sm'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold text-gray-900">
                              {message.metadata?.subject || '(No Subject)'}
                            </span>
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <div className="text-gray-700 whitespace-pre-wrap line-clamp-3">
                            {message.content.substring(0, 150)}
                            {message.content.length > 150 && '...'}
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {message.direction === 'outbound' ? 'To: ' : 'From: '}
                              {message.direction === 'outbound' ? message.to_address : message.from_address}
                            </span>
                            <span>{format(new Date(message.created_at), 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // SMS format - blue bubble
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          message.direction === 'outbound'
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-200'
                        }`}
                      >
                        <div className="break-words whitespace-pre-wrap">{message.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {format(new Date(message.created_at), 'h:mm a')}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            {messageType === 'email' && showEmailComposer ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm font-medium">Compose Email</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowEmailComposer(false);
                      setMessageType('sms');
                      setEmailSubject('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write your email..."
                  className="w-full resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowEmailComposer(false);
                      setEmailSubject('');
                      setNewMessage('');
                    }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sending || !newMessage.trim() || !emailSubject.trim()}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
                  >
                    {sending ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : !selectedContact.phone && !selectedContact.email ? (
              <div className="text-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                ⚠️ This contact doesn't have a phone number or email. Add contact info to send messages.
              </div>
            ) : (
              <div className="flex gap-2 items-end">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={messageType === 'email' ? 'Click to compose email...' : 'Type a message...'}
                  onClick={() => {
                    if (messageType === 'email') {
                      setShowEmailComposer(true);
                    }
                  }}
                  className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 max-h-32"
                  rows={1}
                  style={{
                    minHeight: '42px',
                    height: 'auto',
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                  disabled={messageType === 'sms' && !selectedContact.phone}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim() || (messageType === 'sms' && !selectedContact.phone)}
                  className="btn btn-primary h-[42px] px-4 flex items-center gap-2 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
