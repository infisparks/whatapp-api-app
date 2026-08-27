import React from 'react';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CampaignWizard } from '@/components/whatsapp/CampaignWizard';

export const dynamic = 'force-dynamic';

export default async function CreateCampaignPage() {
  const session = await getAuthSession();
  const orgId = session?.organizationId || '';

  const [connections, templates, existingContacts] = await Promise.all([
    prisma.whatsAppConnection.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
    }),
    prisma.messageTemplate.findMany({
      where: { organizationId: orgId, status: 'APPROVED' },
    }),
    prisma.contact.findMany({
      where: { organizationId: orgId, optedIn: true },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Create WhatsApp Campaign
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Map template variables to CSV data columns and schedule bulk delivery
        </p>
      </div>

      <CampaignWizard
        connections={connections}
        templates={templates}
        existingContacts={existingContacts}
      />
    </div>
  );
}
