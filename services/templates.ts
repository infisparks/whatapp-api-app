import { callMetaGraphApi } from './meta';

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface CreateTemplateInput {
  name: string; // Lowercase alphanumeric with underscores
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string; // e.g. "en_US"
  headerType?: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons?: TemplateButton[];
}

export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    header_handle?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
  }>;
}

export interface MetaCreateTemplatePayload {
  name: string;
  category: string;
  language: string;
  components: MetaTemplateComponent[];
}

/**
 * Extracts variable placeholders like {{1}}, {{2}} from text
 */
export function extractVariables(text?: string): string[] {
  if (!text) return [];
  const regex = /\{\{(\d+)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches).sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * Formats template input into official Meta Graph API payload structure
 */
export function buildMetaTemplatePayload(input: CreateTemplateInput): MetaCreateTemplatePayload {
  const components: MetaTemplateComponent[] = [];

  // 1. Header Component
  if (input.headerType && input.headerType !== 'NONE') {
    if (input.headerType === 'TEXT') {
      const headerVars = extractVariables(input.headerText);
      const headerComp: MetaTemplateComponent = {
        type: 'HEADER',
        format: 'TEXT',
        text: input.headerText || '',
      };
      if (headerVars.length > 0) {
        headerComp.example = {
          header_text: headerVars.map((v) => `Sample ${v}`),
        };
      }
      components.push(headerComp);
    } else {
      // Media Header (IMAGE, VIDEO, DOCUMENT)
      components.push({
        type: 'HEADER',
        format: input.headerType,
        example: {
          header_handle: ['https://placehold.co/600x400.png'],
        },
      });
    }
  }

  // 2. Body Component (Required)
  const bodyVars = extractVariables(input.bodyText);
  const bodyComp: MetaTemplateComponent = {
    type: 'BODY',
    text: input.bodyText,
  };
  if (bodyVars.length > 0) {
    bodyComp.example = {
      body_text: [bodyVars.map((v) => `ExampleVal${v}`)],
    };
  }
  components.push(bodyComp);

  // 3. Footer Component (Optional)
  if (input.footerText && input.footerText.trim().length > 0) {
    components.push({
      type: 'FOOTER',
      text: input.footerText.trim(),
    });
  }

  // 4. Buttons Component (Optional)
  if (input.buttons && input.buttons.length > 0) {
    const formattedButtons = input.buttons.map((b) => {
      if (b.type === 'URL') {
        const hasUrlVar = b.url?.includes('{{1}}');
        return {
          type: 'URL' as const,
          text: b.text,
          url: b.url || 'https://example.com',
          ...(hasUrlVar ? { example: ['https://example.com/order/123'] } : {}),
        };
      }
      if (b.type === 'PHONE_NUMBER') {
        return {
          type: 'PHONE_NUMBER' as const,
          text: b.text,
          phone_number: b.phone_number || '+16505551234',
        };
      }
      return {
        type: 'QUICK_REPLY' as const,
        text: b.text,
      };
    });

    components.push({
      type: 'BUTTONS',
      buttons: formattedButtons,
    });
  }

  return {
    name: input.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    category: input.category,
    language: input.language || 'en_US',
    components,
  };
}

/**
 * Submits a new message template to Meta Graph API
 * POST /{WABA_ID}/message_templates
 */
export async function submitTemplateToMeta(
  wabaId: string,
  accessToken: string,
  templateInput: CreateTemplateInput
): Promise<{ id: string; status: string; category: string }> {
  const payload = buildMetaTemplatePayload(templateInput);

  return await callMetaGraphApi<{ id: string; status: string; category: string }>(
    `${wabaId}/message_templates`,
    {
      method: 'POST',
      accessToken,
      body: payload,
    }
  );
}

/**
 * Fetches existing templates from Meta Graph API
 * GET /{WABA_ID}/message_templates
 */
export async function fetchTemplatesFromMeta(
  wabaId: string,
  accessToken: string,
  limit: number = 100
): Promise<{ data: any[]; paging?: any }> {
  return await callMetaGraphApi<{ data: any[]; paging?: any }>(
    `${wabaId}/message_templates`,
    {
      method: 'GET',
      accessToken,
      params: {
        limit,
        fields: 'id,name,status,category,language,components,quality_score,rejected_reason',
      },
    }
  );
}

/**
 * Deletes a template from Meta
 * DELETE /{WABA_ID}/message_templates?name={name}&hsm_id={metaTemplateId}
 */
export async function deleteTemplateFromMeta(
  wabaId: string,
  accessToken: string,
  templateName: string,
  metaTemplateId?: string
): Promise<{ success: boolean }> {
  const params: Record<string, string> = {
    name: templateName,
  };
  if (metaTemplateId) {
    params.hsm_id = metaTemplateId;
  }

  return await callMetaGraphApi<{ success: boolean }>(`${wabaId}/message_templates`, {
    method: 'DELETE',
    accessToken,
    params,
  });
}
