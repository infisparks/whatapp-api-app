import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isWithin24HourWindow } from '@/services/messaging';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch contacts with their latest messages
    const contacts = await prisma.contact.findMany({
      where: {
        organizationId: session.organizationId,
        messages: { some: {} },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const conversations = contacts.map((contact) => {
      const lastMessage = contact.messages[0] || null;
      const windowStatus = isWithin24HourWindow(
        lastMessage?.direction === 'INBOUND' ? lastMessage.sentAt : null
      );

      return {
        contactId: contact.id,
        phone: contact.phone,
        name: contact.name || contact.phone,
        email: contact.email,
        optedIn: contact.optedIn,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              body: lastMessage.body,
              direction: lastMessage.direction,
              status: lastMessage.status,
              type: lastMessage.type,
              createdAt: lastMessage.createdAt,
            }
          : null,
        is24HourWindowOpen: windowStatus.isOpen,
        windowRemainingMinutes: windowStatus.remainingMinutes,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch inbox conversations' }, { status: 500 });
  }
}
