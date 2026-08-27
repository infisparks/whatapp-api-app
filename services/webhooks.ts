import { prisma } from '@/lib/prisma';

export interface WebhookVerificationQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

/**
 * Validates Meta Webhook verification handshake
 */
export function verifyWebhookChallenge(query: WebhookVerificationQuery): {
  isValid: boolean;
  challenge?: string;
} {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'whatsapp_webhook_verify_token_2026';

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return { isValid: true, challenge };
  }

  return { isValid: false };
}

/**
 * Processes incoming WhatsApp Webhook payload idempotently
 */
export async function processWebhookPayload(payload: any): Promise<{ success: boolean; eventsCount: number }> {
  if (!payload || payload.object !== 'whatsapp_business_account') {
    return { success: false, eventsCount: 0 };
  }

  let eventsCount = 0;
  const entries = payload.entry || [];

  for (const entry of entries) {
    const wabaId = entry.id;
    const changes = entry.changes || [];

    for (const change of changes) {
      const field = change.field;
      const value = change.value;

      if (!value) continue;

      // 1. Template Status Updates
      if (field === 'message_template_status_update') {
        eventsCount++;
        await handleTemplateStatusUpdate(wabaId, value);
      }

      // 2. Phone Quality Updates
      else if (field === 'phone_number_quality_update') {
        eventsCount++;
        await handlePhoneNumberQualityUpdate(value);
      }

      // 3. Message Status Updates (sent, delivered, read, failed)
      else if (value.statuses && Array.isArray(value.statuses)) {
        for (const statusObj of value.statuses) {
          eventsCount++;
          await handleMessageStatusUpdate(statusObj, value.metadata?.phone_number_id);
        }
      }

      // 4. Inbound User Messages
      else if (value.messages && Array.isArray(value.messages)) {
        for (const messageObj of value.messages) {
          eventsCount++;
          await handleInboundMessage(messageObj, value.metadata, value.contacts);
        }
      }

      // 5. SMB App State Sync & Coexistence Message Echoes
      else if (field === 'smb_message_echoes' || field === 'smb_app_state_sync' || field === 'history') {
        eventsCount++;
        await logWebhookEvent(field, wabaId, value.metadata?.phone_number_id, null, value);
      }
    }
  }

  return { success: true, eventsCount };
}

/**
 * Handles incoming status updates: sent, delivered, read, failed
 */
async function handleMessageStatusUpdate(statusObj: any, phoneNumberId?: string) {
  const metaMessageId = statusObj.id;
  const statusStr = (statusObj.status || '').toUpperCase(); // SENT, DELIVERED, READ, FAILED
  const timestamp = statusObj.timestamp ? new Date(parseInt(statusObj.timestamp) * 1000) : new Date();

  // Log raw event
  await logWebhookEvent('message_status', null, phoneNumberId, metaMessageId, statusObj);

  if (!metaMessageId) return;

  const updateData: any = {};
  if (statusStr === 'SENT') {
    updateData.status = 'SENT';
    updateData.sentAt = timestamp;
  } else if (statusStr === 'DELIVERED') {
    updateData.status = 'DELIVERED';
    updateData.deliveredAt = timestamp;
  } else if (statusStr === 'READ') {
    updateData.status = 'READ';
    updateData.readAt = timestamp;
  } else if (statusStr === 'FAILED') {
    updateData.status = 'FAILED';
    updateData.failedAt = timestamp;
    if (statusObj.errors && statusObj.errors.length > 0) {
      updateData.errorCode = String(statusObj.errors[0].code);
      updateData.errorMessage = statusObj.errors[0].title || statusObj.errors[0].message || 'Message delivery failed';
    }
  }

  // Update Message record
  try {
    await prisma.message.updateMany({
      where: { metaMessageId },
      data: updateData,
    });
  } catch (err) {
    console.warn('[Webhook] Error updating message record:', err);
  }

  // Update CampaignRecipient record if associated
  try {
    const recipientUpdate: any = {
      status: updateData.status,
    };
    if (updateData.deliveredAt) recipientUpdate.deliveredAt = updateData.deliveredAt;
    if (updateData.readAt) recipientUpdate.readAt = updateData.readAt;
    if (updateData.failedAt) {
      recipientUpdate.failedAt = updateData.failedAt;
      recipientUpdate.errorMessage = updateData.errorMessage;
    }

    const updatedRecipients = await prisma.campaignRecipient.updateMany({
      where: { metaMessageId },
      data: recipientUpdate,
    });

    // Update campaign summary counts
    if (updatedRecipients.count > 0) {
      const recipient = await prisma.campaignRecipient.findFirst({
        where: { metaMessageId },
        select: { campaignId: true },
      });
      if (recipient?.campaignId) {
        await refreshCampaignStats(recipient.campaignId);
      }
    }
  } catch (err) {
    console.warn('[Webhook] Error updating campaign recipient:', err);
  }
}

/**
 * Handles incoming customer messages (Text, Media, Button Response)
 */
