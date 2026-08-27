import React from 'react';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ContactsClient } from '@/components/whatsapp/ContactsClient';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const session = await getAuthSession();
  const orgId = session?.organizationId || '';

  const contacts = await prisma.contact.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Contacts & Audience
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your customer directory, import CSV audiences, and track WhatsApp opt-in compliance
        </p>
      </div>

      <ContactsClient initialContacts={contacts} />
    </div>
  );
}
