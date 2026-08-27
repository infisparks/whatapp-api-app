import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/services/encryption';
import { fetchTemplatesFromMeta } from '@/services/templates';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await prisma.whatsAppConnection.findMany({
      where: { organizationId: session.organizationId, status: 'ACTIVE' },
    });

    if (connections.length === 0) {
      return NextResponse.json({ error: 'No active WhatsApp account found to sync templates' }, { status: 400 });
    }

    let syncedCount = 0;

    for (const connection of connections) {
      try {
        const accessToken = decryptToken(connection.encryptedAccessToken);
        const metaTemplates = await fetchTemplatesFromMeta(connection.wabaId, accessToken);

        if (metaTemplates.data && Array.isArray(metaTemplates.data)) {
          for (const item of metaTemplates.data) {
            const templateStatus = (item.status?.toUpperCase() || 'PENDING') as any;

            // Extract body text from components
            let bodyText = '';
            let headerType = 'NONE';
            let headerText = '';
            let footerText = '';
            let buttons: any[] = [];

            if (item.components && Array.isArray(item.components)) {
              for (const comp of item.components) {
                if (comp.type === 'BODY') bodyText = comp.text || '';
                if (comp.type === 'HEADER') {
                  headerType = comp.format || 'TEXT';
                  headerText = comp.text || '';
                }
                if (comp.type === 'FOOTER') footerText = comp.text || '';
                if (comp.type === 'BUTTONS' && Array.isArray(comp.buttons)) {
                  buttons = comp.buttons.map((b: any) => ({
                    type: b.type,
                    text: b.text,
                    url: b.url,
                    phone_number: b.phone_number,
                  }));
                }
              }
            }

            await prisma.messageTemplate.upsert({
              where: {
                organizationId_name_language: {
                  organizationId: session.organizationId,
                  name: item.name,
                  language: item.language || 'en_US',
                },
              },
              update: {
                whatsappConnectionId: connection.id,
                metaTemplateId: String(item.id),
                category: item.category || 'MARKETING',
                headerType,
                headerContent: headerText || null,
                body: bodyText || 'Template Body',
                footer: footerText || null,
                buttonsJson: buttons.length > 0 ? JSON.stringify(buttons) : null,
                componentsJson: JSON.stringify(item.components || []),
                status: templateStatus,
                rejectionReason: item.rejected_reason || null,
                qualityRating: item.quality_score?.score || 'UNKNOWN',
                updatedAt: new Date(),
              },
              create: {
                organizationId: session.organizationId,
                whatsappConnectionId: connection.id,
                metaTemplateId: String(item.id),
                name: item.name,
                category: item.category || 'MARKETING',
                language: item.language || 'en_US',
                headerType,
                headerContent: headerText || null,
                body: bodyText || 'Template Body',
                footer: footerText || null,
                buttonsJson: buttons.length > 0 ? JSON.stringify(buttons) : null,
                componentsJson: JSON.stringify(item.components || []),
                status: templateStatus,
                rejectionReason: item.rejected_reason || null,
                qualityRating: item.quality_score?.score || 'UNKNOWN',
              },
            });

            syncedCount++;
          }
        }
      } catch (connErr: any) {
        console.warn(`[Template Sync] Failed for WABA ${connection.wabaId}:`, connErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronized ${syncedCount} templates from Meta`,
      syncedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
