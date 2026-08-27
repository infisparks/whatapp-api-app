import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/services/encryption';
import { sendTextMessage, sendTemplateMessage, isWithin24HourWindow } from '@/services/messaging';

export async function GET(req: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: params.contactId,
        organizationId: session.organizationId,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: {
        contactId: params.contactId,
        organizationId: session.organizationId,
      },
      orderBy: { sentAt: 'asc' },
    });

    // Find last inbound message to evaluate 24-hr window
    const lastInbound = [...messages]
      .reverse()
      .find((m) => m.direction === 'INBOUND');

    const windowStatus = isWithin24HourWindow(lastInbound?.sentAt);

    return NextResponse.json({
      contact,
      messages,
      window: {
        isOpen: windowStatus.isOpen,
        remainingMinutes: windowStatus.remainingMinutes,
        expiresAt: windowStatus.expiresAt,
        lastInboundAt: lastInbound?.sentAt || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch conversation' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: params.contactId,
        organizationId: session.organizationId,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await req.json();
    const { text, type = 'TEXT', templateName, templateLanguage = 'en_US', variables = {} } = body;

    // Find active connection
    const connection = await prisma.whatsAppConnection.findFirst({
      where: { organizationId: session.organizationId, status: 'ACTIVE' },
    });

    if (!connection) {
      return NextResponse.json({ error: 'No active WhatsApp connection available' }, { status: 400 });
    }

    const accessToken = decryptToken(connection.encryptedAccessToken);

    let sendResult;
    let messageBody = text;

    if (type === 'TEMPLATE') {
      if (!templateName) {
        return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
      }

      sendResult = await sendTemplateMessage(
        connection.phoneNumberId,
        accessToken,
        contact.phone,
        templateName,
        templateLanguage,
        variables
      );
      messageBody = `Template: ${templateName}`;
    } else {
      // Free-form text check
      const lastInbound = await prisma.message.findFirst({
        where: {
          contactId: contact.id,
          organizationId: session.organizationId,
          direction: 'INBOUND',
        },
        orderBy: { sentAt: 'desc' },
      });

      const windowStatus = isWithin24HourWindow(lastInbound?.sentAt);
      if (!windowStatus.isOpen) {
        return NextResponse.json(
          {
            error:
              '24-Hour customer service window has expired. Meta requires sending an approved Template message.',
            requiresTemplate: true,
          },
          { status: 403 }
        );
      }

      if (!text || text.trim().length === 0) {
        return NextResponse.json({ error: 'Message text cannot be empty' }, { status: 400 });
      }

      sendResult = await sendTextMessage(
        connection.phoneNumberId,
        accessToken,
        contact.phone,
        text
      );
    }

    const metaMessageId = sendResult.messages?.[0]?.id;

    // Save outbound message
    const message = await prisma.message.create({
      data: {
        organizationId: session.organizationId,
        whatsappConnectionId: connection.id,
        contactId: contact.id,
        metaMessageId,
        direction: 'OUTBOUND',
        type,
        body: messageBody,
        payloadJson: JSON.stringify(sendResult),
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error: any) {
    console.error('Inbox reply error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send reply' }, { status: 500 });
  }
}
