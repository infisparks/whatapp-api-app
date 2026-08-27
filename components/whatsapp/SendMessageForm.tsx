'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TemplatePreview } from './TemplatePreview';
import {
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatDisplayPhone } from '@/lib/utils';

interface SendMessageFormProps {
  connections: any[];
  templates: any[];
  contacts: any[];
  initialTemplateName?: string;
  initialRecipient?: string;
}

export function SendMessageForm({
  connections,
  templates,
  contacts,
  initialTemplateName,
  initialRecipient,
}: SendMessageFormProps) {
  const router = useRouter();

  const [selectedConnectionId, setSelectedConnectionId] = useState(connections[0]?.id || '');
  const [recipientPhone, setRecipientPhone] = useState(initialRecipient || '');
  const [messageType, setMessageType] = useState<'TEMPLATE' | 'TEXT'>('TEMPLATE');
  const [selectedTemplateName, setSelectedTemplateName] = useState(
    initialTemplateName || templates[0]?.name || ''
  );
  const [textBody, setTextBody] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; metaId?: string } | null>(null);

  // Active Template
  const activeTemplate = templates.find((t) => t.name === selectedTemplateName);

  // Extract variables whenever active template changes
  useEffect(() => {
    if (activeTemplate) {
      const vars = activeTemplate.body.match(/\{\{(\d+)\}\}/g) || [];
      const varMap: Record<string, string> = {};
      vars.forEach((v: string) => {
        const num = v.replace(/[^0-9]/g, '');
        varMap[num] = variables[num] || `Value ${num}`;
      });
      setVariables(varMap);
    }
  }, [selectedTemplateName, activeTemplate]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);

    try {
      // Format variables array
      const varArray = Object.keys(variables)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((k) => variables[k]);

      const payload = {
        whatsappConnectionId: selectedConnectionId,
        recipientPhone,
        messageType,
        templateName: selectedTemplateName,
        templateLanguage: activeTemplate?.language || 'en_US',
        variables: { body: varArray },
        textBody,
      };

      const res = await fetch('/api/v1/whatsapp/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to dispatch message');
      }

      setFeedback({
        type: 'success',
        message: 'Message dispatched successfully to Meta Cloud API!',
        metaId: data.metaMessageId,
      });

      // Clear free-form text if used
      if (messageType === 'TEXT') setTextBody('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error sending message',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column (7 cols): Sender Configuration */}
      <form onSubmit={handleSend} className="lg:col-span-7 space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-sm">{feedback.message}</p>
              {feedback.metaId && (
                <p className="mt-1 font-mono text-[11px] opacity-80">
                  Meta Message ID: {feedback.metaId}
                </p>
              )}
            </div>
          </div>
        )}

        <Card className="p-6 space-y-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Sender & Recipient
          </CardTitle>

          {/* WhatsApp Connection Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Sender WhatsApp Number <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatDisplayPhone(c.displayPhoneNumber)} — {c.verifiedName || 'Business Account'}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Phone */}
          <Input
            label="Recipient Phone Number (with Country Code)"
            placeholder="+91 98765 43210 or 919876543210"
            required
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            helperText="Standard E.164 format. Meta accepts digits without spaces or symbols."
          />

          {/* Quick contact picker */}
          {contacts.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Or pick recent contact:</span>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {contacts.slice(0, 5).map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setRecipientPhone(ct.phone)}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
                  >
                    {ct.name || ct.phone}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Message Type Toggle */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Message Content
            </CardTitle>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMessageType('TEMPLATE')}
                className={`px-3 py-1 rounded-md transition-all ${
                  messageType === 'TEMPLATE'
                    ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                WhatsApp Template
              </button>
              <button
                type="button"
                onClick={() => setMessageType('TEXT')}
                className={`px-3 py-1 rounded-md transition-all ${
                  messageType === 'TEXT'
                    ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Direct Text (24h Window)
              </button>
            </div>
          </div>

          {messageType === 'TEMPLATE' ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Select Approved Template <span className="text-rose-500">*</span>
                </label>
                {templates.length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    No approved templates found. Please create and submit a template for Meta approval first.
                  </div>
                ) : (
                  <select
                    value={selectedTemplateName}
                    onChange={(e) => setSelectedTemplateName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.category} • {t.language})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Dynamic Variables Form */}
              {Object.keys(variables).length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Fill Template Variables</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.keys(variables).map((vKey) => (
                      <Input
                        key={vKey}
                        label={`Variable {{${vKey}}}`}
                        placeholder={`Value for {{${vKey}}}`}
                        required
                        value={variables[vKey]}
                        onChange={(e) =>
                          setVariables({ ...variables, [vKey]: e.target.value })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p>
                  Free-form direct text messages can only be sent if the customer messaged your WhatsApp account within the last 24 hours. Outside 24 hours, Meta requires an approved Template message.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Message Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  placeholder="Type your response to the customer..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="whatsapp"
            size="lg"
            isLoading={isLoading}
            className="px-8 font-semibold shadow-md gap-2"
            leftIcon={<Send className="w-4 h-4" />}
          >
            Dispatch Message
          </Button>
        </div>
      </form>

      {/* Right Column (5 cols): Live WhatsApp Smartphone Preview */}
      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
        <Card className="p-4 sm:p-5">
          <CardHeader className="mb-2 pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">Live Recipient View</CardTitle>
              <CardDescription className="text-xs">Preview of rendered message bubble</CardDescription>
            </div>
          </CardHeader>

          <div className="py-2">
            {messageType === 'TEMPLATE' && activeTemplate ? (
              <TemplatePreview
                headerType={activeTemplate.headerType}
                headerText={activeTemplate.headerContent}
                bodyText={activeTemplate.body}
                footerText={activeTemplate.footer}
                buttons={
                  activeTemplate.buttonsJson
                    ? JSON.parse(activeTemplate.buttonsJson)
                    : []
                }
                variables={variables}
              />
            ) : (
              <TemplatePreview
                bodyText={textBody || 'Type your message text...'}
                variables={{}}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
