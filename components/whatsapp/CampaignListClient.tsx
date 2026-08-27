'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import {
  Megaphone,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Send,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface CampaignListClientProps {
  initialCampaigns: any[];
}

export function CampaignListClient({ initialCampaigns }: CampaignListClientProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const handleDispatch = async (campaignId: string) => {
    setDispatchingId(campaignId);
    try {
      const res = await fetch(`/api/v1/whatsapp/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to dispatch campaign');
      } else {
        router.refresh();
      }
    } catch {
      alert('Error during campaign dispatch');
    } finally {
      setDispatchingId(null);
    }
  };

  if (campaigns.length === 0) {
    return (
      <Card className="py-16 text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No campaigns launched yet</h3>
            <p className="text-xs text-slate-500 mt-1">
              Create a targeted WhatsApp broadcast campaign using approved templates and CSV variable mapping.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/dashboard/campaigns/create">
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Create First Campaign
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((camp) => {
        const percentSent = camp.totalRecipients > 0
          ? Math.round(((camp.sentCount + camp.failedCount) / camp.totalRecipients) * 100)
          : 0;

        return (
          <Card key={camp.id} className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-900">{camp.name}</h3>
                  <Badge variant="status" status={camp.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>Template: <strong className="text-slate-700">{camp.template.name}</strong> ({camp.template.language})</span>
                  <span>•</span>
                  <span>Sender: <strong className="text-slate-700">{camp.whatsappConnection.displayPhoneNumber}</strong></span>
                  <span>•</span>
                  <span>Created: {formatDate(camp.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {['DRAFT', 'RUNNING', 'PARTIALLY_FAILED'].includes(camp.status) && (
                  <Button
                    size="sm"
                    variant="whatsapp"
                    onClick={() => handleDispatch(camp.id)}
                    isLoading={dispatchingId === camp.id}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    {camp.status === 'RUNNING' ? 'Dispatch Next Batch' : 'Start Sending'}
                  </Button>
                )}
              </div>
            </div>

            {/* Live Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Progress ({percentSent}%)</span>
                <span>
                  {camp.sentCount + camp.failedCount} / {camp.totalRecipients} processed
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  style={{ width: `${(camp.deliveredCount / (camp.totalRecipients || 1)) * 100}%` }}
                  className="bg-emerald-500 transition-all"
                  title="Delivered"
                />
                <div
                  style={{ width: `${((camp.sentCount - camp.deliveredCount) / (camp.totalRecipients || 1)) * 100}%` }}
                  className="bg-amber-400 transition-all"
                  title="Sent"
                />
                <div
                  style={{ width: `${(camp.failedCount / (camp.totalRecipients || 1)) * 100}%` }}
                  className="bg-rose-500 transition-all"
                  title="Failed"
                />
              </div>
            </div>

            {/* Metrics Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400">Total Recipients</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{camp.totalRecipients}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100">
                <span className="text-indigo-600">Dispatched</span>
                <p className="text-sm font-bold text-indigo-900 mt-0.5">{camp.sentCount}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <span className="text-emerald-600">Delivered</span>
                <p className="text-sm font-bold text-emerald-900 mt-0.5">{camp.deliveredCount}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-100">
                <span className="text-sky-600">Read Receipts</span>
                <p className="text-sm font-bold text-sky-900 mt-0.5">{camp.readCount}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-100">
                <span className="text-rose-600">Failed</span>
                <p className="text-sm font-bold text-rose-900 mt-0.5">{camp.failedCount}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
