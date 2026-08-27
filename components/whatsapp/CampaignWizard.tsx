'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TemplatePreview } from './TemplatePreview';
import {
  Megaphone,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Play,
  ArrowRight,
  ArrowLeft,
  Users,
  Sparkles,
} from 'lucide-react';
import { formatDisplayPhone } from '@/lib/utils';

interface CampaignWizardProps {
  connections: any[];
  templates: any[];
  existingContacts: any[];
}

export function CampaignWizard({
  connections,
  templates,
  existingContacts,
}: CampaignWizardProps) {
  const router = useRouter();

  // Wizard Steps: 1: Details & Sender, 2: Select Template, 3: CSV & Column Mapping, 4: Review & Launch
  const [step, setStep] = useState(1);

  // Form State
  const [name, setName] = useState('New Product Announcement');
  const [connectionId, setConnectionId] = useState(connections[0]?.id || '');
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');

  // CSV Data State
  const [csvRawText, setCsvRawText] = useState(
    'phone,name,order_id,amount\n919876543210,John Doe,ORD-1001,$49.99\n919876543211,Sarah Connor,ORD-1002,$120.00\n919876543212,Michael Scott,ORD-1003,$85.50'
  );
  const [csvColumns, setCsvColumns] = useState<string[]>(['phone', 'name', 'order_id', 'amount']);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [phoneColumn, setPhoneColumn] = useState('phone');
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({}); // { "1": "name", "2": "order_id" }

  // Opt-in Confirmation
  const [optInConfirmed, setOptInConfirmed] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Template
  const activeTemplate = templates.find((t) => t.id === templateId);

  // Parse CSV
  useEffect(() => {
    if (csvRawText) {
      Papa.parse(csvRawText.trim(), {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setCsvColumns(results.meta.fields);
            // Default phone column
            const matchedPhone = results.meta.fields.find((f) =>
              ['phone', 'mobile', 'phoneNumber', 'Phone'].includes(f)
            );
            if (matchedPhone) setPhoneColumn(matchedPhone);
          }
          setCsvRows(results.data);
        },
      });
    }
  }, [csvRawText]);

  // Extract template variables whenever template changes
  useEffect(() => {
    if (activeTemplate) {
      const vars = activeTemplate.body.match(/\{\{(\d+)\}\}/g) || [];
      const initialMap: Record<string, string> = {};
      vars.forEach((v: string, idx: number) => {
        const num = v.replace(/[^0-9]/g, '');
        // Auto-match if column exists with similar name
        const candidateCol = csvColumns[idx + 1] || csvColumns[1] || '';
        initialMap[num] = candidateCol;
      });
      setColumnMappings(initialMap);
    }
  }, [activeTemplate, csvColumns]);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text);
    };
    reader.readAsText(file);
  };

  const handleLaunchCampaign = async () => {
    if (!optInConfirmed) {
      setError('You must confirm that your recipients have valid WhatsApp opt-in before launching');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build recipients payload
      const recipients = csvRows.map((row) => {
        const phone = row[phoneColumn];
        const varValues = Object.keys(columnMappings)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((vKey) => row[columnMappings[vKey]] || '');

        return {
          phone,
          variables: varValues,
        };
      });

      const payload = {
        name,
        whatsappConnectionId: connectionId,
        templateId,
        recipients,
        variableMapping: columnMappings,
      };

      const res = await fetch('/api/v1/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create campaign');
      }

      router.push('/dashboard/campaigns');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to launch campaign');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Progress Steps Header */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            1
          </span>
          <span className={step === 1 ? 'font-bold text-slate-900' : 'text-slate-500'}>
            Setup & Template
          </span>
        </div>
        <span className="text-slate-300">→</span>
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            2
          </span>
          <span className={step === 2 ? 'font-bold text-slate-900' : 'text-slate-500'}>
            CSV & Mapping
          </span>
        </div>
        <span className="text-slate-300">→</span>
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            3
          </span>
          <span className={step === 3 ? 'font-bold text-slate-900' : 'text-slate-500'}>
            Opt-in & Launch
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Details & Template */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 space-y-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Campaign Settings
              </CardTitle>

              <Input
                label="Campaign Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. October Festive Promo"
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Sender WhatsApp Number
                </label>
                <select
                  value={connectionId}
                  onChange={(e) => setConnectionId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatDisplayPhone(c.displayPhoneNumber)} — {c.verifiedName || 'Business'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Select Approved Template <span className="text-rose-500">*</span>
                </label>
                {templates.length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    No approved templates available. Please create a template first.
                  </div>
                ) : (
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category} • {t.language})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!templateId || !name}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Audience
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            {activeTemplate && (
              <Card className="p-5">
                <CardHeader className="mb-2 pb-2">
                  <CardTitle className="text-sm font-bold text-slate-800">Selected Template Preview</CardTitle>
                </CardHeader>
                <TemplatePreview
                  headerType={activeTemplate.headerType}
                  headerText={activeTemplate.headerContent}
                  bodyText={activeTemplate.body}
                  footerText={activeTemplate.footer}
                  buttons={activeTemplate.buttonsJson ? JSON.parse(activeTemplate.buttonsJson) : []}
                  variables={{ '1': 'Customer', '2': '#ORD-101' }}
                />
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Step 2: CSV Data & Column Mapping */}
      {step === 2 && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Recipient Audience (CSV)
                </CardTitle>
                <CardDescription className="text-xs">
                  Upload a CSV file or edit raw rows directly
                </CardDescription>
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs">
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  Upload CSV File
                </span>
              </label>
            </div>

            <textarea
              rows={4}
              value={csvRawText}
              onChange={(e) => setCsvRawText(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none"
              placeholder="phone,name,variable1,variable2..."
            />

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Parsed <strong>{csvRows.length}</strong> recipient records from CSV</span>
            </div>
          </Card>

          {/* Variable Mapping Matrix */}
          <Card className="p-6 space-y-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Map CSV Columns to Template Variables
            </CardTitle>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Phone Number Column <span className="text-rose-500">*</span>
                </label>
                <select
                  value={phoneColumn}
                  onChange={(e) => setPhoneColumn(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  {csvColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {Object.keys(columnMappings).map((vKey) => (
                <div key={vKey} className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Variable {`{{${vKey}}}`}
                  </label>
                  <select
                    value={columnMappings[vKey] || ''}
                    onChange={(e) =>
                      setColumnMappings({
                        ...columnMappings,
                        [vKey]: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Leave Blank --</option>
                    {csvColumns.map((col) => (
                      <option key={col} value={col}>
                        Column: {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setStep(3)}
              disabled={csvRows.length === 0}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Review & Confirmation
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Opt-in Compliance & Queue Launch */}
      {step === 3 && (
        <div className="space-y-6">
          {/* WhatsApp Opt-in Mandate Callout */}
          <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-900 leading-relaxed">
                <p className="font-bold text-sm">WhatsApp Policy & Opt-In Compliance</p>
                <p>
                  Only contacts with valid WhatsApp opt-in should receive marketing or template messages. Meta monitors phone number quality ratings and Spam block rates. Sending unsolicited messages may lead to account throttling or template suspension.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-semibold text-amber-950 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={optInConfirmed}
                onChange={(e) => setOptInConfirmed(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-amber-300 focus:ring-indigo-500"
              />
              <span>
                I confirm that all {csvRows.length} recipients have explicitly opted in to receive WhatsApp messages from my business.
              </span>
            </label>
          </div>

          {/* Sample Recipient Preview Table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">
                  Recipient Data Preview (First 5 Rows)
                </CardTitle>
                <CardDescription className="text-xs">
                  Review interpolated phone numbers and variables before dispatch
                </CardDescription>
              </div>
              <Badge variant="neutral">{csvRows.length} Total Recipients</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Phone Number</th>
                    {Object.keys(columnMappings).map((vKey) => (
                      <th key={vKey} className="py-3 px-4">
                        Var {`{{${vKey}}}`} ({columnMappings[vKey]})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {csvRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {row[phoneColumn]}
                      </td>
                      {Object.keys(columnMappings).map((vKey) => (
                        <td key={vKey} className="py-3 px-4">
                          {row[columnMappings[vKey]] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Mapping
            </Button>

            <Button
              type="button"
              variant="whatsapp"
              size="lg"
              onClick={handleLaunchCampaign}
              disabled={!optInConfirmed || isLoading}
              isLoading={isLoading}
              className="px-8 font-semibold shadow-md gap-2"
              leftIcon={<Play className="w-4 h-4" />}
            >
              Launch Broadcast Campaign
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
