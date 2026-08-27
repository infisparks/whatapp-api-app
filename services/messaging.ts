import { callMetaGraphApi } from './meta';

export interface TemplateVariableValues {
  header?: string[];
  headerMediaUrl?: string;
  body?: string[]; // Array of strings matching {{1}}, {{2}}, etc.
  buttonPayload?: string;
}

export interface SendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
}

/**
 * Normalizes phone numbers to standard E.164 without spaces, dashes, or leading '+'
 * Meta accepts raw digits with country code (e.g. 919876543210 or +919876543210)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  return digits;
}

/**
 * Formats a phone number for UI display (+XX XXXXX XXXXX)
 */
export function formatDisplayPhone(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return `+${clean}`;
}

/**
 * Checks if the 24-hour customer service window is active for a contact
 */
export function isWithin24HourWindow(lastInboundMessageAt?: Date | string | null): {
  isOpen: boolean;
  remainingMinutes: number;
  expiresAt?: Date;
} {
  if (!lastInboundMessageAt) {
    return { isOpen: false, remainingMinutes: 0 };
  }

  const inboundDate = new Date(lastInboundMessageAt);
  const now = new Date();
  const diffMs = now.getTime() - inboundDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours >= 24) {
    return { isOpen: false, remainingMinutes: 0 };
  }

  const remainingMs = 24 * 60 * 60 * 1000 - diffMs;
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
  const expiresAt = new Date(inboundDate.getTime() + 24 * 60 * 60 * 1000);

  return {
    isOpen: true,
    remainingMinutes,
    expiresAt,
  };
}

/**
 * Sends an approved WhatsApp Template message
 * POST /{PHONE_NUMBER_ID}/messages
 */
export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  templateName: string,
  languageCode: string = 'en_US',
  variables?: TemplateVariableValues,
  headerType?: string
): Promise<SendMessageResponse> {
  const normalizedPhone = normalizePhoneNumber(recipientPhone);

  const components: any[] = [];

  // Header parameters
  if (headerType && headerType !== 'NONE') {
    if (headerType === 'TEXT' && variables?.header && variables.header.length > 0) {
      components.push({
        type: 'header',
        parameters: variables.header.map((val) => ({
          type: 'text',
          text: String(val),
        })),
      });
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && variables?.headerMediaUrl) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: headerType.toLowerCase(),
            [headerType.toLowerCase()]: {
              link: variables.headerMediaUrl,
            },
          },
        ],
      });
    }
  }

  // Body parameters
  if (variables?.body && variables.body.length > 0) {
    components.push({
      type: 'body',
      parameters: variables.body.map((val) => ({
        type: 'text',
        text: String(val || ''),
      })),
    });
  }

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
    },
  };

  if (components.length > 0) {
    payload.template.components = components;
  }

  return await callMetaGraphApi<SendMessageResponse>(`${phoneNumberId}/messages`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

/**
 * Sends a free-form text message (Allowed inside 24h customer service window)
 * POST /{PHONE_NUMBER_ID}/messages
 */
export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  text: string
): Promise<SendMessageResponse> {
  const normalizedPhone = normalizePhoneNumber(recipientPhone);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  };

  return await callMetaGraphApi<SendMessageResponse>(`${phoneNumberId}/messages`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}
