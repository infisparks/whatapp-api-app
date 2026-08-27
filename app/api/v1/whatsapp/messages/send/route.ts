import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/services/encryption';
import { sendTemplateMessage, sendTextMessage, isWithin24HourWindow, normalizePhoneNumber } from '@/services/messaging';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      whatsappConnectionId,
      recipientPhone,
      messageType = 'TEMPLATE', // TEMPLATE or TEXT
      templateName,
      templateLanguage = 'en_US',
      variables = {}, // { body: ['John', '123'], header: [] }
      textBody,
    } = body;

    if (!recipientPhone) {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
    }

    const cleanPhone = normalizePhoneNumber(recipientPhone);
    if (cleanPhone.length < 8) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Find WhatsApp connection
    let connection = null;
    if (whatsappConnectionId) {
      connection = await prisma.whatsAppConnection.findFirst({
        where: { id: whatsappConnectionId, organizationId: session.organizationId },
      });
    } else {
      connection = await prisma.whatsAppConnection.findFirst({
        where: { organizationId: session.organizationId, status: 'ACTIVE' },
      });
    }

    if (!connection) {
      return NextResponse.json({ error: 'No active WhatsApp connection found' }, { status: 400 });
    }

    const accessToken = decryptToken(connection.encryptedAccessToken);

    // Find or create contact
    const contact = await prisma.contact.upsert({
      where: {
        organizationId_phone: {
          organizationId: session.organizationId,
          phone: cleanPhone,
        },
      },
      update: {},
      create: {
        organizationId: session.organizationId,
        phone: cleanPhone,
        optedIn: true,
      },
    });

    let sendResult;
    let finalBody = textBody;

    if (messageType === 'TEMPLATE') {
      if (!templateName) {
        return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
      }

      // Check template details from DB
      const template = await prisma.messageTemplate.findFirst({
        where: {
          organizationId: session.organizationId,
          name: templateName,
        },
      });

      sendResult = await sendTemplateMessage(
        connection.phoneNumberId,
        accessToken,
        cleanPhone,
        templateName,
        templateLanguage,
        variables,
        template?.headerType || 'NONE'
      );

      finalBody = `Template: ${templateName}`;
    } else {
      // Free-form text message - Verify 24-hr customer service window
      const lastInbound = await prisma.message.findFirst({
        where: {
          organizationId: session.organizationId,
          contactId: contact.id,
          direction: 'INBOUND',
        },
        orderBy: { sentAt: 'desc' },
      });

      const windowStatus = isWithin24HourWindow(lastInbound?.sentAt);
      if (!windowStatus.isOpen) {
        return NextResponse.json(
          {
            error:
              'The 24-hour customer service window has expired for this contact. Meta requires sending an approved WhatsApp Template message to initiate or resume communication.',
            requiresTemplate: true,
          },
          { status: 403 }
        );
      }

      if (!textBody || textBody.trim().length === 0) {
        return NextResponse.json({ error: 'Message text cannot be empty' }, { status: 400 });
      }

      sendResult = await sendTextMessage(
        connection.phoneNumberId,
        accessToken,
        cleanPhone,
        textBody
      );
    }

    const metaMessageId = sendResult.messages?.[0]?.id;

    // Save outbound message to database
    const message = await prisma.message.create({
      data: {
        organizationId: session.organizationId,
        whatsappConnectionId: connection.id,
        contactId: contact.id,
        metaMessageId,
        direction: 'OUTBOUND',
        type: messageType,
        body: finalBody,
        payloadJson: JSON.stringify(sendResult),
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Message dispatched successfully',
      metaMessageId,
      messageRecord: message,
    });
  } catch (error: any) {
    console.error('[Send Message Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}
