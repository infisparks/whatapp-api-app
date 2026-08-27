import React from 'react';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SendMessageForm } from '@/components/whatsapp/SendMessageForm';

export const dynamic = 'force-dynamic';

export default async function SendMessagePage({
  searchParams,
}: {
  searchParams: { template?: string; recipient?: string };
}) {
  const session = await getAuthSession();
  const orgId = session?.organizationId || '';

  const [connections, templates, contacts] = await Promise.all([
    prisma.whatsAppConnection.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
      select: {
        id: true,
        displayPhoneNumber: true,
        verifiedName: true,
      },
    }),
    prisma.messageTemplate.findMany({
      where: { organizationId: orgId, status: 'APPROVED' },
      orderBy: { name: 'asc' },
    }),
    prisma.contact.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Send WhatsApp Message
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Dispatch an approved WhatsApp template or direct customer session message via Cloud API
        </p>
      </div>

      <SendMessageForm
        connections={connections}
        templates={templates}
        contacts={contacts}
        initialTemplateName={searchParams.template}
        initialRecipient={searchParams.recipient}
      />
    </div>
  );
}
