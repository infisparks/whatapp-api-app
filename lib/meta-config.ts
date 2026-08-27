/**
 * Centralized Meta Configuration Constants & Feature Flags
 */

export const META_CONFIG = {
  // Public Configuration (Can be exposed to frontend)
  APP_ID: process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID || "3457567954401110",
  EMBEDDED_SIGNUP_CONFIG_ID: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID || process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || "1084755870646567",
  GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION || "v26.0",
  JS_SDK_VERSION: process.env.NEXT_PUBLIC_META_JS_SDK_VERSION || "v26.0",
  
  // Embedded Signup Coexistence Feature
  // Coexistence mode allows businesses to continue using their WhatsApp Business mobile app
  EMBEDDED_SIGNUP_FEATURE_TYPE: "whatsapp_business_app_onboarding",
  EMBEDDED_SIGNUP_VERSION: "v4",
  SESSION_INFO_VERSION: "3",
  
  // Public Webhook & App URLs
  WEBHOOK_URL: process.env.WHATSAPP_WEBHOOK_URL || "https://aiwh.infiplus.in/api/v1/whatsapp/webhook",
  APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://aiwh.infiplus.in",
  
  // Graph API Base URL
  GRAPH_BASE_URL: "https://graph.facebook.com",
} as const;
