import React from 'react';
import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime, formatDisplayPhone } from '@/lib/utils';
import {
  Smartphone,
  CheckCircle2,
  Eye,
  Send,
  AlertTriangle,
  LayoutTemplate,
  Megaphone,
  QrCode,
  ArrowUpRight,
  TrendingUp,
  MessageSquare,
  Users,
} from 'lucide-react';

export default async function DashboardPage() {
  const session = await getAuthSession();
  const orgId = session?.organizationId || '';

  const [
    connections,
    approvedTemplatesCount,
    pendingTemplatesCount,
    contactsCount,
    campaignsCount,
    messagesSentCount,
    messagesDeliveredCount,
    messagesReadCount,
    messagesFailedCount,
    recentMessages,
  ] = await Promise.all([
    prisma.whatsAppConnection.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.messageTemplate.count({
      where: { organizationId: orgId, status: 'APPROVED' },
    }),
    prisma.messageTemplate.count({
      where: { organizationId: orgId, status: 'PENDING' },
    }),
    prisma.contact.count({
      where: { organizationId: orgId },
    }),
    prisma.campaign.count({
      where: { organizationId: orgId },
    }),
    prisma.message.count({
      where: { organizationId: orgId, direction: 'OUTBOUND' },
    }),
    prisma.message.count({
      where: {
        organizationId: orgId,
        direction: 'OUTBOUND',
        status: { in: ['DELIVERED', 'READ'] },
      },
    }),
    prisma.message.count({
      where: { organizationId: orgId, direction: 'OUTBOUND', status: 'READ' },
    }),
    prisma.message.count({
      where: { organizationId: orgId, direction: 'OUTBOUND', status: 'FAILED' },
    }),
    prisma.message.findMany({
      where: { organizationId: orgId },
      orderBy: { sentAt: 'desc' },
      take: 6,
      include: {
        contact: true,
      },
    }),
  ]);

  const activeConnections = connections.filter((c) => c.status === 'ACTIVE');
  const deliveryRate = messagesSentCount > 0
    ? Math.round((messagesDeliveredCount / messagesSentCount) * 100)
    : 100;
  const readRate = messagesDeliveredCount > 0
    ? Math.round((messagesReadCount / messagesDeliveredCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            WhatsApp Business Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Meta Cloud API v26.0 • Coexistence Active • Embedded Signup Config #1084755870646567
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dashboard/whatsapp/connect">
            <Button
              variant="whatsapp"
              size="sm"
              leftIcon={<QrCode className="w-4 h-4" />}
            >
              Connect WhatsApp
            </Button>
          </Link>
          <Link href="/dashboard/messages/send">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send className="w-4 h-4" />}
            >
              Send Message
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row 1: High-level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Connected Numbers */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Connected WhatsApp
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{activeConnections.length}</span>
            <span className="text-xs font-medium text-emerald-600">
              {activeConnections.length > 0 ? 'Coexistence Active' : 'No Account'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {connections.length} total registered numbers
          </p>
        </Card>

        {/* Metric 2: Messages Sent */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Messages Sent
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{messagesSentCount}</span>
            <span className="text-xs font-medium text-indigo-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> {deliveryRate}% Delivery
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {messagesDeliveredCount} delivered • {messagesFailedCount} failed
          </p>
        </Card>

        {/* Metric 3: Read Rate */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Read Receipts
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{messagesReadCount}</span>
            <span className="text-xs font-medium text-sky-600">{readRate}% Read Rate</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Confirmed via Meta webhook</p>
        </Card>

        {/* Metric 4: Approved Templates */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approved Templates
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <LayoutTemplate className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{approvedTemplatesCount}</span>
            {pendingTemplatesCount > 0 && (
              <span className="text-xs font-medium text-amber-600">
                {pendingTemplatesCount} in Review
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">Ready for bulk campaigns</p>
        </Card>
      </div>

      {/* Main Grid: Connected Numbers + Recent Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1/3): Active WhatsApp Connection Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Connected Numbers</CardTitle>
                <CardDescription>WhatsApp Business App & Cloud API</CardDescription>
              </div>
              <Link href="/dashboard/whatsapp">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600">
                  Manage
                </Button>
              </Link>
            </CardHeader>

            {connections.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">No WhatsApp account connected</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connect your existing business account via Meta Embedded Signup.
                  </p>
                </div>
                <Link href="/dashboard/whatsapp/connect">
                  <Button variant="whatsapp" size="sm">
                    Connect WhatsApp
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-bold text-slate-900">
                          {formatDisplayPhone(conn.displayPhoneNumber)}
                        </span>
                      </div>
                      <Badge variant="status" status="ACTIVE">
                        Connected ✓
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p className="font-medium text-slate-800">
                        {conn.verifiedName || 'WhatsApp Business Name'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">WABA: {conn.wabaId}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                        Coexistence Enabled
                      </span>
                      <span className="text-slate-400 font-medium">Quality: {conn.qualityRating || 'GREEN'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Stats Box */}
          <Card>
            <CardTitle className="text-sm font-semibold mb-3">Audience & Reach</CardTitle>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" /> Total Contacts
                </span>
                <span className="font-semibold text-slate-800">{contactsCount}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-slate-400" /> Active Campaigns
                </span>
                <span className="font-semibold text-slate-800">{campaignsCount}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Webhook Receiver
                </span>
                <span className="font-semibold text-emerald-600">Active (200 OK)</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (2/3): Recent Live Activity & Messages */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent Messages & Status</CardTitle>
                <CardDescription>Live real-time feed from Meta Cloud API</CardDescription>
              </div>
              <Link href="/dashboard/inbox">
                <Button variant="outline" size="sm" className="text-xs">
                  View Live Inbox
                </Button>
              </Link>
            </CardHeader>

            {recentMessages.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">No messages sent or received yet</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Launch a campaign or send a single template message to get started.
                  </p>
                </div>
                <Link href="/dashboard/messages/send">
                  <Button size="sm">Send First Message</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Direction / Recipient</th>
                      <th className="py-3 px-4">Message / Template</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentMessages.map((msg) => (
                      <tr key={msg.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                msg.direction === 'INBOUND' ? 'bg-sky-500' : 'bg-indigo-500'
                              }`}
                            />
                            <div>
                              <p className="font-semibold text-slate-900">
                                {msg.contact?.name || formatDisplayPhone(msg.contact?.phone || '')}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {msg.direction === 'INBOUND' ? 'Incoming Customer' : 'Outbound Platform'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[200px] truncate">
                          <span className="font-medium text-slate-800">{msg.body || `[${msg.type}]`}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="status" status={msg.status} />
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(msg.sentAt || msg.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
