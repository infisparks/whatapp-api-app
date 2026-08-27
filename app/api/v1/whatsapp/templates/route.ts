import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/services/encryption';
import { submitTemplateToMeta, buildMetaTemplatePayload } from '@/services/templates';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = { organizationId: session.organizationId };

    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.name = { contains: search.toLowerCase() };
    }

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        whatsappConnection: {
          select: {
            displayPhoneNumber: true,
            verifiedName: true,
          },
        },
      },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
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
      whatsappConnectionId,
      name,
      category,
      language = 'en_US',
      headerType = 'NONE',
      headerText,
      bodyText,
      footerText,
      buttons = [],
    } = body;

    if (!name || !category || !bodyText) {
      return NextResponse.json({ error: 'Template name, category, and body text are required' }, { status: 400 });
    }

    const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

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
      return NextResponse.json(
        { error: 'No active WhatsApp Business Account found. Please connect an account first.' },
        { status: 400 }
      );
    }

    const accessToken = decryptToken(connection.encryptedAccessToken);

    // Build payload structure
    const metaPayload = buildMetaTemplatePayload({
      name: cleanName,
      category,
      language,
      headerType,
      headerText,
      bodyText,
      footerText,
      buttons,
    });

    // Submit to Meta Graph API
    let metaResult;
    try {
      metaResult = await submitTemplateToMeta(connection.wabaId, accessToken, {
        name: cleanName,
        category,
        language,
        headerType,
        headerText,
        bodyText,
        footerText,
        buttons,
      });
    } catch (metaErr: any) {
      console.error('[Template Submit Error]', metaErr);
      return NextResponse.json(
        { error: `Meta template creation error: ${metaErr.message || 'Validation failed'}` },
        { status: 400 }
      );
    }

    // Save Template in Database
    const initialStatus = (metaResult.status?.toUpperCase() || 'PENDING') as any;

    const template = await prisma.messageTemplate.upsert({
      where: {
        organizationId_name_language: {
          organizationId: session.organizationId,
          name: cleanName,
          language,
        },
      },
      update: {
        whatsappConnectionId: connection.id,
        metaTemplateId: metaResult.id,
        category,
        headerType,
        headerContent: headerText || null,
        body: bodyText,
        footer: footerText || null,
        buttonsJson: JSON.stringify(buttons),
        componentsJson: JSON.stringify(metaPayload.components),
        status: initialStatus,
        updatedAt: new Date(),
      },
      create: {
        organizationId: session.organizationId,
        whatsappConnectionId: connection.id,
        metaTemplateId: metaResult.id,
        name: cleanName,
        category,
        language,
        headerType,
        headerContent: headerText || null,
        body: bodyText,
        footer: footerText || null,
        buttonsJson: JSON.stringify(buttons),
        componentsJson: JSON.stringify(metaPayload.components),
        status: initialStatus,
      },
    });

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId,
          action: 'TEMPLATE_CREATED',
          resourceType: 'MessageTemplate',
          resourceId: template.id,
          metadataJson: JSON.stringify({ name: cleanName, metaTemplateId: metaResult.id }),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Template submitted to Meta for review',
      template,
    });
  } catch (error: any) {
    console.error('Create template API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}
