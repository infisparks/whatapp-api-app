import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/services/encryption';
import { deleteTemplateFromMeta } from '@/services/templates';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await prisma.messageTemplate.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
      include: {
        whatsappConnection: true,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Try deleting from Meta if connection exists
    if (template.whatsappConnection) {
      try {
        const accessToken = decryptToken(template.whatsappConnection.encryptedAccessToken);
        await deleteTemplateFromMeta(
          template.whatsappConnection.wabaId,
          accessToken,
          template.name,
          template.metaTemplateId || undefined
        );
      } catch (err: any) {
        console.warn('[Template Delete] Error deleting from Meta:', err.message);
      }
    }

    await prisma.messageTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete template' }, { status: 500 });
  }
}
