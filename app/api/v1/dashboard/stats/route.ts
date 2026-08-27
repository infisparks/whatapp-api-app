import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.organizationId;

    const [
      accountsCount,
      approvedTemplatesCount,
      pendingTemplatesCount,
      contactsCount,
      campaignsCount,
      messagesSentCount,
      messagesDeliveredCount,
      messagesReadCount,
      messagesFailedCount,
      recentMessages,
      connections,
    ] = await Promise.all([
      prisma.whatsAppConnection.count({
        where: { organizationId: orgId, status: 'ACTIVE' },
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
        take: 10,
        include: {
          contact: {
            select: { name: true, phone: true },
          },
        },
      }),
      prisma.whatsAppConnection.findMany({
        where: { organizationId: orgId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const deliveryRate = messagesSentCount > 0
      ? Math.round((messagesDeliveredCount / messagesSentCount) * 100)
      : 100;

    const readRate = messagesDeliveredCount > 0
      ? Math.round((messagesReadCount / messagesDeliveredCount) * 100)
      : 0;

    return NextResponse.json({
      stats: {
        accountsCount,
        approvedTemplatesCount,
        pendingTemplatesCount,
        contactsCount,
        campaignsCount,
        messagesSentCount,
        messagesDeliveredCount,
        messagesReadCount,
        messagesFailedCount,
        deliveryRate,
        readRate,
      },
      recentMessages,
      connections,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard statistics' }, { status: 500 });
  }
}
