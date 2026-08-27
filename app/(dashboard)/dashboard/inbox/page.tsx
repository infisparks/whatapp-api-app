import React from 'react';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { InboxView } from '@/components/whatsapp/InboxView';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const session = await getAuthSession();
  const orgId = session?.organizationId || '';

  const [contacts, templates, connections] = await Promise.all([
    prisma.contact.findMany({
      where: {
        organizationId: orgId,
        messages: { some: {} },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.messageTemplate.findMany({
      where: { organizationId: orgId, status: 'APPROVED' },
    }),
    prisma.whatsAppConnection.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
    }),
  ]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Live WhatsApp Inbox
          </h2>
          <p className="text-xs text-slate-500">
            Real-time conversations with 24-hour customer service window tracking & Meta status ticks
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <InboxView
          initialContacts={contacts}
          templates={templates}
          connections={connections}
        />
      </div>
    </div>
  );
}
