import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/services/encryption';
import { getPhoneNumberDetails, subscribeAppToWaba } from '@/services/whatsapp';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    const accessToken = decryptToken(connection.encryptedAccessToken);

    let phoneDetails;
    try {
      phoneDetails = await getPhoneNumberDetails(connection.phoneNumberId, accessToken);
    } catch (e: any) {
      return NextResponse.json({ error: `Failed to fetch details from Meta: ${e.message}` }, { status: 400 });
    }

    let isSubscribed = connection.isSubscribed;
    try {
      const subResult = await subscribeAppToWaba(connection.wabaId, accessToken);
      isSubscribed = subResult.success ?? true;
    } catch {
      // ignore
    }

    const updated = await prisma.whatsAppConnection.update({
      where: { id: params.id },
      data: {
        displayPhoneNumber: phoneDetails.display_phone_number || connection.displayPhoneNumber,
        verifiedName: phoneDetails.verified_name || connection.verifiedName,
        qualityRating: phoneDetails.quality_rating || connection.qualityRating,
        codeVerificationStatus: phoneDetails.code_verification_status || connection.codeVerificationStatus,
        isSubscribed,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      connection: {
        id: updated.id,
        displayPhoneNumber: updated.displayPhoneNumber,
        verifiedName: updated.verifiedName,
        qualityRating: updated.qualityRating,
        status: updated.status,
        isSubscribed: updated.isSubscribed,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
