import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await prisma.whatsAppConnection.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
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
        _count: {
          select: {
            templates: true,
            campaigns: true,
            messages: true,
          },
        },
      },
    });

    return NextResponse.json({ connections });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch WhatsApp accounts' }, { status: 500 });
  }
}
