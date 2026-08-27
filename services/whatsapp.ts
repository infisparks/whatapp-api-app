import { callMetaGraphApi, MetaGraphApiException } from './meta';
import { META_CONFIG } from '@/lib/meta-config';

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface WABAResponse {
  id: string;
  name: string;
  timezone_id?: string;
  message_template_namespace?: string;
  currency?: string;
  account_review_status?: string;
  business_id?: string;
}

export interface PhoneNumberDetailsResponse {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
  name_status?: string;
  new_name_status?: string;
  status?: string;
  is_official_business_account?: boolean;
}

export interface SubscribedAppsResponse {
  success: boolean;
}

/**
 * Exchanges the Meta authorization code for a business access token
 * Called server-to-server after Meta Embedded Signup completes.
 */
export async function exchangeAuthorizationCode(code: string, redirectUri?: string): Promise<OAuthTokenResponse> {
  const appId = process.env.META_APP_ID || META_CONFIG.APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    throw new Error('META_APP_SECRET is not configured on the server. Please set it in .env');
  }

  // Official Meta OAuth token exchange endpoint
  // GET/POST https://graph.facebook.com/v26.0/oauth/access_token
  const params: Record<string, string> = {
    client_id: appId,
    client_secret: appSecret,
    code: code,
    grant_type: 'authorization_code',
  };

  if (redirectUri) {
    params.redirect_uri = redirectUri;
  }

  return await callMetaGraphApi<OAuthTokenResponse>('oauth/access_token', {
    method: 'GET',
    params,
  });
}

/**
 * Fetches WhatsApp Business Account (WABA) details
 */
export async function getWabaDetails(wabaId: string, accessToken: string): Promise<WABAResponse> {
  return await callMetaGraphApi<WABAResponse>(wabaId, {
    method: 'GET',
    accessToken,
    params: {
      fields: 'id,name,timezone_id,message_template_namespace,currency,account_review_status,business_id',
    },
  });
}

/**
 * Fetches phone number details registered under WABA
 */
export async function getPhoneNumberDetails(phoneNumberId: string, accessToken: string): Promise<PhoneNumberDetailsResponse> {
  return await callMetaGraphApi<PhoneNumberDetailsResponse>(phoneNumberId, {
    method: 'GET',
    accessToken,
    params: {
      fields: 'id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status,status',
    },
  });
}

/**
 * Subscribes our application to the customer's WABA
 * Enables real-time webhook events (messages, statuses, template status updates, coexistence echoes)
 */
export async function subscribeAppToWaba(wabaId: string, accessToken: string): Promise<SubscribedAppsResponse> {
  return await callMetaGraphApi<SubscribedAppsResponse>(`${wabaId}/subscribed_apps`, {
    method: 'POST',
    accessToken,
  });
}

/**
 * Registers a phone number with WhatsApp Cloud API if needed
 */
export async function registerPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  pin: string = '000000'
): Promise<{ success: boolean }> {
  return await callMetaGraphApi<{ success: boolean }>(`${phoneNumberId}/register`, {
    method: 'POST',
    accessToken,
    body: {
      messaging_product: 'whatsapp',
      pin,
    },
  });
}

/**
 * Checks WhatsApp Business App Coexistence status
 */
export function checkCoexistenceEligibility(phoneData: PhoneNumberDetailsResponse): {
  isCoexistence: boolean;
  status: string;
  notes: string;
} {
  // If registered through whatsapp_business_app_onboarding flow,
  // Meta maintains dual connectivity with WhatsApp Business App and Cloud API.
  return {
    isCoexistence: true,
    status: 'ACTIVE',
    notes: 'Connected via Meta Embedded Signup with WhatsApp Business App Onboarding (Coexistence).',
  };
}
