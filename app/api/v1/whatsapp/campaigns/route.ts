import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/services/messaging';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: {
            name: true,
            language: true,
            category: true,
          },
        },
        whatsappConnection: {
          select: {
            displayPhoneNumber: true,
            verifiedName: true,
          },
        },
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      whatsappConnectionId,
      templateId,
      recipients = [], // array of { phone: string, variables: string[], contactId?: string }
      variableMapping,
      scheduledAt,
    } = body;

    if (!name || !templateId || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Campaign name, template, and recipients are required' },
        { status: 400 }
      );
    }

    // Verify WhatsApp Connection
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
      return NextResponse.json({ error: 'No active WhatsApp account found' }, { status: 400 });
    }

    // Verify Template
    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId, organizationId: session.organizationId },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Filter valid recipients
    const validRecipients: Array<{
      phone: string;
      variablesJson: string;
      contactId?: string;
    }> = [];

    const seenPhones = new Set<string>();

    for (const r of recipients) {
      const cleanPhone = normalizePhoneNumber(r.phone);
      if (cleanPhone.length >= 8 && !seenPhones.has(cleanPhone)) {
        seenPhones.add(cleanPhone);
        validRecipients.push({
          phone: cleanPhone,
          variablesJson: JSON.stringify(r.variables || []),
          contactId: r.contactId || undefined,
        });
      }
    }

    if (validRecipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipient phone numbers provided' }, { status: 400 });
    }

    // Create Campaign and Recipients in database
    const campaign = await prisma.campaign.create({
      data: {
        organizationId: session.organizationId,
        whatsappConnectionId: connection.id,
        templateId: template.id,
        name,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        totalRecipients: validRecipients.length,
        variableMappingJson: variableMapping ? JSON.stringify(variableMapping) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        recipients: {
          create: validRecipients.map((vr) => ({
            phone: vr.phone,
            variablesJson: vr.variablesJson,
            contactId: vr.contactId,
            status: 'QUEUED',
          })),
        },
      },
      include: {
        template: true,
        whatsappConnection: true,
      },
    });

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId,
          action: 'CAMPAIGN_CREATED',
          resourceType: 'Campaign',
          resourceId: campaign.id,
          metadataJson: JSON.stringify({ name, totalRecipients: validRecipients.length }),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      campaign,
      message: `Campaign '${name}' created with ${validRecipients.length} recipients.`,
    });
  } catch (error: any) {
    console.error('Create campaign error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create campaign' }, { status: 500 });
  }
}
