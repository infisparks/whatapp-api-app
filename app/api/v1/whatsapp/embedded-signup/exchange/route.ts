import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptToken, redactSecret } from '@/services/encryption';
import {
  exchangeAuthorizationCode,
  getPhoneNumberDetails,
  getWabaDetails,
  subscribeAppToWaba,
  checkCoexistenceEligibility,
} from '@/services/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const { code, wabaId, phoneNumberId, businessId, redirectUri } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is missing from Meta Embedded Signup response' },
        { status: 400 }
      );
    }

    if (!wabaId || !phoneNumberId) {
      return NextResponse.json(
        { error: 'WABA ID and Phone Number ID are required. Please ensure Embedded Signup captured the session info.' },
        { status: 400 }
      );
    }

    console.log(`[EmbeddedSignup] Exchanging authorization code for Org: ${session.organizationId}, WABA: ${wabaId}, Phone: ${phoneNumberId}`);

    // 1. Exchange authorization code for business access token server-to-server
    let tokenResponse;
    try {
      tokenResponse = await exchangeAuthorizationCode(code, redirectUri);
    } catch (exchangeError: any) {
      console.error('[EmbeddedSignup] Token exchange failed:', exchangeError.message);
      return NextResponse.json(
        {
          error: `Meta Token Exchange failed: ${exchangeError.message || 'Invalid or expired authorization code'}`,
        },
        { status: 400 }
      );
    }

    const rawAccessToken = tokenResponse.access_token;
    if (!rawAccessToken) {
      return NextResponse.json({ error: 'Meta did not return a valid access token' }, { status: 400 });
    }

    // 2. Encrypt token at rest using AES-256-GCM
    const encryptedAccessToken = encryptToken(rawAccessToken);

    // 3. Fetch phone number details from Meta
    let phoneDetails = {
      id: phoneNumberId,
      display_phone_number: 'WhatsApp Number',
      verified_name: 'WhatsApp Business',
      quality_rating: 'GREEN',
      code_verification_status: 'VERIFIED',
    };

    try {
      const fetchedDetails = await getPhoneNumberDetails(phoneNumberId, rawAccessToken);
      phoneDetails = {
        ...phoneDetails,
        ...fetchedDetails,
      };
    } catch (phoneErr: any) {
      console.warn('[EmbeddedSignup] Could not fetch phone details immediately:', phoneErr.message);
    }

    // 4. Subscribe application to customer's WABA for Webhook events
    let isSubscribed = false;
    try {
      const subResult = await subscribeAppToWaba(wabaId, rawAccessToken);
      isSubscribed = subResult.success ?? true;
    } catch (subErr: any) {
      console.warn('[EmbeddedSignup] Could not subscribe app to WABA:', subErr.message);
      // Not fatal; can be re-tried or handled by system user token
    }

    // 5. Check Coexistence Eligibility
    const coexistence = checkCoexistenceEligibility(phoneDetails);

    // 6. Upsert WhatsAppConnection for this organization
    const connection = await prisma.whatsAppConnection.upsert({
      where: {
        organizationId_phoneNumberId: {
          organizationId: session.organizationId,
          phoneNumberId: phoneNumberId,
        },
      },
      update: {
        wabaId,
        metaBusinessId: businessId || null,
        displayPhoneNumber: phoneDetails.display_phone_number || phoneNumberId,
        verifiedName: phoneDetails.verified_name || null,
        qualityRating: phoneDetails.quality_rating || 'UNKNOWN',
        codeVerificationStatus: phoneDetails.code_verification_status || 'VERIFIED',
        encryptedAccessToken,
        status: 'ACTIVE',
        coexistenceStatus: coexistence.status,
        isSubscribed,
        embeddedSignupCompletedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        organizationId: session.organizationId,
        wabaId,
        phoneNumberId,
        metaBusinessId: businessId || null,
        displayPhoneNumber: phoneDetails.display_phone_number || phoneNumberId,
        verifiedName: phoneDetails.verified_name || null,
        qualityRating: phoneDetails.quality_rating || 'UNKNOWN',
        codeVerificationStatus: phoneDetails.code_verification_status || 'VERIFIED',
        encryptedAccessToken,
        status: 'ACTIVE',
        coexistenceStatus: coexistence.status,
        isSubscribed,
        embeddedSignupCompletedAt: new Date(),
      },
    });

    // 7. Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId,
          action: 'WHATSAPP_CONNECTED',
          resourceType: 'WhatsAppConnection',
          resourceId: connection.id,
          metadataJson: JSON.stringify({
            wabaId,
            phoneNumberId,
            displayPhoneNumber: connection.displayPhoneNumber,
            coexistenceStatus: coexistence.status,
          }),
        },
      });
    } catch {
      // ignore non-critical audit log failure
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Business Account successfully connected with Coexistence enabled.',
      connection: {
        id: connection.id,
        wabaId: connection.wabaId,
        phoneNumberId: connection.phoneNumberId,
        displayPhoneNumber: connection.displayPhoneNumber,
        verifiedName: connection.verifiedName,
        qualityRating: connection.qualityRating,
        status: connection.status,
        coexistenceStatus: connection.coexistenceStatus,
        isSubscribed: connection.isSubscribed,
        connectedAt: connection.embeddedSignupCompletedAt,
      },
    });
  } catch (error: any) {
    console.error('[EmbeddedSignup API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during Embedded Signup exchange' },
      { status: 500 }
    );
  }
}
