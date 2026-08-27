import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookChallenge, processWebhookPayload } from '@/services/webhooks';

/**
 * Meta Webhook Verification Endpoint (GET)
 * Meta calls this when you configure or verify the Webhook URL in App Dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode') || undefined;
    const verifyToken = searchParams.get('hub.verify_token') || undefined;
    const challenge = searchParams.get('hub.challenge') || undefined;

    const verification = verifyWebhookChallenge({
      'hub.mode': mode,
      'hub.verify_token': verifyToken,
      'hub.challenge': challenge,
    });

    if (verification.isValid && verification.challenge) {
      console.log('[Meta Webhook Verified] Successfully verified webhook challenge token');
      return new NextResponse(verification.challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.warn('[Meta Webhook Verification Failed] Token mismatch or invalid mode');
    return new NextResponse('Forbidden: Invalid verification token', { status: 403 });
  } catch (error: any) {
    console.error('[Webhook GET Error]', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * Meta Webhook Event Receiver (POST)
 * Receives real-time events:
 * - messages
 * - message_template_status_update
 * - message_template_quality_update
 * - phone_number_quality_update
 * - smb_message_echoes / history (Coexistence)
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Process asynchronously / safely
    // Meta requires a fast 200 OK response to prevent webhook retry storm
    processWebhookPayload(payload).catch((err) => {
      console.error('[Webhook Processing Error]', err);
    });

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error: any) {
    console.error('[Webhook POST Error]', error);
    // Still return 200 to acknowledge receipt to Meta
    return NextResponse.json({ status: 'error', message: error.message }, { status: 200 });
  }
}
