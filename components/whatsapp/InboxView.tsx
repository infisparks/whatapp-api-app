'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDisplayPhone, formatRelativeTime } from '@/lib/utils';
import {
  MessageSquare,
  Send,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Sparkles,
  LayoutTemplate,
  Search,
  RefreshCw,
  Phone,
  User,
} from 'lucide-react';

interface InboxViewProps {
  initialContacts: any[];
  templates: any[];
  connections: any[];
}

export function InboxView({
  initialContacts,
  templates,
  connections,
}: InboxViewProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    initialContacts[0]?.id || null
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [windowInfo, setWindowInfo] = useState<{
    isOpen: boolean;
    remainingMinutes: number;
    expiresAt?: string;
  }>({ isOpen: true, remainingMinutes: 1440 });

  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Quick Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState(templates[0]?.name || '');
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({ '1': 'Customer' });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Selected contact
  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  // Fetch thread messages whenever selected contact changes
  const fetchThread = async (contactId: string) => {
    try {
      const res = await fetch(`/api/v1/whatsapp/inbox/${contactId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setWindowInfo(data.window || { isOpen: false, remainingMinutes: 0 });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (selectedContactId) {
      fetchThread(selectedContactId);
      const interval = setInterval(() => fetchThread(selectedContactId), 6000);
      return () => clearInterval(interval);
    }
  }, [selectedContactId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Direct Message Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedContactId) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/v1/whatsapp/inbox/${selectedContactId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText, type: 'TEXT' }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (data.requiresTemplate) {
          setIsTemplateModalOpen(true);
        } else {
          alert(data.error || 'Failed to send reply');
        }
      } else {
        setReplyText('');
        fetchThread(selectedContactId);
      }
    } catch {
      alert('Error sending message');
    } finally {
      setIsSending(false);
    }
  };

  // Send Template Reply
  const handleSendTemplate = async () => {
    if (!selectedContactId || !templateName) return;
    setIsSending(true);

    try {
      const varArray = Object.values(templateVars);
      const res = await fetch(`/api/v1/whatsapp/inbox/${selectedContactId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TEMPLATE',
          templateName,
          variables: { body: varArray },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to send template');
      } else {
        setIsTemplateModalOpen(false);
        fetchThread(selectedContactId);
      }
    } catch {
      alert('Error sending template');
    } finally {
      setIsSending(false);
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Left Column (4 cols): Conversations List */}
      <div className="md:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
        <div className="p-3.5 border-b border-slate-200 space-y-2">
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftElement={<Search className="w-3.5 h-3.5" />}
            className="h-8 text-xs bg-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const lastMsg = contact.messages?.[0];
              const isSelected = contact.id === selectedContactId;

              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContactId(contact.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {contact.name || formatDisplayPhone(contact.phone)}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {formatRelativeTime(lastMsg?.createdAt || contact.updatedAt)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {formatDisplayPhone(contact.phone)}
                  </p>

                  <p className="text-xs text-slate-600 truncate mt-1">
                    {lastMsg?.body || 'No messages yet'}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column (8 cols): Chat Window */}
      <div className="md:col-span-8 flex flex-col h-full bg-[#EFEAE2]/30">
        {selectedContact ? (
          <>
            {/* Contact Top Bar */}
            <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {selectedContact.name
                    ? selectedContact.name.slice(0, 2).toUpperCase()
                    : 'WA'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {selectedContact.name || formatDisplayPhone(selectedContact.phone)}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {formatDisplayPhone(selectedContact.phone)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTemplateModalOpen(true)}
                  leftIcon={<LayoutTemplate className="w-3.5 h-3.5" />}
                  className="text-xs h-8"
                >
                  Send Template
                </Button>
              </div>
            </div>

            {/* 24-Hour Customer Care Window Banner */}
            <div
              className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
                windowInfo.isOpen
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-100'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {windowInfo.isOpen ? (
                  <span>
                    <strong>24-Hour Service Window Open:</strong> You can send free-form text or templates ({Math.floor(windowInfo.remainingMinutes / 60)}h {windowInfo.remainingMinutes % 60}m remaining)
                  </span>
                ) : (
                  <span>
                    <strong>24-Hour Service Window Expired:</strong> Meta policy requires an approved Template message to initiate or restart chat.
                  </span>
                )}
              </div>

              {!windowInfo.isOpen && (
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="font-bold underline text-[11px]"
                >
                  Choose Template
                </button>
              )}
            </div>

            {/* Message Thread Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  No message history with this contact.
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutbound = msg.direction === 'OUTBOUND';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-xs text-xs space-y-1 ${
                          isOutbound
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white text-slate-900 rounded-bl-none border border-slate-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] ${
                            isOutbound ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatRelativeTime(msg.sentAt || msg.createdAt)}</span>
                          {isOutbound && (
                            <span>
                              {msg.status === 'READ' ? (
                                <CheckCheck className="w-3 h-3 text-sky-300" />
                              ) : msg.status === 'DELIVERED' ? (
                                <CheckCheck className="w-3 h-3 text-slate-300" />
                              ) : msg.status === 'FAILED' ? (
                                <AlertCircle className="w-3 h-3 text-rose-300" />
                              ) : (
                                <Check className="w-3 h-3 text-slate-300" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area */}
            <form
              onSubmit={handleSendReply}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  windowInfo.isOpen
                    ? 'Type a message to customer...'
                    : 'Window expired. Use "Send Template" button to reply...'
                }
                disabled={!windowInfo.isOpen || isSending}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
              />

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!windowInfo.isOpen || !replyText.trim() || isSending}
                isLoading={isSending}
                className="h-9 px-4"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Select a conversation from the left to start messaging
          </div>
        )}
      </div>

      {/* Send Template Modal for 24h Window Restart */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Send WhatsApp Template Message"
        description="Select an approved template to restart customer communication"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Template
            </label>
            <select
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Variable {'{{1}}'}
            </label>
            <Input
              value={templateVars['1'] || ''}
              onChange={(e) => setTemplateVars({ ...templateVars, '1': e.target.value })}
              placeholder="e.g. Customer Name"
              className="h-8 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="whatsapp"
              size="sm"
              onClick={handleSendTemplate}
              isLoading={isSending}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send Template Message
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