async function handleInboundMessage(messageObj: any, metadata: any, contacts: any[] = []) {
  const phoneNumberId = metadata?.phone_number_id;
  const fromPhone = messageObj.from;
  const metaMessageId = messageObj.id;
  const msgType = (messageObj.type || 'text').toUpperCase();
  const timestamp = messageObj.timestamp ? new Date(parseInt(messageObj.timestamp) * 1000) : new Date();

  // Find associated WhatsApp Connection
  const connection = await prisma.whatsAppConnection.findFirst({
    where: { phoneNumberId },
  });

  if (!connection) {
    console.warn(`[Webhook] WhatsApp Connection not found for phone_number_id: ${phoneNumberId}`);
    return;
  }

  // Extract contact name if provided
  let contactName = contacts.find((c: any) => c.wa_id === fromPhone)?.profile?.name || null;

  // Find or create Contact under the organization
  const contact = await prisma.contact.upsert({
    where: {
      organizationId_phone: {
        organizationId: connection.organizationId,
        phone: fromPhone,
      },
    },
    update: {
      ...(contactName ? { name: contactName } : {}),
      optedIn: true,
      optedInAt: new Date(),
    },
    create: {
      organizationId: connection.organizationId,
      phone: fromPhone,
      name: contactName,
      optedIn: true,
      optedInAt: new Date(),
    },
  });

  // Extract text body
  let bodyText = '';
  if (msgType === 'TEXT') {
    bodyText = messageObj.text?.body || '';
  } else if (msgType === 'BUTTON') {
    bodyText = messageObj.button?.text || messageObj.button?.payload || '';
  } else if (msgType === 'INTERACTIVE') {
    bodyText = messageObj.interactive?.button_reply?.title || messageObj.interactive?.list_reply?.title || '';
  } else if (['IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO'].includes(msgType)) {
    bodyText = messageObj[messageObj.type]?.caption || `[${msgType} Attachment]`;
  }

  // Save Inbound Message
  await prisma.message.upsert({
    where: { metaMessageId },
    update: {
      status: 'DELIVERED',
      deliveredAt: timestamp,
    },
    create: {
      organizationId: connection.organizationId,
      whatsappConnectionId: connection.id,
      contactId: contact.id,
      metaMessageId,
      direction: 'INBOUND',
      type: msgType,
      body: bodyText,
      payloadJson: JSON.stringify(messageObj),
      status: 'DELIVERED',
      deliveredAt: timestamp,
      sentAt: timestamp,
    },
  });
}

/**
 * Handles template status changes from Meta (APPROVED, REJECTED, etc.)
 */
async function handleTemplateStatusUpdate(wabaId: string, value: any) {
  const metaTemplateId = String(value.message_template_id || '');
  const templateName = value.message_template_name;
  const event = (value.event || '').toUpperCase(); // APPROVED, REJECTED, PAUSED, DISABLED
  const reason = value.reason || null;

  let status: 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'PENDING' = 'PENDING';
  if (event === 'APPROVED') status = 'APPROVED';
  else if (event === 'REJECTED') status = 'REJECTED';
  else if (event === 'PAUSED') status = 'PAUSED';
  else if (event === 'DISABLED') status = 'DISABLED';

  await prisma.messageTemplate.updateMany({
    where: {
      OR: [
        { metaTemplateId },
        { name: templateName },
      ],
    },
    data: {
      status,
      rejectionReason: reason,
    },
  });
}

/**
 * Handles phone number quality rating updates from Meta
 */
async function handlePhoneNumberQualityUpdate(value: any) {
  const phoneNumber = value.display_phone_number;
  const currentQuality = value.current_limit || value.event || 'UNKNOWN';

  await prisma.whatsAppConnection.updateMany({
    where: {
      displayPhoneNumber: {
        contains: phoneNumber?.replace(/[^0-9]/g, '') || '',
      },
    },
    data: {
      qualityRating: currentQuality,
    },
  });
}

/**
 * Refreshes total campaign counts
 */
async function refreshCampaignStats(campaignId: string) {
  const counts = await prisma.campaignRecipient.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { _all: true },
  });

  let sent = 0;
  let delivered = 0;
  let read = 0;
  let failed = 0;

  for (const c of counts) {
    if (c.status === 'SENT') sent += c._count._all;
    if (c.status === 'DELIVERED') delivered += c._count._all;
    if (c.status === 'READ') {
      read += c._count._all;
      delivered += c._count._all; // Read implies delivered
    }
    if (c.status === 'FAILED') failed += c._count._all;
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      sentCount: sent + delivered,
      deliveredCount: delivered,
      readCount: read,
      failedCount: failed,
      status: failed + read + delivered >= sent ? 'COMPLETED' : 'RUNNING',
    },
  });
}

/**
 * Saves raw webhook event for audit trail
 */
async function logWebhookEvent(
  eventType: string,
  wabaId: string | null,
  phoneNumberId: string | null | undefined,
  metaMessageId: string | null,
  payload: any
) {
  try {
    await prisma.whatsAppWebhookEvent.create({
      data: {
        eventType,
        wabaId,
        phoneNumberId: phoneNumberId || null,
        metaMessageId,
        payloadJson: JSON.stringify(payload),
        processed: true,
      },
    });
  } catch (err) {
    console.warn('[Webhook] Failed to save raw webhook event:', err);
  }
}
