import React from 'react';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { META_CONFIG } from '@/lib/meta-config';
import { formatDate } from '@/lib/utils';
import {
  Settings,
  ShieldCheck,
  Radio,
  Copy,
  CheckCircle2,
  ExternalLink,
  Lock,
  Building2,
  List,
} from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

export default async function SettingsPage() {
  const session = await getAuthSession();
  const orgId = session?.organizationId || '';

  const [org, auditLogs] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'whatsapp_webhook_verify_token_2026';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Settings & Meta Configuration
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Webhook endpoints, Meta App Dashboard integration values, and organization details
        </p>
      </div>

      {/* Meta Webhook Setup Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Meta WhatsApp Webhook Configuration
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Enter these exact values in your Meta Developer Portal under <strong>WhatsApp → Configuration → Webhook</strong>
            </CardDescription>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          {/* Callback URL */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-semibold text-slate-600 block uppercase tracking-wider text-[11px]">
              Callback URL (External)
            </span>
            <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border font-mono text-[11px] text-slate-800 break-all">
              <span>{META_CONFIG.WEBHOOK_URL}</span>
              <CopyButton text={META_CONFIG.WEBHOOK_URL} />
            </div>
          </div>

          {/* Verify Token */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-semibold text-slate-600 block uppercase tracking-wider text-[11px]">
              Verify Token (Configured)
            </span>
            <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border font-mono text-[11px] text-slate-800 break-all">
              <span>{verifyToken}</span>
              <CopyButton text={verifyToken} />
            </div>
          </div>
        </div>

        {/* Required Webhook Fields */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="text-xs font-bold text-slate-700">Required Webhook Field Subscriptions:</span>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            {[
              'messages',
              'message_template_status_update',
              'message_template_quality_update',
              'phone_number_quality_update',
              'phone_number_name_update',
              'smb_message_echoes',
              'smb_app_state_sync',
              'history',
            ].map((field) => (
              <span
                key={field}
                className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold"
              >
                {field} ✓
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Meta App Domain & Embedded Signup Setup */}
      <Card className="p-6 space-y-4">
        <CardTitle className="text-base font-bold text-slate-900">
          Meta App Settings & Allowlist Guide
        </CardTitle>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            To ensure the Meta JavaScript SDK and Facebook Login for Business can initialize smoothly on your domain, ensure the following is configured in your Meta Developer Dashboard:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 font-medium text-slate-800">
            <li>
              <strong>App Domains (Basic Settings):</strong> Add <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">aiwh.infiplus.in</code>
            </li>
            <li>
              <strong>Website Site URL:</strong> Set to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">https://aiwh.infiplus.in</code>
            </li>
            <li>
              <strong>Facebook Login for Business → Valid OAuth Redirect URIs:</strong> Add <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">https://aiwh.infiplus.in/dashboard/whatsapp/connect</code>
            </li>
            <li>
              <strong>Embedded Signup Config ID:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">1084755870646567</code> (Coexistence Feature: <code className="font-mono">whatsapp_business_app_onboarding</code>)
            </li>
          </ul>
        </div>
      </Card>

      {/* Organization Members Card */}
      <Card className="p-6 space-y-4">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Organization: {org?.name}</span>
        </CardTitle>

        <div className="divide-y divide-slate-100 text-xs">
          {org?.members.map((member) => (
            <div key={member.id} className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{member.user.name}</p>
                <p className="text-slate-400">{member.user.email}</p>
              </div>
              <Badge variant="primary">{member.role}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Audit Log Trail */}
      <Card className="p-6 space-y-4">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <List className="w-4 h-4 text-indigo-600" />
          <span>Security Audit Trail</span>
        </CardTitle>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No audit log entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Resource</th>
                  <th className="py-2 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 px-3 font-semibold text-indigo-600">{log.action}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{log.resourceType}</td>
                    <td className="py-2 px-3 text-slate-400">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
