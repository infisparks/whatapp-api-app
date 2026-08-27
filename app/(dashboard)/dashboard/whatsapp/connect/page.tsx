import React from 'react';
import { Card } from '@/components/ui/Card';
import { EmbeddedSignupButton } from '@/components/whatsapp/EmbeddedSignupButton';
import { META_CONFIG } from '@/lib/meta-config';
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Radio,
  QrCode,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function ConnectWhatsAppPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Connect WhatsApp Business
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Complete Meta Embedded Signup to link your existing business phone number with Coexistence enabled
        </p>
      </div>

      {/* Main Connection Card */}
      <Card className="p-6 sm:p-8">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-200">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Connect your existing WhatsApp Business account
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                You will be guided through Meta’s official Embedded Signup experience. Select or verify your WhatsApp Business account and phone number directly with Meta.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <EmbeddedSignupButton />
          </div>
        </div>
      </Card>

      {/* How Coexistence Works (Informational Section) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Smartphone className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">1. Keep Your Mobile App</h4>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Meta’s Coexistence feature allows your phone number to stay connected on your WhatsApp Business mobile app while linking to Cloud API.
          </p>
        </Card>

        <Card className="p-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">2. Meta Verified Flow</h4>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Official Facebook Login for Business with encrypted server token exchange. No third-party scrapers or unofficial APIs.
          </p>
        </Card>

        <Card className="p-5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">3. Instant Campaigns</h4>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Create WhatsApp message templates, submit for Meta approval, and run high-volume broadcast campaigns with delivery tracking.
          </p>
        </Card>
      </div>

      {/* Meta Technical Integration Spec */}
      <Card className="bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-3">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Active Meta Embedded Signup Configuration</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <p className="text-[10px] text-slate-400 font-medium">Meta App ID</p>
            <p className="font-mono font-bold text-slate-800 mt-0.5">{META_CONFIG.APP_ID}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <p className="text-[10px] text-slate-400 font-medium">Config ID</p>
            <p className="font-mono font-bold text-slate-800 mt-0.5">{META_CONFIG.EMBEDDED_SIGNUP_CONFIG_ID}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <p className="text-[10px] text-slate-400 font-medium">Feature Type</p>
            <p className="font-mono font-bold text-indigo-600 mt-0.5 truncate">{META_CONFIG.EMBEDDED_SIGNUP_FEATURE_TYPE}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <p className="text-[10px] text-slate-400 font-medium">Graph API Version</p>
            <p className="font-mono font-bold text-slate-800 mt-0.5">{META_CONFIG.GRAPH_API_VERSION}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
