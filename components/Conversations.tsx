'use client';

import { useState, useEffect, useRef } from 'react';
import { Contact } from '@/types';
import { supabase } from '@/lib/supabase-browser';
import { Send, MessageSquare, Phone, Mail, Loader, Search, X, Bot, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
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
  is_ai_generated?: boolean;
  ai_metadata?: Record<string, any>;
  metadata?: {
    subject?: string;
  };
  created_at: string;
}

interface AiConfig {
  enabled: boolean;
  mode: 'suggest' | 'auto';
  channels: { sms: boolean; email: boolean };
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

  // AI state
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [contactAiEnabled, setContactAiEnabled] = useState(true);

  // Load AI config for this account
  useEffect(() => {
    const loadAiConfig = async () => {
      try {
        const res = await fetch(`/api/ai/config?accountId=${accountId}`);
        if (res.ok) {
          const data = await res.json();
          setAiConfig(data.config);
        }
      } catch (error) {
        console.error('Error loading AI config:', error);
      }
    };
    loadAiConfig();
  }, [accountId]);

  // Load draft messages from localStorage when contact changes
  useEffect(() => {
    if (selectedContact) {
      const draftKey = `draft_${selectedContact.id}`;
      const subjectKey = `subject_${selectedContact.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      const savedSubject = localStorage.getItem(subjectKey);

      if (savedDraft) setNewMessage(savedDraft);
      if (savedSubject) setEmailSubject(savedSubject);

      // Load per-contact AI setting
      setContactAiEnabled(selectedContact.ai_enabled !== false);
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
            const newMsg = payload.new as Message;
            setMessages((prev) => [...prev, newMsg]);

            // AI auto-respond / suggest on inbound messages
            if (newMsg.direction === 'inbound' && aiConfig?.enabled && contactAiEnabled) {
              const channel = newMsg.type === 'email' ? 'email' : 'sms';
              if (aiConfig.channels[channel]) {
                if (aiConfig.mode === 'auto') {
                  // Auto-respond: generate and send
                  handleAiAutoRespond(channel);
                } else {
                  // Suggest: generate draft
                  handleAiSuggest(channel);
                }
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedContact, aiConfig, contactAiEnabled, accountId]);

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

  const handleAiSuggest = async (channel: MessageType) => {
    if (!selectedContact || aiGenerating) return;
    setAiGenerating(true);

    try {
      const res = await fetch('/api/ai/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          contactId: selectedContact.id,
          channel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewMessage(data.response);
        if (data.subject && channel === 'email') {
          setEmailSubject(data.subject);
          setMessageType('email');
          setShowEmailComposer(true);
        }
      }
    } catch (error) {
      console.error('AI suggest error:', error);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiAutoRespond = async (channel: MessageType) => {
    if (!selectedContact) return;

    try {
      await fetch('/api/ai/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          contactId: selectedContact.id,
          channel,
        }),
      });
      // Messages will arrive via real-time subscription
    } catch (error) {
      console.error('AI auto-respond error:', error);
    }
  };

  const handleGenerateAiResponse = () => {
    const channel = messageType === 'email' ? 'email' : 'sms';
    handleAiSuggest(channel);
  };

  const toggleContactAi = async () => {
    if (!selectedContact) return;
    const newValue = !contactAiEnabled;
    setContactAiEnabled(newValue);

    await fetch(`/api/contacts/${selectedContact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_enabled: newValue }),
    });
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
        if (selectedContact) {
          localStorage.removeItem(`draft_${selectedContact.id}`);
        }
        setNewMessage('');
        loadMessages();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedContact?.email || !newMessage.trim() || !emailSubject.trim()) {
      toast.error('Please enter both subject and message');
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
        toast.error(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
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

  const isAiActive = aiConfig?.enabled && contactAiEnabled;

  return (
    <div className="h-[calc(100vh-180px)] flex bg-white dark:bg-[#2c2c2e] rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Left Sidebar - Contact List (hidden when a contact is selected on mobile) */}
      <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-gray-200 flex-col`}>
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-white/5 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              No contacts found
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 ${
                  selectedContact?.id === contact.id ? 'bg-primary-50' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </div>

                {/* Contact Info */}
                <div className="flex-1 text-left overflow-hidden">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {contact.first_name} {contact.last_name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {contact.phone || contact.email || 'No contact info'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Conversation (full width on mobile when contact selected) */}
      {!selectedContact ? (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 dark:bg-white/5">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Select a conversation</h3>
            <p className="text-gray-500 dark:text-gray-400">Choose a contact to view messages</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Conversation Header */}
          <div className="p-3 md:p-4 border-b border-gray-200 bg-white dark:bg-[#2c2c2e]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Back button on mobile */}
                <button
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label="Back"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                  {selectedContact.first_name?.[0]}{selectedContact.last_name?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedContact.first_name} {selectedContact.last_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedContact.phone || selectedContact.email}</p>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                {/* AI Toggle for this contact */}
                {aiConfig?.enabled && (
                  <button
                    onClick={toggleContactAi}
                    className={`p-2 rounded-lg transition-colors ${
                      contactAiEnabled
                        ? 'bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                        : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400'
                    }`}
                    title={contactAiEnabled ? `AI Active (${aiConfig.mode})` : 'AI Disabled for this contact'}
                  >
                    <Bot className="w-5 h-5" />
                  </button>
                )}

                {/* Message Type Selector */}
                <button
                  onClick={() => setMessageType('sms')}
                  className={`p-2 rounded-lg transition-colors ${
                    messageType === 'sms' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400'
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
                    messageType === 'email' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Email"
                  disabled={!selectedContact.email}
                >
                  <Mail className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-600 dark:text-gray-400" title="Call" disabled>
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-white/5">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
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
                          message.is_ai_generated
                            ? 'border-violet-300 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-700'
                            : message.direction === 'outbound'
                            ? 'bg-white dark:bg-[#2c2c2e] border-gray-300 shadow-sm'
                            : 'bg-gray-50 dark:bg-white/5 border-gray-200'
                        }`}
                      >
                        <div className="px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {message.metadata?.subject || '(No Subject)'}
                            </span>
                            {message.is_ai_generated && (
                              <span className="inline-flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                                <Bot className="w-3 h-3" /> AI
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">
                            {message.content.substring(0, 150)}
                            {message.content.length > 150 && '...'}
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 border-t border-gray-200">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>
                              {message.direction === 'outbound' ? 'To: ' : 'From: '}
                              {message.direction === 'outbound' ? message.to_address : message.from_address}
                            </span>
                            <span>{format(new Date(message.created_at), 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // SMS format - blue bubble (violet for AI)
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          message.is_ai_generated
                            ? 'bg-violet-500 text-white rounded-br-sm'
                            : message.direction === 'outbound'
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm border border-gray-200'
                        }`}
                      >
                        {message.is_ai_generated && (
                          <div className={`flex items-center gap-1 text-xs mb-1 ${
                            message.direction === 'outbound' ? 'text-violet-200' : 'text-violet-500'
                          }`}>
                            <Bot className="w-3 h-3" />
                            <span>AI Response</span>
                          </div>
                        )}
                        <div className="break-words whitespace-pre-wrap">{message.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            message.is_ai_generated
                              ? 'text-violet-200'
                              : message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
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
          <div className="p-4 border-t border-gray-200 bg-white dark:bg-[#2c2c2e]">
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
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/5 dark:text-gray-100"
                />
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write your email..."
                  className="w-full resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] dark:bg-white/5 dark:text-gray-100"
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
                  {isAiActive && (
                    <button
                      onClick={handleGenerateAiResponse}
                      disabled={aiGenerating}
                      className="btn bg-violet-100 text-violet-700 hover:bg-violet-200 flex items-center justify-center gap-2"
                    >
                      {aiGenerating ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      AI Draft
                    </button>
                  )}
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
              <div className="text-center text-sm text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                This contact doesn't have a phone number or email. Add contact info to send messages.
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
                  className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 max-h-32 dark:bg-white/5 dark:text-gray-100"
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
                {/* AI Generate button */}
                {isAiActive && messageType === 'sms' && (
                  <button
                    onClick={handleGenerateAiResponse}
                    disabled={aiGenerating}
                    className="h-[42px] px-3 rounded-xl bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Generate AI Response"
                  >
                    {aiGenerating ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                )}
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
