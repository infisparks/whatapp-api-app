import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
      select: {
        id: true,
        wabaId: true,
        phoneNumberId: true,
        displayPhoneNumber: true,
        verifiedName: true,
        qualityRating: true,
        codeVerificationStatus: true,
        status: true,
        coexistenceStatus: true,
        isSubscribed: true,
        embeddedSignupCompletedAt: true,
        createdAt: true,
        templates: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'WhatsApp connection not found' }, { status: 404 });
    }

    return NextResponse.json({ connection });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch account' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    await prisma.whatsAppConnection.delete({
      where: { id: params.id },
    });

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId,
          action: 'WHATSAPP_DISCONNECTED',
          resourceType: 'WhatsAppConnection',
          resourceId: params.id,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, message: 'WhatsApp connection disconnected' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to disconnect account' }, { status: 500 });
  }
}
