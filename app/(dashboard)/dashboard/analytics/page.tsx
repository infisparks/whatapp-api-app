import React from 'react';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Send,
  MessageSquare,
  Users,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const session = await getAuthSession();
  const orgId = session?.organizationId || '';

  const [
    totalOutbound,
    totalInbound,
    deliveredCount,
    readCount,
    failedCount,
    templates,
    recentFailures,
  ] = await Promise.all([
    prisma.message.count({ where: { organizationId: orgId, direction: 'OUTBOUND' } }),
    prisma.message.count({ where: { organizationId: orgId, direction: 'INBOUND' } }),
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
    prisma.messageTemplate.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { campaigns: true } },
      },
    }),
    prisma.message.findMany({
      where: { organizationId: orgId, status: 'FAILED' },
      take: 5,
      orderBy: { failedAt: 'desc' },
    }),
  ]);

  const deliveryRate = totalOutbound > 0 ? Math.round((deliveredCount / totalOutbound) * 100) : 100;
  const readRate = deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) : 0;
  const failureRate = totalOutbound > 0 ? Math.round((failedCount / totalOutbound) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Messaging Analytics & Performance
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Detailed metrics for message delivery rates, read receipts, and Meta Cloud API performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Delivery Success Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3">{deliveryRate}%</p>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div style={{ width: `${deliveryRate}%` }} className="bg-emerald-500 h-full" />
          </div>
          <p className="text-xs text-slate-400 mt-2">{deliveredCount} of {totalOutbound} messages delivered</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Read Receipt Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3">{readRate}%</p>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div style={{ width: `${readRate}%` }} className="bg-sky-500 h-full" />
          </div>
          <p className="text-xs text-slate-400 mt-2">{readCount} read receipts confirmed via webhook</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Failure Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3">{failureRate}%</p>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div style={{ width: `${failureRate}%` }} className="bg-rose-500 h-full" />
          </div>
          <p className="text-xs text-slate-400 mt-2">{failedCount} failed transmissions</p>
        </Card>
      </div>

      {/* Volume Breakdown & Template Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Traffic & Direction Breakdown
          </CardTitle>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className="text-slate-600">Outbound Messages (Broadcast / Templates)</span>
                <span className="font-bold text-slate-900">{totalOutbound}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  style={{
                    width: `${
                      totalOutbound + totalInbound > 0
                        ? (totalOutbound / (totalOutbound + totalInbound)) * 100
                        : 50
                    }%`,
                  }}
                  className="bg-indigo-600 h-full"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className="text-slate-600">Inbound Messages (Customer Inquiries)</span>
                <span className="font-bold text-slate-900">{totalInbound}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  style={{
                    width: `${
                      totalOutbound + totalInbound > 0
                        ? (totalInbound / (totalOutbound + totalInbound)) * 100
                        : 50
                    }%`,
                  }}
                  className="bg-emerald-500 h-full"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Template Directory Performance */}
        <Card className="p-6 space-y-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Template Quality & Adoption
          </CardTitle>

          <div className="space-y-2 text-xs">
            {templates.length === 0 ? (
              <p className="text-slate-400 italic">No templates created yet</p>
            ) : (
              templates.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{t.category} • {t.language}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="status" status={t.status} />
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Quality: {t.qualityRating || 'GREEN'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
