import React from 'react';
import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import {
  LayoutTemplate,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { TemplatesListClient } from '@/components/whatsapp/TemplatesListClient';

export default async function TemplatesPage() {
  const session = await getAuthSession();
  const orgId = session?.organizationId || '';

  const templates = await prisma.messageTemplate.findMany({
    where: { organizationId: orgId },
    orderBy: { updatedAt: 'desc' },
    include: {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            WhatsApp Message Templates
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create, submit to Meta for approval, and track template status in real-time
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/templates/create">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Templates List Client Component */}
      <TemplatesListClient initialTemplates={templates} />
    </div>
  );
}
