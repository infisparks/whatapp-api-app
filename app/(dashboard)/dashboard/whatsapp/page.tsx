import React from 'react';
import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDisplayPhone, formatDate } from '@/lib/utils';
import {
  Smartphone,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Trash2,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { WhatsAppAccountActions } from '@/components/whatsapp/WhatsAppAccountActions';

export default async function WhatsAppAccountsPage() {
  const session = await getAuthSession();
  const orgId = session?.organizationId || '';

  const connections = await prisma.whatsAppConnection.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          templates: true,
          campaigns: true,
          messages: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            WhatsApp Business Accounts
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your connected WhatsApp phone numbers and Coexistence status
          </p>
        </div>

        <Link href="/dashboard/whatsapp/connect">
          <Button variant="whatsapp" leftIcon={<QrCode className="w-4 h-4" />}>
            Connect WhatsApp
          </Button>
        </Link>
      </div>

      {/* Coexistence Explanation Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 flex flex-col sm:flex-row items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
          <p className="font-bold text-slate-900 text-sm">
            WhatsApp Business App Coexistence Enabled
          </p>
          <p>
            With Meta’s <code className="bg-white/80 px-1 py-0.5 rounded border border-emerald-200 font-mono font-semibold text-emerald-800">whatsapp_business_app_onboarding</code> feature, you do <strong>not</strong> lose access to your existing mobile WhatsApp Business app. You can reply on your phone and simultaneously execute bulk campaigns and webhooks through this portal.
          </p>
        </div>
      </div>

      {/* Accounts List */}
      {connections.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <QrCode className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Connect your existing WhatsApp Business account
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                Launch Meta Embedded Signup to securely onboard your WhatsApp Business phone number. Keep your mobile app active while enabling Cloud API messaging.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/dashboard/whatsapp/connect">
                <Button variant="whatsapp" size="lg" leftIcon={<Smartphone className="w-5 h-5" />}>
                  Connect WhatsApp Account
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {connections.map((conn) => (
            <Card key={conn.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Left: Account Identity */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h4 className="text-lg font-bold text-slate-900">
                        {formatDisplayPhone(conn.displayPhoneNumber)}
                      </h4>
                      <Badge variant="status" status={conn.status}>
                        Connected ✓
                      </Badge>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Coexistence: {conn.coexistenceStatus || 'ACTIVE'}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-700">
                      {conn.verifiedName || 'WhatsApp Business Name'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span>Connected: {formatDate(conn.embeddedSignupCompletedAt || conn.createdAt)}</span>
                      <span>•</span>
                      <span>Quality Rating: <strong className="text-emerald-600">{conn.qualityRating || 'GREEN'}</strong></span>
                      <span>•</span>
                      <span>Webhook: {conn.isSubscribed ? 'Subscribed ✓' : 'Pending'}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Technical Identifiers & Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:border-l lg:border-slate-100 lg:pl-6">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium w-16">WABA ID:</span>
                      <code className="bg-slate-100 px-2 py-0.5 rounded font-mono font-semibold text-slate-800">
                        {conn.wabaId}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium w-16">Phone ID:</span>
                      <code className="bg-slate-100 px-2 py-0.5 rounded font-mono font-semibold text-slate-800">
                        {conn.phoneNumberId}
                      </code>
                    </div>
                  </div>

                  <WhatsAppAccountActions
                    connectionId={conn.id}
                    displayPhone={conn.displayPhoneNumber}
                  />
                </div>
              </div>

              {/* Usage Metrics Strip */}
              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center sm:text-left">
                <div>
                  <p className="text-xs text-slate-400">Templates Created</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{conn._count.templates}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Campaigns Run</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{conn._count.campaigns}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Messages Dispatched</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{conn._count.messages}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
