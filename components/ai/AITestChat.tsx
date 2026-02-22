'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, MessageSquare, Mail } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AITestChatProps {
  accountId: string;
  agentName?: string;
  agentRepresents?: string;
  channel?: 'sms' | 'email';
}

export default function AITestChat({ accountId, agentName = 'AI Agent', agentRepresents, channel = 'sms' }: AITestChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadName, setLeadName] = useState('Test Lead');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          messages: updatedMessages,
          leadName,
          channel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');

      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (e: any) {
      setError(e.message || 'Error getting AI response');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-gray-200 overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            {channel === 'email'
              ? <Mail className="w-4 h-4 text-primary-600" />
              : <MessageSquare className="w-4 h-4 text-primary-600" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{agentName}</p>
            {agentRepresents && (
              <p className="text-xs text-gray-500">on behalf of {agentRepresents}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Simulating lead:</label>
            <input
              type="text"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-primary-400"
              placeholder="Lead name"
            />
          </div>
          <button
            onClick={() => { setMessages([]); setError(''); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reset conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2">
            {channel === 'email' ? <Mail className="w-10 h-10 opacity-30" /> : <MessageSquare className="w-10 h-10 opacity-30" />}
            <p className="text-sm">
              {channel === 'email'
                ? 'Type a message below to simulate an inbound email from a lead.'
                : 'Type a message below to simulate an inbound text from a lead.'}
            </p>
            <p className="text-xs">The AI agent will respond based on your configured settings.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div className="max-w-[75%]">
              <p className={`text-[11px] font-medium mb-1 ${msg.role === 'user' ? 'text-gray-500 text-left' : 'text-primary-600 text-right'}`}>
                {msg.role === 'user' ? leadName : agentName}
              </p>
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
                    : 'bg-primary-600 text-white rounded-tr-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-end">
            <div className="bg-primary-100 text-primary-600 px-4 py-2 rounded-2xl rounded-tr-sm text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message as ${leadName}...`}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 max-h-24"
            style={{ minHeight: '38px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">Enter to send · Shift+Enter for new line · This is a local test — no real {channel === 'email' ? 'email' : 'SMS'} is sent</p>
      </div>
    </div>
  );
}
