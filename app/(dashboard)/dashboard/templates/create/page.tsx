'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TemplatePreview } from '@/components/whatsapp/TemplatePreview';
import { TemplateButton } from '@/services/templates';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Phone,
  CornerDownLeft,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function CreateTemplatePage() {
  const router = useRouter();

  // Template Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('en_US');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('Hello {{1}},\n\nYour order {{2}} has been confirmed and is scheduled for delivery on {{3}}.\n\nThank you for choosing us!');
  const [footerText, setFooterText] = useState('Reply STOP to unsubscribe');
  const [buttons, setButtons] = useState<TemplateButton[]>([
    { type: 'QUICK_REPLY', text: 'Track Order' },
    { type: 'URL', text: 'View Details', url: 'https://example.com/orders/{{1}}' },
  ]);

  // Preview Sample Variables State
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({
    '1': 'Alex Morgan',
    '2': '#ORD-8821',
    '3': 'Tomorrow, 2:00 PM',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to add dynamic variable to body
  const addVariableToBody = () => {
    const nextVarIndex = (bodyText.match(/\{\{(\d+)\}\}/g) || []).length + 1;
    setBodyText((prev) => `${prev} {{${nextVarIndex}}}`);
    setPreviewVars((prev) => ({
      ...prev,
      [String(nextVarIndex)]: `Sample ${nextVarIndex}`,
    }));
  };

  // Button Management
  const addButton = (type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER') => {
    if (buttons.length >= 3) {
      alert('Meta allows a maximum of 3 buttons per template');
      return;
    }
    if (type === 'URL') {
      setButtons([...buttons, { type: 'URL', text: 'Visit Website', url: 'https://example.com' }]);
    } else if (type === 'PHONE_NUMBER') {
      setButtons([...buttons, { type: 'PHONE_NUMBER', text: 'Call Support', phone_number: '+16505551234' }]);
    } else {
      setButtons([...buttons, { type: 'QUICK_REPLY', text: 'Quick Reply' }]);
    }
  };

  const updateButton = (index: number, field: string, value: string) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], [field]: value };
    setButtons(updated);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  // Submission to Meta
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    if (!cleanName) {
      setError('Please enter a valid template name (alphanumeric and underscores only)');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          category,
          language,
          headerType,
          headerText: headerType === 'TEXT' ? headerText : undefined,
          bodyText,
          footerText,
          buttons,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit template to Meta');
      }

      router.push('/dashboard/templates');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/templates">
          <Button variant="ghost" size="sm" className="p-2 -ml-2 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Create WhatsApp Template
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Submit a message template directly to Meta for approval
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Responsive Grid: Editor on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Template Editor Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* 1. Basic Info Card */}
          <Card className="p-6 space-y-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
              1. Basic Template Information
            </CardTitle>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Template Name"
                placeholder="e.g. order_confirmation"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                helperText="Lowercase alphanumeric with underscores only"
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="MARKETING">Marketing (Promotions, offers, news)</option>
                  <option value="UTILITY">Utility (Order updates, alerts, receipts)</option>
                  <option value="AUTHENTICATION">Authentication (OTPs, login codes)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="en_US">English (US)</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="es_LA">Spanish (Latin America)</option>
                  <option value="pt_BR">Portuguese (Brazil)</option>
                  <option value="hi_IN">Hindi (India)</option>
                  <option value="ar">Arabic</option>
                  <option value="fr_FR">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Header Type (Optional)
                </label>
                <select
                  value={headerType}
                  onChange={(e) => setHeaderType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="NONE">None</option>
                  <option value="TEXT">Text Header</option>
                  <option value="IMAGE">Image Media</option>
                  <option value="VIDEO">Video Media</option>
                  <option value="DOCUMENT">Document Attachment</option>
                </select>
              </div>
            </div>

            {headerType === 'TEXT' && (
              <Input
                label="Header Text"
                placeholder="e.g. Order Update for {{1}}"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
              />
            )}
          </Card>

          {/* 2. Message Body Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                2. Message Body (Required)
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariableToBody}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs h-8 text-indigo-600 border-indigo-200"
              >
                Insert Variable
              </Button>
            </div>

            <div className="space-y-1.5">
              <textarea
                rows={5}
                required
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Type your message text here. Use {{1}}, {{2}} for dynamic variables..."
                className="w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Variables: {(bodyText.match(/\{\{(\d+)\}\}/g) || []).join(', ') || 'None'}</span>
                <span>{bodyText.length} / 1024 characters</span>
              </div>
            </div>

            <Input
              label="Footer Text (Optional)"
              placeholder="e.g. Reply STOP to unsubscribe"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
            />
          </Card>

          {/* 3. Action Buttons Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                3. Buttons (Optional - Max 3)
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addButton('QUICK_REPLY')}
                  className="text-xs h-8"
                  disabled={buttons.length >= 3}
                >
                  + Quick Reply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addButton('URL')}
                  className="text-xs h-8"
                  disabled={buttons.length >= 3}
                >
                  + URL Link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addButton('PHONE_NUMBER')}
                  className="text-xs h-8"
                  disabled={buttons.length >= 3}
                >
                  + Call Phone
                </Button>
              </div>
            </div>

            {buttons.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No buttons added to this template.</p>
            ) : (
              <div className="space-y-3">
                {buttons.map((btn, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 uppercase">
                        Button {index + 1}: {btn.type}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeButton(index)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        label="Button Text"
                        value={btn.text}
                        onChange={(e) => updateButton(index, 'text', e.target.value)}
                        placeholder="Button label"
                      />
                      {btn.type === 'URL' && (
                        <Input
                          label="Website URL"
                          value={btn.url || ''}
                          onChange={(e) => updateButton(index, 'url', e.target.value)}
                          placeholder="https://example.com/..."
                        />
                      )}
                      {btn.type === 'PHONE_NUMBER' && (
                        <Input
                          label="Phone Number"
                          value={btn.phone_number || ''}
                          onChange={(e) => updateButton(index, 'phone_number', e.target.value)}
                          placeholder="+16505551234"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/dashboard/templates">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="px-8 font-semibold shadow-md"
            >
              Submit for Meta Approval
            </Button>
          </div>
        </form>

        {/* Right Column (5 cols): WhatsApp Smartphone Live Simulator */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <Card className="p-4 sm:p-5">
            <CardHeader className="mb-2 pb-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Live WhatsApp Preview</CardTitle>
                <CardDescription className="text-xs">Real-time simulation of recipient view</CardDescription>
              </div>
            </CardHeader>

            <div className="py-2">
              <TemplatePreview
                headerType={headerType}
                headerText={headerText}
                bodyText={bodyText}
                footerText={footerText}
                buttons={buttons}
                variables={previewVars}
              />
            </div>

            {/* Live Variable Sample Editor */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Preview Variable Values</span>
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.keys(previewVars).map((vKey) => (
                  <Input
                    key={vKey}
                    label={`{{${vKey}}}`}
                    value={previewVars[vKey]}
                    onChange={(e) =>
                      setPreviewVars({ ...previewVars, [vKey]: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
