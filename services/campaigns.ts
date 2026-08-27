import { prisma } from '@/lib/prisma';
import { decryptToken } from './encryption';
import { sendTemplateMessage } from './messaging';

export interface DispatchCampaignOptions {
  batchSize?: number;
  delayBetweenBatchesMs?: number;
}

/**
 * Executes a batch of queued campaign recipients
 */
export async function executeCampaignDispatch(
  campaignId: string,
  options: DispatchCampaignOptions = {}
): Promise<{ processed: number; successCount: number; failedCount: number }> {
  const { batchSize = 25, delayBetweenBatchesMs = 200 } = options;

  // 1. Fetch Campaign with Connection and Template
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      whatsappConnection: true,
      template: true,
    },
  });

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  if (['COMPLETED', 'CANCELLED'].includes(campaign.status)) {
    return { processed: 0, successCount: 0, failedCount: 0 };
  }

  // 2. Mark Campaign as RUNNING
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'RUNNING',
      startedAt: campaign.startedAt || new Date(),
    },
  });

  const accessToken = decryptToken(campaign.whatsappConnection.encryptedAccessToken);
  const phoneNumberId = campaign.whatsappConnection.phoneNumberId;
  const templateName = campaign.template.name;
  const templateLanguage = campaign.template.language || 'en_US';
  const headerType = campaign.template.headerType || 'NONE';

  // 3. Fetch Queued Recipients
  const queuedRecipients = await prisma.campaignRecipient.findMany({
    where: {
      campaignId,
      status: 'QUEUED',
    },
    take: batchSize,
    include: {
      contact: true,
    },
  });

  if (queuedRecipients.length === 0) {
    // Check if all are finished
    const remaining = await prisma.campaignRecipient.count({
      where: { campaignId, status: 'QUEUED' },
    });
    if (remaining === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }
    return { processed: 0, successCount: 0, failedCount: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const recipient of queuedRecipients) {
    try {
      // Parse template variables
      let bodyVars: string[] = [];
      if (recipient.variablesJson) {
        try {
          const parsed = JSON.parse(recipient.variablesJson);
          if (Array.isArray(parsed)) {
            bodyVars = parsed.map(String);
          } else if (typeof parsed === 'object') {
            bodyVars = Object.values(parsed).map(String);
          }
        } catch {
          bodyVars = [];
        }
      }

      // Send Template Message via WhatsApp Cloud API
      const result = await sendTemplateMessage(
        phoneNumberId,
        accessToken,
        recipient.phone,
        templateName,
        templateLanguage,
        { body: bodyVars },
        headerType
      );

      const metaMessageId = result.messages?.[0]?.id;

      // Update Recipient Status to SENT
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'SENT',
          metaMessageId,
          sentAt: new Date(),
        },
      });

      // Record in Message table
      await prisma.message.create({
        data: {
          organizationId: campaign.organizationId,
          whatsappConnectionId: campaign.whatsappConnectionId,
          contactId: recipient.contactId,
          campaignId: campaign.id,
          metaMessageId,
          direction: 'OUTBOUND',
          type: 'TEMPLATE',
          body: `Template: ${templateName}`,
          payloadJson: JSON.stringify({ template: templateName, variables: bodyVars }),
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      successCount++;
    } catch (err: any) {
      failedCount++;
      const errorMessage = err.message || 'Failed to dispatch WhatsApp template message';
      
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'FAILED',
          errorMessage,
          failedAt: new Date(),
        },
      });
    }

    if (delayBetweenBatchesMs > 0) {
      await new Promise((r) => setTimeout(r, delayBetweenBatchesMs));
    }
  }

  // Update summary counts
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      sentCount: { increment: successCount },
      failedCount: { increment: failedCount },
    },
  });

  return {
    processed: queuedRecipients.length,
    successCount,
    failedCount,
  };
}
