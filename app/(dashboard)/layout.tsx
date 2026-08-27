import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardClientLayout } from '@/components/DashboardClientLayout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch user and organization details
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        where: { organizationId: session.organizationId },
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const activeConnectionCount = await prisma.whatsAppConnection.count({
    where: { organizationId: session.organizationId, status: 'ACTIVE' },
  });

  const currentOrg = user?.memberships[0]?.organization || {
    id: session.organizationId,
    name: 'My Organization',
  };

  const userData = {
    name: user?.name || session.name,
    email: user?.email || session.email,
    currentOrganization: {
      name: currentOrg.name,
      role: session.role || 'OWNER',
    },
  };

  return (
    <DashboardClientLayout
      user={userData}
      hasActiveConnection={activeConnectionCount > 0}
    >
      {children}
    </DashboardClientLayout>
  );
}
