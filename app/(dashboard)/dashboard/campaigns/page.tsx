import React from 'react';
import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
} from 'lucide-react';
import { CampaignListClient } from '@/components/whatsapp/CampaignListClient';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const session = await getAuthSession();
  const orgId = session?.organizationId || '';

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    include: {
      template: {
        select: {
          name: true,
          language: true,
          category: true,
        },
      },
      whatsappConnection: {
        select: {
          displayPhoneNumber: true,
          verifiedName: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Broadcast Campaigns
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Send high-volume WhatsApp template broadcasts with CSV contact mapping and queue-based pacing
          </p>
        </div>

        <Link href="/dashboard/campaigns/create">
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            New Campaign
          </Button>
        </Link>
      </div>

      <CampaignListClient initialCampaigns={campaigns} />
    </div>
  );
}
